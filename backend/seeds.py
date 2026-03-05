
from backend.database import db
from backend.models import (
    User, Business, Product, Customer, Sale, Expense, 
    Permission, Role, UserRole, RolePermission
)

def seed_rbac():
    """Crear permisos y roles base del sistema RBAC"""
    print("[RBAC] Creating base permissions...")
    
    # Permisos base del sistema
    base_permissions = [
        # Admin
        {"name": "admin.*", "description": "Acceso total al panel de administración", "category": "admin"},
        {"name": "admin.users", "description": "Gestionar usuarios", "category": "admin"},
        {"name": "admin.roles", "description": "Gestionar roles", "category": "admin"},
        {"name": "admin.permissions", "description": "Gestionar permisos", "category": "admin"},
        
        # Products
        {"name": "products.*", "description": "Acceso completo a productos", "category": "products"},
        {"name": "products.read", "description": "Ver productos", "category": "products"},
        {"name": "products.create", "description": "Crear productos", "category": "products"},
        {"name": "products.update", "description": "Editar productos", "category": "products"},
        {"name": "products.delete", "description": "Eliminar productos", "category": "products"},
        
        # Clients (Customers)
        {"name": "clients.*", "description": "Acceso completo a clientes", "category": "clients"},
        {"name": "clients.read", "description": "Ver clientes", "category": "clients"},
        {"name": "clients.create", "description": "Crear clientes", "category": "clients"},
        {"name": "clients.update", "description": "Editar clientes", "category": "clients"},
        {"name": "clients.delete", "description": "Eliminar clientes", "category": "clients"},
        
        # Sales
        {"name": "sales.*", "description": "Acceso completo a ventas", "category": "sales"},
        {"name": "sales.read", "description": "Ver ventas", "category": "sales"},
        {"name": "sales.create", "description": "Crear ventas", "category": "sales"},
        {"name": "sales.update", "description": "Editar ventas", "category": "sales"},
        {"name": "sales.delete", "description": "Eliminar ventas", "category": "sales"},
        
        # Payments
        {"name": "payments.*", "description": "Acceso completo a pagos", "category": "payments"},
        {"name": "payments.read", "description": "Ver pagos", "category": "payments"},
        {"name": "payments.create", "description": "Registrar pagos", "category": "payments"},
        {"name": "payments.update", "description": "Editar pagos", "category": "payments"},
        {"name": "payments.delete", "description": "Eliminar pagos", "category": "payments"},
        
        # Expenses
        {"name": "expenses.*", "description": "Acceso completo a gastos", "category": "expenses"},
        {"name": "expenses.read", "description": "Ver gastos", "category": "expenses"},
        {"name": "expenses.create", "description": "Crear gastos", "category": "expenses"},
        {"name": "expenses.update", "description": "Editar gastos", "category": "expenses"},
        {"name": "expenses.delete", "description": "Eliminar gastos", "category": "expenses"},
        
        # Summary/Reports
        {"name": "summary.*", "description": "Acceso completo a resúmenes y reportes", "category": "summary"},
        {"name": "summary.dashboard", "description": "Ver dashboard", "category": "summary"},
        {"name": "summary.financial", "description": "Ver estados financieros", "category": "summary"},
        
        # Export
        {"name": "export.*", "description": "Acceso completo a exportaciones", "category": "export"},
        {"name": "export.pdf", "description": "Exportar PDF", "category": "export"},
        {"name": "export.excel", "description": "Exportar Excel", "category": "export"},
        
        # Settings
        {"name": "settings.*", "description": "Acceso completo a configuración", "category": "settings"},
        {"name": "settings.business", "description": "Configuración del negocio", "category": "settings"},
    ]
    
    # Crear permisos
    permissions_map = {}
    for perm_data in base_permissions:
        existing = Permission.query.filter_by(name=perm_data["name"]).first()
        if not existing:
            perm = Permission(**perm_data)
            db.session.add(perm)
            db.session.flush()
            permissions_map[perm_data["name"]] = perm
        else:
            permissions_map[perm_data["name"]] = existing
    
    print(f"[RBAC] Created {len(permissions_map)} permissions")
    
    # Roles del sistema
    print("[RBAC] Creating roles...")
    
    roles_config = [
        {
            "name": "SUPERADMIN",
            "description": "Administrador supreme con acceso total al sistema",
            "is_system": True,
            "permissions": ["admin.*"]
        },
        {
            "name": "ADMIN",
            "description": "Administrador del negocio con acceso completo",
            "is_system": True,
            "permissions": ["products.*", "clients.*", "sales.*", "payments.*", "expenses.*", "summary.*", "export.*", "settings.*"]
        },
        {
            "name": "VENTAS",
            "description": "Rol para vendedores - acceso a ventas, clientes y productos",
            "is_system": True,
            "permissions": ["products.read", "clients.*", "sales.*", "payments.create", "summary.dashboard"]
        },
        {
            "name": "CONTABILIDAD",
            "description": "Rol para área contable - acceso a reportes y gastos",
            "is_system": True,
            "permissions": ["clients.read", "sales.read", "payments.*", "expenses.*", "summary.*", "export.*"]
        },
        {
            "name": "LECTOR",
            "description": "Solo lectura - puede ver información sin modificar",
            "is_system": True,
            "permissions": ["products.read", "clients.read", "sales.read", "payments.read", "expenses.read", "summary.dashboard"]
        },
    ]
    
    roles_map = {}
    for role_data in roles_config:
        # Avoid mutating the original list of dicts if called multiple times, so copy
        role_data_copy = role_data.copy()
        role_name = role_data_copy.pop("name")
        perm_names = role_data_copy.pop("permissions")
        
        existing = Role.query.filter_by(name=role_name).first()
        if not existing:
            role = Role(name=role_name, **role_data_copy)
            db.session.add(role)
            db.session.flush()
            
            # Asignar permisos al rol usando RolePermission
            # Need to re-fetch permissions map if we are running in a new transaction/session or if permissions might exist
            # But here we rely on what we just queried/created
            
            # Helper to find permission ID by name (inefficient but safe)
            for perm_name in perm_names:
                # Handle wildcard expansion if needed? 
                # For now assume direct mapping or simple wildcard matching logic if implemented
                # But the previous code assumed direct mapping to `permissions_map`
                
                # If wildcard (e.g. admin.*), we should find all permissions starting with admin.
                if perm_name.endswith(".*"):
                    prefix = perm_name[:-2]
                    target_perms = [p for name, p in permissions_map.items() if name.startswith(prefix)]
                else:
                    target_perms = [permissions_map.get(perm_name)] if perm_name in permissions_map else []
                
                for p in target_perms:
                    if p:
                         # Check if link exists
                        existing_link = RolePermission.query.filter_by(role_id=role.id, permission_id=p.id).first()
                        if not existing_link:
                            rp = RolePermission(role_id=role.id, permission_id=p.id)
                            db.session.add(rp)
            
            roles_map[role_name] = role
            print(f"[RBAC] Created role: {role_name}")
        else:
            roles_map[role_name] = existing
            print(f"[RBAC] Role already exists: {role_name}")
    
    db.session.commit()
    print(f"[RBAC] Created {len(roles_map)} roles")
    
    return roles_map
