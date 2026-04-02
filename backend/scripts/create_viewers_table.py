from backend.main import app, db
from backend.models import sales_goal_viewers

with app.app_context():
    # Check if table exists
    engine = db.engine
    from sqlalchemy import inspect
    inspector = inspect(engine)
    if 'sales_goal_viewers' not in inspector.get_table_names():
        print("Creating sales_goal_viewers table...")
        sales_goal_viewers.create(engine)
        print("Table created.")
    else:
        print("Table sales_goal_viewers already exists.")
