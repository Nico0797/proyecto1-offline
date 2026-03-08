from backend.main import app, db, RecurringExpense, Business

with app.app_context():
    expenses = RecurringExpense.query.all()
    print(f"Total Recurring Expenses: {len(expenses)}")
    for e in expenses:
        print(f"ID: {e.id}, Name: {e.name}, Business ID: {e.business_id}, Active: {e.is_active}")
    
    businesses = Business.query.all()
    print("\nBusinesses:")
    for b in businesses:
        print(f"ID: {b.id}, Name: {b.name}, User ID: {b.user_id}")
