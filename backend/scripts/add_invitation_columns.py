import os
import sys
from sqlalchemy import text

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app, db

def upgrade():
    with app.app_context():
        with db.engine.connect() as conn:
            # Check if columns exist - generic way via inspector or try/except
            # Since we know it is postgres from .env, we can use information_schema, but let's be safe
            # and use SQLALchemy inspector if possible, or just raw SQL with IF NOT EXISTS if supported (Postgres supports it but syntax varies)
            
            # Better: use text execution and catch error or check first
            try:
                # Add provider
                conn.execute(text("ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS provider VARCHAR(20)"))
                print("Added provider")
            except Exception as e:
                print(f"Provider error: {e}")

            try:
                # Add last_email_error
                conn.execute(text("ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS last_email_error TEXT"))
                print("Added last_email_error")
            except Exception as e:
                print(f"last_email_error error: {e}")

            try:
                # Add send_attempts
                conn.execute(text("ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS send_attempts INTEGER DEFAULT 0"))
                print("Added send_attempts")
            except Exception as e:
                print(f"send_attempts error: {e}")

            try:
                # Add last_sent_at
                conn.execute(text("ALTER TABLE team_invitations ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP WITHOUT TIME ZONE"))
                print("Added last_sent_at")
            except Exception as e:
                print(f"last_sent_at error: {e}")
                
            conn.commit()
            print("Migration completed.")

if __name__ == "__main__":
    upgrade()
