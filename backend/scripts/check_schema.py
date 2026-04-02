
import os
import sys
from sqlalchemy import inspect, text

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app, db
from backend.models import TeamInvitation

def check_schema():
    with app.app_context():
        engine = db.engine
        inspector = inspect(engine)
        
        print(f"Database: {engine.url}")
        
        if inspector.has_table("team_invitations"):
            print("Table 'team_invitations' exists.")
            columns = [col["name"] for col in inspector.get_columns("team_invitations")]
            print(f"Columns: {columns}")
            
            if "message_id" in columns and "delivery_status" in columns:
                print("SUCCESS: New columns found.")
            else:
                print("ERROR: New columns MISSING.")
        else:
            print("Table 'team_invitations' does NOT exist.")

        # Try to query
        try:
            invites = TeamInvitation.query.all()
            print(f"Found {len(invites)} invitations.")
            for inv in invites:
                print(f"- ID: {inv.id}, Email: {inv.email}, Business: {inv.business_id}")
        except Exception as e:
            print(f"Error querying invitations: {e}")

if __name__ == "__main__":
    check_schema()
