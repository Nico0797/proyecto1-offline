from backend.main import app, db, RecurringExpense

with app.app_context():
    expenses = RecurringExpense.query.all()
    print(f"Total Recurring Expenses in DB: {len(expenses)}")
    for e in expenses:
        print(f"ID: {e.id}, Name: {e.name}, Business ID: {e.business_id}, Active: {e.is_active}")
