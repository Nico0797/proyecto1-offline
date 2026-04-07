from backend.main import app, db, Business, User

with app.app_context():
    businesses = Business.query.all()
    print(f"Total Businesses: {len(businesses)}")
    for b in businesses:
        print(f"ID: {b.id}, Name: {b.name}, User ID: {b.user_id}")
    
    users = User.query.all()
    for u in users:
        print(f"User ID: {u.id}, Email: {u.email}")
