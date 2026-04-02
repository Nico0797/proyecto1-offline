 
import sys
import os

# Add the parent directory to the path so we can import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.main import app
from backend.database import db
from sqlalchemy import inspect, text

def add_column_if_not_exists(connection, table_name, column_name, column_type):
    """Adds a column to a table if it doesn't already exist."""
    inspector = inspect(connection)
    if not inspector.has_table(table_name):
        print(f"⚠️  Table {table_name} does not exist, skipping")
        return

    existing_columns = {column["name"] for column in inspector.get_columns(table_name)}
    if column_name in existing_columns:
        print(f"ℹ️  Column {column_name} already exists in {table_name}")
        return

    sql = text(f'ALTER TABLE "{table_name}" ADD COLUMN IF NOT EXISTS {created_sql(column_name, column_type)}')
    connection.execute(sql)
    print(f"✅ Added {column_name} to {table_name}")

def created_sql(name, type_def):
    return f"{name} {type_def}"

def migrate():
    with app.app_context():
        with db.engine.connect() as connection:
            trans = connection.begin()
            try:
                print("Starting Traceability Migration...")
                print(f"Detected DB dialect: {connection.dialect.name}")
                if connection.dialect.name != "postgresql":
                    raise RuntimeError("This migration is PostgreSQL-only.")
                
                # 1. Sales
                # Existing: user_id
                # New: created_by_name, created_by_role, updated_by_user_id
                print("\n--- Migrating Sales ---")
                add_column_if_not_exists(connection, "sales", "created_by_name", "VARCHAR(100)")
                add_column_if_not_exists(connection, "sales", "created_by_role", "VARCHAR(50)")
                add_column_if_not_exists(connection, "sales", "updated_by_user_id", "INTEGER REFERENCES users(id)")

                # 2. ProductMovements
                # Existing: user_id
                # New: created_by_name, created_by_role
                print("\n--- Migrating ProductMovements ---")
                add_column_if_not_exists(connection, "product_movements", "created_by_name", "VARCHAR(100)")
                add_column_if_not_exists(connection, "product_movements", "created_by_role", "VARCHAR(50)")

                # 3. Expenses
                # New: created_by_user_id, created_by_name, created_by_role, updated_by_user_id
                print("\n--- Migrating Expenses ---")
                add_column_if_not_exists(connection, "expenses", "created_by_user_id", "INTEGER REFERENCES users(id)")
                add_column_if_not_exists(connection, "expenses", "created_by_name", "VARCHAR(100)")
                add_column_if_not_exists(connection, "expenses", "created_by_role", "VARCHAR(50)")
                add_column_if_not_exists(connection, "expenses", "updated_by_user_id", "INTEGER REFERENCES users(id)")
                add_column_if_not_exists(connection, "expenses", "source_type", "VARCHAR(20) DEFAULT 'manual'")
                add_column_if_not_exists(connection, "expenses", "payment_method", "VARCHAR(50)")
                add_column_if_not_exists(connection, "expenses", "recurring_expense_id", "INTEGER REFERENCES recurring_expenses(id)")
                add_column_if_not_exists(connection, "expenses", "debt_id", "INTEGER REFERENCES debts(id)")
                add_column_if_not_exists(connection, "expenses", "debt_payment_id", "INTEGER REFERENCES debt_payments(id)")

                # 4. Payments
                # New: created_by_user_id, created_by_name, created_by_role, updated_by_user_id
                print("\n--- Migrating Payments ---")
                add_column_if_not_exists(connection, "payments", "created_by_user_id", "INTEGER REFERENCES users(id)")
                add_column_if_not_exists(connection, "payments", "created_by_name", "VARCHAR(100)")
                add_column_if_not_exists(connection, "payments", "created_by_role", "VARCHAR(50)")
                add_column_if_not_exists(connection, "payments", "updated_by_user_id", "INTEGER REFERENCES users(id)")

                # 5. Customers
                # New: created_by_user_id, created_by_name, created_by_role, updated_by_user_id
                print("\n--- Migrating Customers ---")
                add_column_if_not_exists(connection, "customers", "created_by_user_id", "INTEGER REFERENCES users(id)")
                add_column_if_not_exists(connection, "customers", "created_by_name", "VARCHAR(100)")
                add_column_if_not_exists(connection, "customers", "created_by_role", "VARCHAR(50)")
                add_column_if_not_exists(connection, "customers", "updated_by_user_id", "INTEGER REFERENCES users(id)")

                # 6. Reminders
                # New: created_by_user_id, created_by_name, created_by_role, updated_by_user_id
                print("\n--- Migrating Reminders ---")
                add_column_if_not_exists(connection, "reminders", "created_by_user_id", "INTEGER REFERENCES users(id)")
                add_column_if_not_exists(connection, "reminders", "created_by_name", "VARCHAR(100)")
                add_column_if_not_exists(connection, "reminders", "created_by_role", "VARCHAR(50)")
                add_column_if_not_exists(connection, "reminders", "updated_by_user_id", "INTEGER REFERENCES users(id)")

                print("\n--- Migrating RecurringExpenses ---")
                add_column_if_not_exists(connection, "recurring_expenses", "payment_flow", "VARCHAR(20) DEFAULT 'cash'")
                add_column_if_not_exists(connection, "recurring_expenses", "creditor_name", "VARCHAR(255)")

                print("\n--- Migrating Debts ---")
                add_column_if_not_exists(connection, "debts", "creditor_name", "VARCHAR(255)")
                add_column_if_not_exists(connection, "debts", "origin_type", "VARCHAR(20) DEFAULT 'manual'")
                add_column_if_not_exists(connection, "debts", "recurring_expense_id", "INTEGER REFERENCES recurring_expenses(id)")
                add_column_if_not_exists(connection, "debts", "generated_from_due_date", "DATE")
                add_column_if_not_exists(connection, "debts", "notes", "TEXT")
                add_column_if_not_exists(connection, "debts", "reminder_enabled", "BOOLEAN DEFAULT FALSE")

                print("\n--- Migrating DebtPayments ---")
                add_column_if_not_exists(connection, "debt_payments", "payment_method", "VARCHAR(50)")
                add_column_if_not_exists(connection, "debt_payments", "note", "TEXT")

                print("\n--- Migrating Fulfillment Modes ---")
                add_column_if_not_exists(connection, "products", "fulfillment_mode", "VARCHAR(30)")
                add_column_if_not_exists(connection, "quote_items", "fulfillment_mode", "VARCHAR(30)")

                trans.commit()
                print("\n✅ Migration completed successfully!")
                
            except Exception as e:
                trans.rollback()
                print(f"\n❌ Migration failed: {e}")
                # Optional: Detailed error for debugging
                import traceback
                traceback.print_exc()

if __name__ == "__main__":
    migrate()
