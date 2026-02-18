# Cuaderno - Configuración
# ============================================
"""
Configuración centralizada de la aplicación
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()


class Config:
    """Configuración base"""

    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-me")
    DEBUG = os.getenv("DEBUG", "False").lower() == "true"
    TESTING = False

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL", 
        "sqlite:///cuaderno.db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-key-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", "900"))
    JWT_REFRESH_TOKEN_EXPIRES = int(os.getenv("JWT_REFRESH_TOKEN_EXPIRES", "604800"))
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME = "Authorization"
    JWT_HEADER_TYPE = "Bearer"

    # CORS
    CORS_ORIGINS = os.getenv(
        "CORS_ORIGINS", 
        "http://localhost:5000,http://127.0.0.1:5000"
    ).split(",")

    # Business Defaults
    DEFAULT_CURRENCY = os.getenv("DEFAULT_CURRENCY", "COP")
    DEFAULT_TIMEZONE = os.getenv("DEFAULT_TIMEZONE", "America/Bogota")
    DEFAULT_LOCALE = os.getenv("DEFAULT_LOCALE", "es_CO")

    # Plan Limits
    FREE_MAX_BUSINESSES = int(os.getenv("FREE_MAX_BUSINESSES", "1"))
    FREE_MAX_PRODUCTS = int(os.getenv("FREE_MAX_PRODUCTS", "20"))
    FREE_MAX_CUSTOMERS = int(os.getenv("FREE_MAX_CUSTOMERS", "10"))
    FREE_MAX_RECORDS_PER_MONTH = int(os.getenv("FREE_MAX_RECORDS_PER_MONTH", "100"))

    # Pricing (COP)
    PRO_MONTHLY_PRICE_COP = int(os.getenv("PRO_MONTHLY_PRICE_COP", "19900"))
    PRO_ANNUAL_DISCOUNT = float(os.getenv("PRO_ANNUAL_DISCOUNT", "0.15"))

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

    # Logging
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    LOG_FILE = os.getenv("LOG_FILE", "cuaderno.log")


class DevelopmentConfig(Config):
    """Configuración de desarrollo"""
    DEBUG = True
    SQLALCHEMY_ECHO = True


class ProductionConfig(Config):
    """Configuración de producción"""
    DEBUG = False
    SQLALCHEMY_ECHO = False


class TestingConfig(Config):
    """Configuración de testing"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    WTF_CSRF_ENABLED = False


# Configuración por ambiente
config_by_name = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
    "default": DevelopmentConfig,
}


def get_config():
    """Obtener configuración según el ambiente"""
    env = os.getenv("FLASK_ENV", "development")
    return config_by_name.get(env, DevelopmentConfig)
