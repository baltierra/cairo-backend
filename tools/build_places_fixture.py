#!/usr/bin/env python
import json
import re
from pathlib import Path
from datetime import datetime, timezone

# Folder containing your .jsonc files
INPUT_DIR = Path("data/places_jsonc")

# Output Django fixture
OUTPUT_FILE = Path("core/fixtures/places_from_jsonc.json")


def strip_comments(text: str) -> str:
    """
    Remove // comments from a JSONC-like file.
    (Simple line-based stripping; enough for our use case.)
    """
    return re.sub(r"//.*", "", text)


def load_one(path: Path) -> dict:
    """
    Load a single JSONC file and normalize it to a Django fixture object:
      {
        "model": "core.historicplace",
        "fields": { ... }
      }
    We intentionally omit 'pk' so Django auto-assigns IDs.
    """
    raw = path.read_text(encoding="utf-8")
    clean = strip_comments(raw)
    data = json.loads(clean)

    # Allow either [obj] or obj
    if isinstance(data, list):
        if len(data) != 1:
            raise ValueError(
                f"{path} contains a list with {len(data)} items; expected 1."
            )
        data = data[0]

    # If already fixture-style: {"model": "...", "fields": {...}}
    if "model" in data and "fields" in data:
        fields = data["fields"]
    else:
        # Plain fields style
        fields = data

    # Drop any id/pk so Django autoincrements
    fields.pop("id", None)
    fields.pop("pk", None)

    # Ensure date_added/date_modified exist (Django's auto_now* won't run for fixtures)
    now = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    fields.setdefault("date_added", now)
    fields.setdefault("date_modified", now)

    return {
        "model": "core.historicplace",
        "fields": fields,
    }


def main() -> None:
    if not INPUT_DIR.exists():
        raise SystemExit(f"Input dir {INPUT_DIR} does not exist")

    items = []
    for path in sorted(INPUT_DIR.glob("*.jsonc")):
        print(f"Processing {path}")
        items.append(load_one(path))

    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_FILE.write_text(json.dumps(items, indent=2), encoding="utf-8")
    print(f"Wrote {len(items)} historic places to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
