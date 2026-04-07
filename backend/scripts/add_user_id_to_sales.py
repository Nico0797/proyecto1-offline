import sys
import os

# Add parent directory to path to import backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.main import app, db
from sqlalchemy import text

def migrate():
    with app.app_context():
        try:
            print("Starting migration...")
            
            # Use raw SQL to check columns - this works for SQLite which seems to be used locally?
            # Or Postgres. Let's try to be generic or check config.
            # The previous script used information_schema which suggests Postgres.
            
            # Let's try to check if column exists by selecting from it
            try:
                db.session.execute(text("SELECT user_id FROM sales LIMIT 1"))
                print("Column user_id already exists.")
                return
            except Exception:
                print("Column user_id does not exist. Adding it...")
                db.session.rollback()

            # Add column
            # Note: SQLite doesn't support ADD COLUMN with REFERENCES in one go in some versions, 
            # but usually ADD COLUMN user_id INTEGER works.
            # Let's try standard SQL.
            
            try:
                # Attempt PostgreSQL syntax first
                db.session.execute(text("ALTER TABLE sales ADD COLUMN user_id INTEGER"))
                db.session.execute(text("ALTER TABLE sales ADD CONSTRAINT fk_sales_users FOREIGN KEY (user_id) REFERENCES users(id)"))
                print("Column added (Postgres style).")
            except Exception as e:
                print(f"Postgres style failed: {e}")
                db.session.rollback()
                # Attempt SQLite style (or simple add)
                try:
                    db.session.execute(text("ALTER TABLE sales ADD COLUMN user_id INTEGER REFERENCES users(id)"))
                    print("Column added (SQLite style).")
                except Exception as e2:
                    print(f"SQLite style failed: {e2}")
                    db.session.rollback()
                    return

            db.session.commit()
            
            # Backfill
            print("Backfilling user_id with business owner...")
            # This query assumes businesses table has user_id which is the owner
            db.session.execute(text("""
                UPDATE sales 
                SET user_id = (SELECT user_id FROM businesses WHERE businesses.id = sales.business_id)
                WHERE user_id IS NULL
            """))
            db.session.commit()
            print("Backfill complete.")
                    
        except Exception as e:
            print(f"Error during migration: {e}")
            db.session.rollback()

if __name__ == "__main__":
    migrate()
