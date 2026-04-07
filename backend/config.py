# Cuaderno - Configuración
# ============================================
"""
Configuración centralizada de la aplicación
"""
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()


def _get_bool_env(name, default=False):
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _get_int_env(name, default, *, minimum=None, maximum=None):
    raw_value = os.getenv(name)
    if raw_value is None or not str(raw_value).strip():
        value = default
    else:
        try:
            value = int(str(raw_value).strip())
        except ValueError as exc:
            raise RuntimeError(f"{name} must be an integer.") from exc

    if minimum is not None and value < minimum:
        raise RuntimeError(f"{name} must be >= {minimum}.")
    if maximum is not None and value > maximum:
        raise RuntimeError(f"{name} must be <= {maximum}.")
    return value


def _get_csv_env(name, default=""):
    raw_value = os.getenv(name, default)
    return [item.strip() for item in str(raw_value or "").split(",") if item.strip()]


def _resolve_runtime_env():
    return str(os.getenv("APP_ENV") or os.getenv("FLASK_ENV") or "development").strip().lower()


def is_production_like_env(env_name):
    return str(env_name or "").strip().lower() in {"production", "staging"}


def _normalize_database_url(database_url):
    if database_url.startswith("postgres://"):
        return f"postgresql://{database_url[len('postgres://') :]}"
    return database_url


def _resolve_database_uri(*, testing=False):
    database_url = _normalize_database_url((os.getenv("DATABASE_URL") or "").strip())
    allow_sqlite_fallback = _get_bool_env("ALLOW_SQLITE_FALLBACK", default=False)

    if testing:
        return database_url or "sqlite:///:memory:"

    if database_url:
        valid_prefixes = ("postgresql://", "postgresql+", "postgres://")
        if database_url.startswith(valid_prefixes):
            return _normalize_database_url(database_url)
        if allow_sqlite_fallback and database_url.startswith("sqlite:"):
            return database_url
        raise RuntimeError(
            "Invalid DATABASE_URL: this backend requires a valid PostgreSQL DATABASE_URL for the main application. "
            "Use a postgresql:// or postgresql+driver:// connection string."
        )

    if allow_sqlite_fallback:
        return os.getenv("SQLITE_DATABASE_URL", "sqlite:///cuaderno.db")

    raise RuntimeError(
        "DATABASE_URL is required: this backend requires PostgreSQL and will not start without a valid DATABASE_URL. "
        "For an explicit local-only SQLite fallback, set ALLOW_SQLITE_FALLBACK=true."
    )


class Config:
    """Configuración base"""

    # Flask
    RUNTIME_ENV = _resolve_runtime_env()
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    DEBUG = _get_bool_env("DEBUG", default=RUNTIME_ENV == "development")
    TESTING = False
    PORT = _get_int_env("PORT", 5000, minimum=1, maximum=65535)

    # Database
    SQLALCHEMY_DATABASE_URI = _resolve_database_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": _get_int_env("SQLALCHEMY_POOL_RECYCLE", 300, minimum=0),
        "pool_size": _get_int_env("SQLALCHEMY_POOL_SIZE", 20, minimum=1),
        "max_overflow": _get_int_env("SQLALCHEMY_MAX_OVERFLOW", 40, minimum=0),
        "pool_timeout": _get_int_env("SQLALCHEMY_POOL_TIMEOUT", 30, minimum=1),
    }
    ALLOW_RUNTIME_SCHEMA_MUTATIONS = _get_bool_env("ALLOW_RUNTIME_SCHEMA_MUTATIONS", default=False)
    ALLOW_STARTUP_DATA_BOOTSTRAP = _get_bool_env("ALLOW_STARTUP_DATA_BOOTSTRAP", default=False)
    ALLOW_SQLITE_FALLBACK = _get_bool_env("ALLOW_SQLITE_FALLBACK", default=False)

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "604800"))  # 7 días
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "31536000"))  # 1 año
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # CORS
    CORS_ORIGINS = _get_csv_env(
        "CORS_ORIGINS",
        "http://localhost:5000,http://127.0.0.1:5000,http://localhost:5173"
    )

    # Frontend URL
    CLIENT_URL = str(os.getenv("CLIENT_URL", "http://localhost:5173") or "").strip()
    DEFAULT_CURRENCY = os.getenv("DEFAULT_CURRENCY", "COP")
    DEFAULT_TIMEZONE = os.getenv("DEFAULT_TIMEZONE", "America/Bogota")
    DEFAULT_LOCALE = os.getenv("DEFAULT_LOCALE", "es_CO")

    # Plan Limits
    FREE_MAX_BUSINESSES = int(os.getenv("FREE_MAX_BUSINESSES", "1"))
    FREE_MAX_PRODUCTS = int(os.getenv("FREE_MAX_PRODUCTS", "20"))
    FREE_MAX_CUSTOMERS = int(os.getenv("FREE_MAX_CUSTOMERS", "10"))
    FREE_MAX_RECORDS_PER_MONTH = int(os.getenv("FREE_MAX_RECORDS_PER_MONTH", "100"))

    # Pricing (COP)
    BASIC_MONTHLY_PRICE_USD = float(os.getenv("BASIC_MONTHLY_PRICE_USD", "2.99"))
    BASIC_QUARTERLY_DISCOUNT = float(os.getenv("BASIC_QUARTERLY_DISCOUNT", "0.10"))
    BASIC_ANNUAL_DISCOUNT = float(os.getenv("BASIC_ANNUAL_DISCOUNT", "0.15"))
    PRO_MONTHLY_PRICE_COP = int(os.getenv("PRO_MONTHLY_PRICE_COP", "19900"))
    PRO_MONTHLY_PRICE_USD = float(os.getenv("PRO_MONTHLY_PRICE_USD", "5.99"))
    PRO_ANNUAL_DISCOUNT = float(os.getenv("PRO_ANNUAL_DISCOUNT", "0.30"))
    PRO_QUARTERLY_DISCOUNT = float(os.getenv("PRO_QUARTERLY_DISCOUNT", "0.10"))
    BUSINESS_MONTHLY_PRICE_USD = float(os.getenv("BUSINESS_MONTHLY_PRICE_USD", "12.99"))
    BUSINESS_QUARTERLY_DISCOUNT = float(os.getenv("BUSINESS_QUARTERLY_DISCOUNT", "0.10"))
    BUSINESS_ANNUAL_DISCOUNT = float(os.getenv("BUSINESS_ANNUAL_DISCOUNT", "0.15"))

    # Mercado Pago
    MERCADOPAGO_ACCESS_TOKEN = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "")
    MERCADOPAGO_PUBLIC_KEY = os.getenv("MERCADOPAGO_PUBLIC_KEY", "")
    MP_NEQUI_ENABLED = os.getenv("MP_NEQUI_ENABLED", "True").lower() == "true"
    MP_CARD_ENABLED = os.getenv("MP_CARD_ENABLED", "True").lower() == "true"
    MP_SUCCESS_URL = os.getenv("MP_SUCCESS_URL", "")
    MP_FAILURE_URL = os.getenv("MP_FAILURE_URL", "")
    MP_PENDING_URL = os.getenv("MP_PENDING_URL", "")

    # Export
    EXPORT_MAX_ROWS = int(os.getenv("EXPORT_MAX_ROWS", "10000"))
    EXPORT_DIR = os.getenv("EXPORT_DIR", "exports")

    # Backup
    BACKUP_DIR = os.getenv("BACKUP_DIR", "backups")
    MAX_BACKUPS = int(os.getenv("MAX_BACKUPS", "10"))

    # Local response cache
    LOCAL_RESPONSE_CACHE_ENABLED = _get_bool_env("LOCAL_RESPONSE_CACHE_ENABLED", default=False)
    LOCAL_RESPONSE_CACHE_TTL_SUMMARY_SECONDS = _get_int_env("LOCAL_RESPONSE_CACHE_TTL_SUMMARY_SECONDS", 5, minimum=0)
    LOCAL_RESPONSE_CACHE_TTL_DASHBOARD_SECONDS = _get_int_env("LOCAL_RESPONSE_CACHE_TTL_DASHBOARD_SECONDS", 5, minimum=0)
    SUMMARY_CACHE_DIRTY_DEBOUNCE_SECONDS = _get_int_env("SUMMARY_CACHE_DIRTY_DEBOUNCE_SECONDS", 2, minimum=0)

    # Shared response cache / Redis
    REDIS_URL = str(os.getenv("REDIS_URL", "redis://localhost:6379/0") or "").strip()
    SHARED_RESPONSE_CACHE_ENABLED = _get_bool_env("SHARED_RESPONSE_CACHE_ENABLED", default=True)
    SHARED_RESPONSE_CACHE_PREFIX = str(os.getenv("SHARED_RESPONSE_CACHE_PREFIX", "cuaderno") or "cuaderno").strip()
    SHARED_RESPONSE_CACHE_FRESH_TTL_SUMMARY_SECONDS = _get_int_env("SHARED_RESPONSE_CACHE_FRESH_TTL_SUMMARY_SECONDS", 15, minimum=1)
    SHARED_RESPONSE_CACHE_STALE_TTL_SUMMARY_SECONDS = _get_int_env("SHARED_RESPONSE_CACHE_STALE_TTL_SUMMARY_SECONDS", 120, minimum=1)
    SHARED_RESPONSE_CACHE_FRESH_TTL_DASHBOARD_SECONDS = _get_int_env("SHARED_RESPONSE_CACHE_FRESH_TTL_DASHBOARD_SECONDS", 15, minimum=1)
    SHARED_RESPONSE_CACHE_STALE_TTL_DASHBOARD_SECONDS = _get_int_env("SHARED_RESPONSE_CACHE_STALE_TTL_DASHBOARD_SECONDS", 120, minimum=1)
    SHARED_RESPONSE_CACHE_LOCK_TTL_SECONDS = _get_int_env("SHARED_RESPONSE_CACHE_LOCK_TTL_SECONDS", 60, minimum=1)
    SHARED_RESPONSE_CACHE_WAIT_FOR_SNAPSHOT_SECONDS = _get_int_env("SHARED_RESPONSE_CACHE_WAIT_FOR_SNAPSHOT_SECONDS", 5, minimum=1)
    SUMMARY_REFRESH_QUEUE_DEDUPE_TTL_SECONDS = _get_int_env("SUMMARY_REFRESH_QUEUE_DEDUPE_TTL_SECONDS", 15, minimum=1)
    SUMMARY_REFRESH_WORKER_POLL_SECONDS = _get_int_env("SUMMARY_REFRESH_WORKER_POLL_SECONDS", 5, minimum=1)

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "cuaderno.log")
    EXPOSE_ERROR_DETAILS = _get_bool_env("EXPOSE_ERROR_DETAILS", default=not is_production_like_env(RUNTIME_ENV))

    # Runtime / Gunicorn
    GUNICORN_WORKERS = _get_int_env("GUNICORN_WORKERS", 2, minimum=1)
    GUNICORN_THREADS = _get_int_env("GUNICORN_THREADS", 2, minimum=1)
    GUNICORN_TIMEOUT = _get_int_env("GUNICORN_TIMEOUT", 120, minimum=1)
    GUNICORN_GRACEFUL_TIMEOUT = _get_int_env("GUNICORN_GRACEFUL_TIMEOUT", 30, minimum=1)
    GUNICORN_KEEPALIVE = _get_int_env("GUNICORN_KEEPALIVE", 5, minimum=1)
    GUNICORN_MAX_REQUESTS = _get_int_env("GUNICORN_MAX_REQUESTS", 1000, minimum=0)
    GUNICORN_MAX_REQUESTS_JITTER = _get_int_env("GUNICORN_MAX_REQUESTS_JITTER", 100, minimum=0)


class DevelopmentConfig(Config):
    """Configuración de desarrollo"""
    DEBUG = True
    SQLALCHEMY_ECHO = True


class ProductionConfig(Config):
    """Configuración de producción"""
    RUNTIME_ENV = "production"
    DEBUG = False
    SQLALCHEMY_ECHO = False


class StagingConfig(ProductionConfig):
    """Configuración de staging"""
    RUNTIME_ENV = "staging"


class TestingConfig(Config):
    """Configuración de testing"""
    RUNTIME_ENV = "testing"
    TESTING = True
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = _resolve_database_uri(testing=True)
    WTF_CSRF_ENABLED = False
    SQLALCHEMY_ENGINE_OPTIONS = {}  # Reset pool options for in-memory SQLite


# Configuración por ambiente
config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "staging": StagingConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config():
    """Obtener configuración según el ambiente"""
    env = _resolve_runtime_env()
    return config_by_name.get(env, DevelopmentConfig)
