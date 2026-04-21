# Cairo backend+frontend: single-container image
FROM python:3.12-slim

# Basic Python env
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    POETRY_VERSION=2.1.1

# Work inside /app
WORKDIR /app

# System deps (for Pillow, building wheels, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 - \
    && ln -s /root/.local/bin/poetry /usr/local/bin/poetry

# Copy dependency files first for better cache use
COPY pyproject.toml poetry.lock* /app/

# Install Python deps into the system (no virtualenv inside the image)
RUN poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# Now copy the rest of the project
COPY . /app

# Environment defaults for Django
# (settings.py already uses django-environ; these are fallbacks/structural)
ENV DJANGO_SETTINGS_MODULE=config.settings \
    PYTHONPATH=/app \
    PORT=8000 \
    # Where SQLite DB will live inside the container (we'll mount /data as a volume)
    SQLITE_PATH=/data/db.sqlite3 \
    # Where collectstatic will put files (we'll mount these as needed if we want)
    STATIC_ROOT=/app/staticfiles \
    MEDIA_ROOT=/app/media

# Create runtime dirs (DB + media + static)
RUN mkdir -p /data /app/media /app/staticfiles

# Expose Django/Gunicorn port
EXPOSE 8000

# Copy entrypoint script
COPY docker-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Start via entrypoint
ENTRYPOINT ["/entrypoint.sh"]
