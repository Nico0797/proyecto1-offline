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
                if "total_cost" not in sales_columns:
                    # Usar 0 como default, luego se puede recalcular
                    db.session.execute(text("ALTER TABLE sales ADD COLUMN total_cost FLOAT DEFAULT 0"))
                    db.session.commit()

            # Verificar columnas en 'products'
            if inspector.has_table("products"):
                product_columns = {col["name"] for col in inspector.get_columns("products")}
                pending_prod = []
                if "stock" not in product_columns:
                    pending_prod.append("ALTER TABLE products ADD COLUMN stock FLOAT DEFAULT 0")
                if "low_stock_threshold" not in product_columns:
                    pending_prod.append("ALTER TABLE products ADD COLUMN low_stock_threshold FLOAT DEFAULT 5")
                if "type" not in product_columns:
                    pending_prod.append("ALTER TABLE products ADD COLUMN type VARCHAR(20) DEFAULT 'product'")
                
                if pending_prod:
                    for statement in pending_prod:
                        try:
                            with db.session.begin_nested():
                                db.session.execute(text(statement))
                        except Exception as e:
                            app.logger.info(f"Skipping product migration: {statement}. Reason: {str(e)}")
                    db.session.commit()

            # Create recurring_expenses if not exists
            # IMPORTANT: This must run for both SQLite and Postgres
            # Check table existence explicitly
            if not inspector.has_table("recurring_expenses"):
                try:
                    # In Postgres, create_all only creates tables that don't exist
                    # But we need to be sure the model is imported in main.py or wherever init_db is called
                    # To be safe, we can use raw SQL fallback for Postgres if create_all misses it
                    # However, create_all is the standard way.
                    db.create_all()
                    app.logger.info("Created missing tables including recurring_expenses")
                except Exception as e:
                    app.logger.error(f"Error creating tables: {e}")

            # Verify recurring_expenses columns just in case it was created with old schema
            if inspector.has_table("recurring_expenses"):
                re_columns = [col['name'] for col in inspector.get_columns("recurring_expenses")]
                # Ensure all columns exist
                if "is_active" not in re_columns:
                     try:
                        with db.session.begin_nested():
                             db.session.execute(text("ALTER TABLE recurring_expenses ADD COLUMN is_active BOOLEAN DEFAULT TRUE"))
                        db.session.commit()
                     except: pass
                
                if "frequency" not in re_columns:
                    try:
                        with db.session.begin_nested():
                            db.session.execute(text("ALTER TABLE recurring_expenses ADD COLUMN frequency VARCHAR(20) DEFAULT 'monthly'"))
                        db.session.commit()
                    except: pass
                
                if "next_due_date" not in re_columns:
                    try:
                        with db.session.begin_nested():
                            db.session.execute(text("ALTER TABLE recurring_expenses ADD COLUMN next_due_date DATE"))
                        db.session.commit()
                    except: pass

            # Add monthly_sales_goal to businesses if not exists
            if inspector.has_table("businesses"):
                business_columns = [col['name'] for col in inspector.get_columns("businesses")]
                if "monthly_sales_goal" not in business_columns:
                    try:
                        with db.session.begin_nested():
                            db.session.execute(text("ALTER TABLE businesses ADD COLUMN monthly_sales_goal FLOAT DEFAULT 0"))
                        db.session.commit()
                    except Exception as e:
                        app.logger.info(f"Skipping monthly_sales_goal migration: {str(e)}")

            # Crear tabla quick_notes si no existe
            if not inspector.has_table("quick_notes"):
                # Crear todas las tablas faltantes (incluyendo quick_notes)
                db.create_all()

            # Add whatsapp_templates to businesses if not exists
            if inspector.has_table("businesses"):
                business_columns = [col['name'] for col in inspector.get_columns("businesses")]
                if "whatsapp_templates" not in business_columns:
                    try:
                        with db.session.begin_nested():
                            db.session.execute(text("ALTER TABLE businesses ADD COLUMN whatsapp_templates JSON DEFAULT '{}'"))
                        db.session.commit()
                    except Exception as e:
                        app.logger.info(f"Skipping whatsapp_templates migration: {str(e)}")
                
        except Exception as exc:
            app.logger.warning("Error asegurando esquema de base de datos: %s", exc)


def get_db():
    """Obtener instancia de db"""
    return db
