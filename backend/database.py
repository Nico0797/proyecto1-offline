# Cuaderno - Database Connection
# ============================================
"""
Configuración de base de datos con SQLAlchemy
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

# Instancia global de SQLAlchemy
db = SQLAlchemy()

# Migraciones
migrate = Migrate()


def init_db(app):
    """Inicializar base de datos con la app"""
    db.init_app(app)
    migrate.init_app(app, db)

    if app.config.get("ALLOW_RUNTIME_SCHEMA_MUTATIONS", False):
        app.logger.warning(
            "ALLOW_RUNTIME_SCHEMA_MUTATIONS is enabled, but runtime schema mutations are disabled in this build. "
            "Manage schema changes through Flask-Migrate or explicit scripts."
        )
    else:
        app.logger.info("Runtime schema mutations disabled; expecting schema managed externally.")


def get_db():
    """Obtener instancia de db"""
    return db
