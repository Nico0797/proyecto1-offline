
import sys
import os
from flask import Flask

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import db
from backend.models import User, Role, Permission, RolePermission, TeamMember, Business
from backend.main import create_app
from backend.auth import has_permission

app = create_app()

with app.app_context():
    print("=== DIAGNOSTIC REPORT ===")
    
    # 1. Check Permission
    perm = Permission.query.filter_by(name="reminders.manage").first()
    print(f"Permission 'reminders.manage' exists: {perm is not None}")
    if perm:
        print(f"  ID: {perm.id}")

    # 2. Check Role VENTAS
    role = Role.query.filter_by(name="VENTAS").first()
    print(f"Role 'VENTAS' exists: {role is not None}")
    if role:
        print(f"  ID: {role.id}")
        
        # 3. Check Link
        if perm:
            rp = RolePermission.query.filter_by(role_id=role.id, permission_id=perm.id).first()
            print(f"Link VENTAS -> reminders.manage exists: {rp is not None}")
        
        # List all permissions for VENTAS
        print("  Permissions for VENTAS:")
        for p in role.permissions:
            print(f"    - {p.permission.name}")

    # 4. Check a Team Member with this role
    # Find a member with VENTAS role
    member = TeamMember.query.join(Role).filter(Role.name == "VENTAS").first()
    if member:
        print(f"Found TeamMember with VENTAS role: User {member.user_id} in Business {member.business_id}")
        user = User.query.get(member.user_id)
        
        # Test has_permission
        can_manage = has_permission(user, "reminders.manage", member.business_id)
        print(f"has_permission(user={user.id}, 'reminders.manage', business={member.business_id}) = {can_manage}")
    else:
        print("No TeamMember found with VENTAS role to test.")

    print("=========================")
