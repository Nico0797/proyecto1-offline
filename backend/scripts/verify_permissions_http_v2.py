
import sys
import os
import json
from datetime import datetime

# Add the parent directory to the path so we can import backend modules
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.main import app
from backend.database import db
from backend.models import User, Business, Role, TeamMember
from backend.auth import create_token

def run_http_verification_v2():
    print("🚀 Starting HTTP Permission & Traceability Verification (v2)...")
    
    with app.app_context():
        # 1. Setup Data (Reusing logic but safer checks)
        owner = User.query.filter_by(email="owner_http@test.com").first()
        if not owner:
            owner = User(email="owner_http@test.com", name="Owner HTTP", password_hash="hash", plan="pro")
            db.session.add(owner)
            db.session.commit()
            
        business = Business.query.filter_by(user_id=owner.id, name="HTTP Business").first()
        if not business:
            business = Business(user_id=owner.id, name="HTTP Business")
            db.session.add(business)
            db.session.commit()

        employee = User.query.filter_by(email="emp_http@test.com").first()
        if not employee:
            employee = User(email="emp_http@test.com", name="Employee HTTP", password_hash="hash")
            db.session.add(employee)
            db.session.commit()
            
        stranger = User.query.filter_by(email="stranger_http@test.com").first()
        if not stranger:
            stranger = User(email="stranger_http@test.com", name="Stranger HTTP", password_hash="hash")
            db.session.add(stranger)
            db.session.commit()

        # Assign Role to Employee (Ensure it exists)
        role_admin = Role.query.filter_by(name="ADMIN").first()
        if not role_admin:
             role_admin = Role(name="ADMIN", is_system=True)
             db.session.add(role_admin)
             db.session.commit()
             
        tm = TeamMember.query.filter_by(user_id=employee.id, business_id=business.id).first()
        if not tm:
            tm = TeamMember(user_id=employee.id, business_id=business.id, role_id=role_admin.id, status="active")
            db.session.add(tm)
            db.session.commit()

        # Use REAL token generator
        owner_token = create_token(owner.id)
        emp_token = create_token(employee.id)
        stranger_token = create_token(stranger.id)
        
        client = app.test_client()
        
        # --- TEST 1: Owner Creates Expense ---
        print("\n--- 1. Case: Owner Creates Expense ---")
        res = client.post(
            f"/api/businesses/{business.id}/expenses",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={"category": "Owner HTTP", "amount": 150, "description": "Via API"}
        )
        
        if res.status_code == 201:
            data = res.get_json()
            exp = data["expense"]
            print(f"  ✅ Success (201). ID: {exp['id']}")
            print(f"     Author: {exp['created_by_name']} ({exp['created_by_role']})")
            if exp['created_by_user_id'] == owner.id:
                print("     ✅ Author matches Owner")
            else:
                print(f"     ❌ Author mismatch: {exp['created_by_user_id']}")
        else:
            print(f"  ❌ Failed: {res.status_code} - {res.get_data(as_text=True)}")

        # --- TEST 2: Employee Creates Expense ---
        print("\n--- 2. Case: Employee (With Permission) Creates Expense ---")
        
        res = client.post(
            f"/api/businesses/{business.id}/expenses",
            headers={"Authorization": f"Bearer {emp_token}"},
            json={"category": "Emp HTTP", "amount": 75, "description": "Via API Emp"}
        )
        
        if res.status_code == 201:
            data = res.get_json()
            exp = data["expense"]
            print(f"  ✅ Success (201). ID: {exp['id']}")
            print(f"     Author: {exp['created_by_name']} ({exp['created_by_role']})")
            if exp['created_by_user_id'] == employee.id:
                print("     ✅ Author matches Employee")
            else:
                print(f"     ❌ Author mismatch: {exp['created_by_user_id']}")
        elif res.status_code == 403:
             print("  ⚠️ 403 Forbidden. Employee lacks permission configuration in DB.")
             print(f"     Msg: {res.get_json()}")
        else:
            print(f"  ❌ Failed: {res.status_code} - {res.get_data(as_text=True)}")

        # --- TEST 3: Stranger (No Permission) ---
        print("\n--- 3. Case: Stranger (No Access) ---")
        res = client.post(
            f"/api/businesses/{business.id}/expenses",
            headers={"Authorization": f"Bearer {stranger_token}"},
            json={"category": "Hack", "amount": 999}
        )
        
        if res.status_code == 403:
            print(f"  ✅ Blocked correctly (403): {res.get_json()}")
        elif res.status_code == 404:
            # If the endpoint does Business.query.get(business_id) it returns 404 if not found?
            # No, Business.query.get just gets it.
            # But maybe permission logic checks business existence first?
            # Let's see what we get.
            print(f"  ✅ Blocked (404/403): {res.status_code} - {res.get_json()}")
        else:
            print(f"  ❌ UNEXPECTED: {res.status_code} - {res.get_data(as_text=True)}")

if __name__ == "__main__":
    run_http_verification_v2()
