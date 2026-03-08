from backend.main import app, db, RecurringExpense
from datetime import date

with app.app_context():
    # Add expense for Business 1 (Mi Negocio)
    expense = RecurringExpense(
        business_id=1,
        name="Alquiler Local",
        amount=1500000,
        due_day=5,
        frequency="monthly",
        category="Arriendo",
        next_due_date=date(2026, 4, 5),
        is_active=True
    )
    db.session.add(expense)
    db.session.commit()
    print(f"Added expense for Business 1: {expense.id}")
