
import sys
import os
import requests
import json
from datetime import datetime

# Add the parent directory to the path so we can import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.main import app
from backend.database import db
from backend.models import User, Business, Sale, Expense, Payment, Customer, ProductMovement, Reminder, Product

def run_verification():
    print("🚀 Starting Backend Traceability Verification...")
    
    with app.app_context():
        # 1. DB Schema Verification
        print("\n🔍 1. Verifying Database Schema...")
        inspector = db.inspect(db.engine)
        
        tables_to_check = {
            "sales": ["created_by_name", "created_by_role", "updated_by_user_id"],
            "expenses": ["created_by_user_id", "created_by_name", "created_by_role", "updated_by_user_id"],
            "payments": ["created_by_user_id", "created_by_name", "created_by_role", "updated_by_user_id"],
            "customers": ["created_by_user_id", "created_by_name", "created_by_role", "updated_by_user_id"],
            "product_movements": ["created_by_name", "created_by_role"],
            "reminders": ["created_by_user_id", "created_by_name", "created_by_role", "updated_by_user_id"]
        }
        
        all_columns_exist = True
        for table, required_columns in tables_to_check.items():
            columns = [c['name'] for c in inspector.get_columns(table)]
            missing = [c for c in required_columns if c not in columns]
            if missing:
                print(f"❌ {table}: Missing columns {missing}")
                all_columns_exist = False
            else:
                print(f"✅ {table}: All traceability columns present")
        
        if not all_columns_exist:
            print("🛑 Aborting verification due to missing DB columns.")
            return

        # 2. Functional Verification
        print("\n🔍 2. Verifying Data Recording (Simulation)...")
        
        # Setup Test Context
        # We need a user and a business
        user = User.query.first()
        if not user:
            print("⚠️ No users found in DB. Cannot run functional tests.")
            return
            
        business = Business.query.filter_by(user_id=user.id).first()
        if not business:
            # Try to find any business linked to user
             business = Business.query.first()
             
        if not business:
            print("⚠️ No business found. Cannot run functional tests.")
            return

        print(f"👤 Testing as User: {user.email} (ID: {user.id})")
        print(f"🏢 Testing in Business: {business.name} (ID: {business.id})")

        # Mock g.current_user for simulation
        from flask import g
        g.current_user = user
        
        # Test 1: Expense Creation
        print("\n--- Testing Expense Creation ---")
        try:
            from backend.main import get_current_role_snapshot
            role = get_current_role_snapshot(user, business.id)
            
            expense = Expense(
                business_id=business.id,
                expense_date=datetime.now().date(),
                category="Test Traceability",
                amount=100.0,
                description="Auto-test",
                created_by_user_id=user.id,
                created_by_name=user.name,
                created_by_role=role,
                updated_by_user_id=user.id
            )
            db.session.add(expense)
            db.session.commit()
            
            # Verify Persistence
            saved_expense = Expense.query.get(expense.id)
            if (saved_expense.created_by_user_id == user.id and 
                saved_expense.created_by_name == user.name and 
                saved_expense.created_by_role == role):
                print(f"✅ Expense saved correctly with Author: {saved_expense.created_by_name} ({saved_expense.created_by_role})")
            else:
                print(f"❌ Expense traceability failed: {saved_expense.to_dict()}")
                
            # Cleanup
            db.session.delete(saved_expense)
            db.session.commit()
            
        except Exception as e:
            print(f"❌ Expense Test Error: {e}")

        # Test 2: Customer Creation
        print("\n--- Testing Customer Creation ---")
        try:
            customer = Customer(
                business_id=business.id,
                name="Test Customer Traceability",
                created_by_user_id=user.id,
                created_by_name=user.name,
                created_by_role=role,
                updated_by_user_id=user.id
            )
            db.session.add(customer)
            db.session.commit()
            
            saved_cust = Customer.query.get(customer.id)
            if saved_cust.created_by_user_id == user.id:
                 print(f"✅ Customer saved correctly with Author: {saved_cust.created_by_name}")
            else:
                 print("❌ Customer traceability failed")

            # Cleanup
            db.session.delete(saved_cust)
            db.session.commit()

        except Exception as e:
            print(f"❌ Customer Test Error: {e}")
            
        # Test 3: Historical Data Compatibility
        print("\n--- Testing Historical Data Compatibility ---")
        try:
            # Create a "dummy" historical record (simulating old data with NULLs)
            # We use raw SQL to bypass current model defaults if any
            db.session.execute(
                db.text(f"INSERT INTO expenses (business_id, expense_date, category, amount, description, created_at) VALUES ({business.id}, '2023-01-01', 'Historical', 50, 'Old Data', '2023-01-01')")
            )
            db.session.commit()
            
            # Fetch it back using ORM
            historical_expense = Expense.query.filter_by(description="Old Data").first()
            
            # Check to_dict()
            data = historical_expense.to_dict()
            print("✅ Historical record fetched successfully")
            print(f"   created_by_name: {data.get('created_by_name')} (Should be None)")
            
            if data.get('created_by_name') is None:
                print("✅ to_dict() handles NULL correctly")
            else:
                print("❌ to_dict() unexpected value for NULL")

            # Cleanup
            db.session.delete(historical_expense)
            db.session.commit()

        except Exception as e:
            print(f"❌ Historical Data Test Error: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    run_verification()
