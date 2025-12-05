from pathlib import Path
import environ
import os
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

# --- env
env = environ.Env(
    DEBUG=(bool, False),
    SECRET_KEY=(str, "insecure-dev-key"),
    ALLOWED_HOSTS=(str, "127.0.0.1,localhost"),
    DB_PATH=(str, "db.sqlite3"),
    CORS_ALLOWED_ORIGINS=(str, ""),
)
env_file = BASE_DIR / ".env.local"
if env_file.exists():
    environ.Env.read_env(env_file)

SECRET_KEY = env("SECRET_KEY")
DEBUG = env("DEBUG")
ALLOWED_HOSTS = [
    x.strip() for x in env("ALLOWED_HOSTS").split(",") if x.strip()
]

INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # 3rd-party
    "rest_framework",
    "drf_spectacular",
    "corsheaders",
    # Local
    "core",
    "api",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {
        "context_processors": [
            "django.template.context_processors.debug",
            "django.template.context_processors.request",
            "django.contrib.auth.context_processors.auth",
            "django.contrib.messages.context_processors.messages",
        ],
    },
}]

WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# --- Database
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        # If DB_PATH is absolute (e.g. /data/db.sqlite3 in Docker), Path
        # handling will honor that; if it's relative, it's BASE_DIR / DB_PATH.
        "NAME": str((BASE_DIR / env("DB_PATH")).resolve()),
        "OPTIONS": {"timeout": 30},
    }
}

# --- Static files
STATIC_URL = "/static/"
STATIC_ROOT = env("STATIC_ROOT", default=str(BASE_DIR / "staticfiles"))

# Frontend assets live in frontend/, collected into STATIC_ROOT
STATICFILES_DIRS = [
    BASE_DIR / "frontend",
]

# WhiteNoise settings
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/Chicago"
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# --- Media files
MEDIA_URL = "/media/"
MEDIA_ROOT = env("MEDIA_ROOT", default=str(BASE_DIR / "media"))

# --- DRF / JWT / OpenAPI
REST_FRAMEWORK = {
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticatedOrReadOnly",
    ],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "api.pagination.DefaultPagination",
}

SPECTACULAR_SETTINGS = {
    "TITLE": "Cairo Backend API",
    "DESCRIPTION": "API documentation for Cairo Backend.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": timedelta(minutes=30),
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),
}

# --- CORS
# --- CSRF trusted origins (for HTTPS behind a proxy)
_raw_csrf = os.environ.get("CSRF_TRUSTED_ORIGINS", "")

if _raw_csrf:
    CSRF_TRUSTED_ORIGINS = [
        o.strip() for o in _raw_csrf.split(",") if o.strip()
    ]
else:
    CSRF_TRUSTED_ORIGINS = []

# --- Email / feedback settings
EMAIL_BACKEND = env(
    "EMAIL_BACKEND",
    default="django.core.mail.backends.console.EmailBackend",
)

DEFAULT_FROM_EMAIL = env(
    "DEFAULT_FROM_EMAIL",
    default="no-reply@historicalcairo.com",
)

FEEDBACK_RECIPIENT = env(
    "FEEDBACK_RECIPIENT",
    default="support@historicalcairo.com",
)
