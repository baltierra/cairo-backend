import re
from django.core.exceptions import ValidationError


def validate_partial_date(value):
    """
    Allow YYYY, YYYY-MM, YYYY-MM-DD, optionally prefixed with 'c.' or 'ca.'.
    """
    if not value:
        return

    v = value.strip().lower()

    # Strip possible approximate prefixes
    for prefix in ("c. ", "ca. ", "c ", "ca "):
        if v.startswith(prefix):
            v = v[len(prefix):]

    # Allowed forms:
    #   YYYY
    #   YYYY-MM
    #   YYYY-MM-DD
    if not re.match(r"^\d{4}(-\d{2}){0,2}$", v):
        raise ValidationError(
            "Use a valid format: YYYY, YYYY-MM, or YYYY-MM-DD "
            "(prefix 'c.' or 'ca.' allowed)."
        )

    parts = v.split("-")
    year = int(parts[0])

    # Validate month
    if len(parts) >= 2:
        month = int(parts[1])
        if not 1 <= month <= 12:
            raise ValidationError("Month must be between 01 and 12.")

    # Validate day
    if len(parts) == 3:
        month = int(parts[1])
        day = int(parts[2])
        days = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
        if day < 1 or day > days[month - 1]:
            raise ValidationError("Invalid day for that month.")
