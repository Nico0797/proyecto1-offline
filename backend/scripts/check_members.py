
import sys
import os
from flask import Flask

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import db
from backend.models import Role, TeamMember, User, Business
from backend.main import create_app

app = create_app()

with app.app_context():
    print("=== ROLES DIAGNOSTIC ===")
    roles = Role.query.all()
    for r in roles:
        print(f"Role: {r.name} (ID: {r.id}, System: {r.is_system})")
        member_count = TeamMember.query.filter_by(role_id=r.id).count()
        print(f"  Assigned to {member_count} members")
        
    print("\n=== TEAM MEMBERS SAMPLE ===")
    members = TeamMember.query.limit(10).all()
    for m in members:
        role_name = m.role.name if m.role else "None"
        user_name = m.user.name if m.user else "Unknown"
        print(f"User: {user_name} (ID: {m.user_id}) -> Business: {m.business_id} -> Role: {role_name}")

    print("========================")
