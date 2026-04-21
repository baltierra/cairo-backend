#!/usr/bin/env bash
set -e

# Optional: show where we are running
echo "Starting Cairo app with DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE}"
echo "Using DB at: ${SQLITE_PATH}"
echo "Static root: ${STATIC_ROOT}"
echo "Media root:  ${MEDIA_ROOT}"

# Run migrations
python manage.py migrate --noinput

# Collect static assets (including frontend) into STATIC_ROOT
python manage.py collectstatic --noinput

# Start Gunicorn
exec gunicorn config.wsgi:application \
  --bind 0.0.0.0:${PORT:-8000} \
  --workers 3 \
  --timeout 60 \
  --access-logfile - \
  --error-logfile -
  