import os
import sys
import logging
from sqlalchemy import text, inspect

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app, db

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate():
    with app.app_context():
        engine = db.engine
        inspector = inspect(engine)
        
        # Check if columns exist
        columns = [c['name'] for c in inspector.get_columns('users')]
        
        with engine.connect() as conn:
            # 1. Add columns
            if 'account_type' not in columns:
                logger.info("Adding account_type column...")
                if engine.dialect.name == 'sqlite':
                    conn.execute(text("ALTER TABLE users ADD COLUMN account_type VARCHAR(20) DEFAULT 'personal'"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) DEFAULT 'personal'"))
            
            if 'linked_business_id' not in columns:
                logger.info("Adding linked_business_id column...")
                if engine.dialect.name == 'sqlite':
                    conn.execute(text("ALTER TABLE users ADD COLUMN linked_business_id INTEGER REFERENCES businesses(id)"))
                else:
                    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS linked_business_id INTEGER REFERENCES businesses(id)"))
            
            conn.commit()

            # 2. Handle Constraints (Tricky part)
            if engine.dialect.name == 'postgresql':
                logger.info("Handling Postgres constraints...")
                try:
                    # Drop old unique constraint on email
                    conn.execute(text("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key"))
                    conn.execute(text("DROP INDEX IF EXISTS ix_users_email"))
                    
                    # Create partial indexes
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_personal ON users (email) WHERE account_type = 'personal'"))
                    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email_team ON users (email, linked_business_id) WHERE account_type = 'team_member'"))
                    conn.commit()
                    logger.info("Postgres migration completed.")
                except Exception as e:
                    logger.error(f"Error migrating Postgres: {e}")
                    conn.rollback()

            elif engine.dialect.name == 'sqlite':
                logger.info("Handling SQLite constraints (Requires Table Recreation)...")
                # SQLite doesn't support dropping unique constraints easily.
                # We need to recreate the table.
                # This is risky if data exists, so we'll do it carefully.
                
                try:
                    # Check if we already migrated (by checking index)
                    indexes = inspector.get_indexes('users')
                    migrated = any(i['name'] == 'ix_users_email_personal' for i in indexes)
                    
                    if not migrated:
                        logger.info("Recreating users table to remove unique constraint on email...")
                        
                        # 1. Rename old table
                        conn.execute(text("ALTER TABLE users RENAME TO users_old"))
                        
                        # 2. Create new table (schema must match models.py)
                        # We use the raw SQL to ensure exactness, but better to use SQLAlchemy metadata if possible.
                        # Since we can't easily get the CREATE TABLE sql from metadata bound to engine without creating it,
                        # we will define it manually or use a trick.
                        
                        # Let's try to just create the new table definition
                        db.metadata.create_all(bind=conn) 
                        # This works if 'users' doesn't exist (which it doesn't, we renamed it)
                        
                        # 3. Copy data
                        # We need to list columns to ensure order match or explicit mapping
                        # Common columns: id, email, password_hash, name, plan, is_admin, email_verified, ...
                        # New columns: account_type, linked_business_id
                        
                        # Get columns from old table
                        old_cols = [c['name'] for c in inspector.get_columns('users_old')]
                        cols_str = ", ".join(old_cols)
                        
                        # For new columns, we default them
                        # account_type -> 'personal' (since existing users are personal)
                        # linked_business_id -> NULL
                        
                        select_str = ", ".join(old_cols)
                        insert_str = ", ".join(old_cols) + ", account_type, linked_business_id"
                        
                        # Wait, create_all created the new table with the new columns.
                        # So we insert into new table from old table.
                        
                        # We need to explicitly list columns because 'users' has new columns that 'users_old' doesn't have fully populated?
                        # No, we added them in step 1. So users_old HAS account_type and linked_business_id.
                        
                        conn.execute(text(f"INSERT INTO users ({cols_str}) SELECT {cols_str} FROM users_old"))
                        
                        # 4. Drop old table
                        conn.execute(text("DROP TABLE users_old"))
                        
                        conn.commit()
                        logger.info("SQLite migration completed.")
                    else:
                        logger.info("SQLite already migrated.")
                        
                except Exception as e:
                    logger.error(f"Error migrating SQLite: {e}")
                    conn.rollback()
                    # Try to restore if failed?
                    # If users_old exists and users doesn't, rename back
                    try:
                        conn.execute(text("ALTER TABLE users_old RENAME TO users"))
                        conn.commit()
                    except:
                        pass

if __name__ == "__main__":
    migrate()
