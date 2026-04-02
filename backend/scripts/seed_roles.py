
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import db
from backend.models import Role, Permission, RolePermission
from backend.main import create_app

def seed_roles():
    print("Seeding roles and permissions...")
    
    app = create_app()
    
    with app.app_context():
        # Ensure tables exist
        db.create_all()
        
        # 1. Define Permissions
        permissions_data = [
            # Products
            {"name": "products.read", "description": "Ver productos", "category": "products"},
            {"name": "products.create", "description": "Crear productos", "category": "products"},
            {"name": "products.update", "description": "Editar productos", "category": "products"},
            {"name": "products.delete", "description": "Eliminar productos", "category": "products"},
            {"name": "products.cost", "description": "Ver costos de productos", "category": "products"},
            
            # Inventory
            {"name": "inventory.adjust", "description": "Ajustar inventario", "category": "products"},
            
            # Sales
            {"name": "sales.read", "description": "Ver ventas", "category": "sales"},
            {"name": "sales.create", "description": "Registrar ventas", "category": "sales"},
            {"name": "sales.update", "description": "Editar ventas", "category": "sales"},
            {"name": "sales.delete", "description": "Eliminar ventas", "category": "sales"},
            {"name": "sales.profit", "description": "Ver utilidad de ventas", "category": "sales"},
            {"name": "sales.goals", "description": "Ver Metas Propias", "category": "sales"},
            {"name": "sales.goals.manage", "description": "Crear/Editar/Eliminar Metas", "category": "sales"},
            {"name": "sales.goals.view_all", "description": "Ver todas las metas", "category": "sales"},
            
            # Customers
            {"name": "customers.read", "description": "Ver clientes", "category": "customers"},
            {"name": "customers.create", "description": "Crear clientes", "category": "customers"},
            {"name": "customers.update", "description": "Editar clientes", "category": "customers"},
            {"name": "customers.delete", "description": "Eliminar clientes", "category": "customers"},
            
            # Expenses
            {"name": "expenses.read", "description": "Ver gastos", "category": "expenses"},
            {"name": "expenses.create", "description": "Registrar gastos", "category": "expenses"},
            {"name": "expenses.update", "description": "Editar gastos", "category": "expenses"},
            {"name": "expenses.delete", "description": "Eliminar gastos", "category": "expenses"},

            # Payments (NEW)
            {"name": "payments.read", "description": "Ver pagos", "category": "payments"},
            {"name": "payments.create", "description": "Registrar pagos", "category": "payments"},
            {"name": "payments.delete", "description": "Eliminar pagos", "category": "payments"},
            
            # Debts (Cuentas por pagar)
            {"name": "debts.read", "description": "Ver deudas", "category": "expenses"},
            {"name": "debts.manage", "description": "Gestionar deudas", "category": "expenses"},

            # Reports
            {"name": "reports.view", "description": "Ver reportes básicos", "category": "reports"},
            {"name": "reports.financial", "description": "Ver reportes financieros", "category": "reports"},
            
            # Settings & Team
            {"name": "business.update", "description": "Configurar negocio", "category": "settings"},
            {"name": "team.manage", "description": "Gestionar equipo", "category": "settings"},
            
            # Dashboard & Summary
            {"name": "summary.read", "description": "Ver Resumen/Dashboard", "category": "summary"},
            {"name": "reminders.manage", "description": "Gestionar Recordatorios", "category": "summary"},
            
            # Dashboard Widgets (Advanced)
            {"name": "dashboard.view", "description": "Ver Dashboard Completo", "category": "summary"}, # Legacy/Advanced?
            {"name": "dashboard.sales", "description": "Ver Widgets de Ventas", "category": "summary"},
            {"name": "dashboard.financial", "description": "Ver Widgets Financieros", "category": "summary"},
        ]
        
        perms_map = {}
        for p_data in permissions_data:
            perm = Permission.query.filter_by(name=p_data["name"]).first()
            if not perm:
                perm = Permission(**p_data)
                db.session.add(perm)
                print(f"Created permission: {perm.name}")
            else:
                # Update description just in case
                perm.description = p_data["description"]
                perm.category = p_data["category"]
            
            perms_map[p_data["name"]] = perm
        
        db.session.commit()
        
        # Reload permissions to get IDs
        all_perms = {p.name: p for p in Permission.query.all()}
        
        # 2. Define Roles
        roles_def = {
            "OWNER": {
                "description": "Dueño del negocio. Acceso total.",
                "permissions": ["*"] # Special handler logic needed or assign all
            },
            "ADMIN": {
                "description": "Administrador. Gestión operativa completa.",
                "permissions": [
                    "products.read", "products.create", "products.update", "products.delete", "products.cost",
                    "inventory.adjust",
                    "sales.read", "sales.create", "sales.update", "sales.delete", "sales.profit", "sales.goals", "sales.goals.manage", "sales.goals.view_all",
                    "customers.read", "customers.create", "customers.update", "customers.delete",
                    "expenses.read", "expenses.create", "expenses.update", "expenses.delete",
                    "payments.read", "payments.create", "payments.delete",
                    "debts.read", "debts.manage",
                    "reports.view", "reports.financial",
                    "business.update", "team.manage",
                    "summary.read", "reminders.manage",
                    "dashboard.view", "dashboard.sales", "dashboard.financial"
                ]
            },
            "VENTAS": {
                "description": "Vendedor. Ventas y clientes.",
                "permissions": [
                    "products.read", 
                    # No products.cost
                    "sales.read", "sales.create", "sales.goals",
                    # No sales.delete, No sales.update (maybe?), No sales.profit
                    "customers.read", "customers.create", "customers.update",
                    "payments.read", "payments.create",
                    "summary.read", "reminders.manage",
                    # No expenses
                    # No debts
                    # No reports
                    # No settings
                ]
            },
            "CONTABILIDAD": {
                "description": "Finanzas. Gastos y reportes.",
                "permissions": [
                    "sales.read", "sales.profit",
                    "expenses.read", "expenses.create", "expenses.update", "expenses.delete",
                    "debts.read", "debts.manage",
                    "reports.view", "reports.financial",
                    "summary.read", "reminders.manage",
                    "dashboard.view", "dashboard.sales", "dashboard.financial"
                    # No products management
                    # No customers management
                ]
            }
        }
        
        for role_name, role_data in roles_def.items():
            role = Role.query.filter_by(name=role_name).first()
            if not role:
                role = Role(name=role_name, description=role_data["description"], is_system=True)
                db.session.add(role)
                print(f"Created role: {role_name}")
            else:
                role.description = role_data["description"]
                role.is_system = True
            
            db.session.commit()
            
            # Assign permissions
            # First, clear existing permissions for this role to ensure strict sync
            RolePermission.query.filter_by(role_id=role.id).delete()
            
            target_perms = []
            if role_data["permissions"] == ["*"]:
                target_perms = all_perms.values()
            else:
                for pname in role_data["permissions"]:
                    if pname in all_perms:
                        target_perms.append(all_perms[pname])
            
            for perm in target_perms:
                rp = RolePermission(role_id=role.id, permission_id=perm.id)
                db.session.add(rp)
            
            print(f"Updated permissions for {role_name}")
            
        db.session.commit()
        print("Roles seeded successfully!")

if __name__ == "__main__":
    seed_roles()
