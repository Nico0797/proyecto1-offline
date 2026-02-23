# Cuaderno - Database Connection
# ============================================
"""
Configuración de base de datos con SQLAlchemy
"""
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy import text, inspect

# Instancia global de SQLAlchemy
db = SQLAlchemy()

# Migraciones
migrate = Migrate()


def init_db(app):
    """Inicializar base de datos con la app"""
    db.init_app(app)
    migrate.init_app(app, db)
    
    # Asegurar esquema y columnas faltantes (tanto en SQLite como Postgres/Railway)
    with app.app_context():
        try:
            engine = db.get_engine()
            inspector = inspect(engine)
            
            # Crear tablas si no existen (útil para SQLite o primera vez)
            if engine.dialect.name == "sqlite":
                db.create_all()
            
            # Verificar columnas en 'users'
            if inspector.has_table("users"):
                existing_columns = {col["name"] for col in inspector.get_columns("users")}
                pending = []
                
                # Definir tipos según dialecto
                is_postgres = engine.dialect.name == "postgresql"
                type_bool = "BOOLEAN"
                type_datetime = "TIMESTAMP" if is_postgres else "DATETIME"
                default_false = "FALSE" if is_postgres else "0"
                default_true = "TRUE" if is_postgres else "1"

                # Auth & Verification
                if "email_verified" not in existing_columns:
                    pending.append(f"ALTER TABLE users ADD COLUMN email_verified {type_bool} DEFAULT {default_false}")
                if "email_verification_code" not in existing_columns:
                    pending.append("ALTER TABLE users ADD COLUMN email_verification_code VARCHAR(20)")
                if "email_verification_expires" not in existing_columns:
                    pending.append(f"ALTER TABLE users ADD COLUMN email_verification_expires {type_datetime}")
                if "reset_password_code" not in existing_columns:
                    pending.append("ALTER TABLE users ADD COLUMN reset_password_code VARCHAR(20)")
                if "reset_password_expires" not in existing_columns:
                    pending.append(f"ALTER TABLE users ADD COLUMN reset_password_expires {type_datetime}")
                
                # Membership columns
                if "membership_plan" not in existing_columns:
                    pending.append("ALTER TABLE users ADD COLUMN membership_plan VARCHAR(20)")
                if "membership_start" not in existing_columns:
                    pending.append(f"ALTER TABLE users ADD COLUMN membership_start {type_datetime}")
                if "membership_end" not in existing_columns:
                    pending.append(f"ALTER TABLE users ADD COLUMN membership_end {type_datetime}")
                if "membership_auto_renew" not in existing_columns:
                    pending.append(f"ALTER TABLE users ADD COLUMN membership_auto_renew {type_bool} DEFAULT {default_true}")

                # Execute users updates
                # Use individual try/except blocks to avoid failing if one column exists but not others
                # or race conditions in distributed environments
                if pending:
                    for statement in pending:
                        try:
                            # Use nested transaction to isolate failures
                            with db.session.begin_nested():
                                db.session.execute(text(statement))
                        except Exception as e:
                            # Ignore "duplicate column" errors gracefully
                            app.logger.info(f"Skipping migration step: {statement}. Reason: {str(e)}")
                    
                    db.session.commit()

            # Verificar columnas en 'sales'
            if inspector.has_table("sales"):
                sales_columns = {col["name"] for col in inspector.get_columns("sales")}
                if "balance" not in sales_columns:
                    db.session.execute(text("ALTER TABLE sales ADD COLUMN balance FLOAT DEFAULT 0"))
                    db.session.commit()

            # Verificar columnas en 'products'
            if inspector.has_table("products"):
                product_columns = {col["name"] for col in inspector.get_columns("products")}
                pending_prod = []
                if "stock" not in product_columns:
                    pending_prod.append("ALTER TABLE products ADD COLUMN stock FLOAT DEFAULT 0")
                if "low_stock_threshold" not in product_columns:
                    pending_prod.append("ALTER TABLE products ADD COLUMN low_stock_threshold FLOAT DEFAULT 5")
                
                for statement in pending_prod:
                    db.session.execute(text(statement))
                if pending_prod:
                    db.session.commit()
                    
        except Exception as exc:
            app.logger.warning("Error asegurando esquema de base de datos: %s", exc)


def get_db():
    """Obtener instancia de db"""
    return db
