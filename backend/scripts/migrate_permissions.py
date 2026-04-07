
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from backend.main import app
from backend.database import db
from backend.models import Permission, Role, RolePermission

def migrate_permissions():
    print("🚀 Migrating Permissions for Team Analytics...")
    with app.app_context():
        # 1. Create Permission if not exists
        perm_name = "analytics.view_team"
        perm = Permission.query.filter_by(name=perm_name).first()
        if not perm:
            perm = Permission(
                name=perm_name, 
                description="Ver reportes de gestión de equipo",
                category="analytics"
            )
            db.session.add(perm)
            db.session.commit()
            print(f"✅ Permission '{perm_name}' created.")
        else:
            print(f"ℹ️ Permission '{perm_name}' already exists.")

        # 2. Assign to Roles
        target_roles = ['ADMIN', 'SUPERADMIN', 'GERENTE']
        
        for role_name in target_roles:
            role = Role.query.filter_by(name=role_name).first()
            if role:
                # Check if already assigned
                exists = RolePermission.query.filter_by(role_id=role.id, permission_id=perm.id).first()
                if not exists:
                    rp = RolePermission(role_id=role.id, permission_id=perm.id)
                    db.session.add(rp)
                    print(f"✅ Assigned '{perm_name}' to Role '{role_name}'")
                else:
                    print(f"ℹ️ Role '{role_name}' already has '{perm_name}'")
            else:
                print(f"⚠️ Role '{role_name}' not found (skipping)")
        
        db.session.commit()
        print("✅ Migration Completed.")

if __name__ == "__main__":
    migrate_permissions()
