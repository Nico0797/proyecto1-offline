
import os
import sys
from sqlalchemy import inspect

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from backend.main import app, db

def check_tables():
    with app.app_context():
        engine = db.engine
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        print(f"Tables found: {tables}")
        
        if "team_feedback" in tables:
            print("SUCCESS: 'team_feedback' table exists.")
        else:
            print("ERROR: 'team_feedback' table MISSING.")

if __name__ == "__main__":
    check_tables()
