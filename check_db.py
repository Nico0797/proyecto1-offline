
from backend.main import app
from backend.database import db
from sqlalchemy import inspect

with app.app_context():
    inspector = inspect(db.engine)
    tables = inspector.get_table_names()
    print("Tables:", tables)
    
    # Check columns in team_members if it exists
    if 'team_members' in tables:
        cols = [c['name'] for c in inspector.get_columns('team_members')]
        print("TeamMember columns:", cols)
    else:
        print("TeamMember table MISSING")
