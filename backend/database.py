# Cuaderno - Database Connection
# ============================================
"""
Configuración de base de datos con SQLAlchemy
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy import text

# Instancia global de SQLAlchemy
db = SQLAlchemy()

# Migraciones
migrate = Migrate()


def init_db(app):
    """Inicializar base de datos con la app"""
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Crear tablas si no existen
    with app.app_context():
        db.create_all()
        try:
            engine = db.get_engine()
            if engine.dialect.name == "sqlite":
                result = db.session.execute(text("PRAGMA table_info(users)"))
                existing_columns = {row[1] for row in result.fetchall()}
                pending = []
                if "email_verified" not in existing_columns:
                    pending.append("ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT 0")
                if "email_verification_code" not in existing_columns:
                    pending.append("ALTER TABLE users ADD COLUMN email_verification_code VARCHAR(20)")
                if "email_verification_expires" not in existing_columns:
                    pending.append("ALTER TABLE users ADD COLUMN email_verification_expires DATETIME")
                if "reset_password_code" not in existing_columns:
                    pending.append("ALTER TABLE users ADD COLUMN reset_password_code VARCHAR(20)")
                if "reset_password_expires" not in existing_columns:
                    pending.append("ALTER TABLE users ADD COLUMN reset_password_expires DATETIME")
                # Sales balance for credit tracking
                result = db.session.execute(text("PRAGMA table_info(sales)"))
                sales_columns = {row[1] for row in result.fetchall()}
                if "balance" not in sales_columns:
                    pending.append("ALTER TABLE sales ADD COLUMN balance FLOAT DEFAULT 0")
                # Inventory tracking
                result = db.session.execute(text("PRAGMA table_info(products)"))
                product_columns = {row[1] for row in result.fetchall()}
                if "stock" not in product_columns:
                    pending.append("ALTER TABLE products ADD COLUMN stock FLOAT DEFAULT 0")
                if "low_stock_threshold" not in product_columns:
                    pending.append("ALTER TABLE products ADD COLUMN low_stock_threshold FLOAT DEFAULT 5")
                for statement in pending:
                    db.session.execute(text(statement))
                if pending:
                    db.session.commit()
        except Exception as exc:
            app.logger.warning("No se pudo asegurar columnas de verificación: %s", exc)


def get_db():
    """Obtener instancia de db"""
    return db
