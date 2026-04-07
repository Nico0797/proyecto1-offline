
from backend.database import db
from backend.models import (
    User, Business, Product, Customer, Sale, Expense, 
    Permission, Role, UserRole, RolePermission
)
from backend.services.rbac import PERMISSION_DEFINITIONS, ROLE_TEMPLATE_DEFINITIONS

def seed_rbac():
    """Crear permisos y roles base del sistema RBAC"""
    print("[RBAC] Creating base permissions...")
    
    # Permisos base del sistema
    base_permissions = [
        {
            "name": perm_data["name"],
            "description": perm_data.get("description", ""),
            "category": perm_data.get("category", "general"),
            "scope": perm_data.get("scope", "business"),
        }
        for perm_data in PERMISSION_DEFINITIONS
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
            # Update scope if missing
            if not existing.scope:
                existing.scope = perm_data.get("scope", "business")
                db.session.add(existing)
            permissions_map[perm_data["name"]] = existing
    
    print(f"[RBAC] Created/Updated {len(permissions_map)} permissions")
    
    # Roles del sistema (Preestablecidos)
    print("[RBAC] Creating roles...")
    
    roles_config = [
        {
            "name": "SUPERADMIN",
            "description": "Administrador supreme con acceso total al sistema",
            "is_system": True,
            "permissions": ["admin.*"]
        },
        *[
            {
                "name": role_data["name"],
                "description": role_data.get("description", ""),
                "is_system": True,
                "permissions": list(role_data.get("permissions") or []),
            }
            for role_data in ROLE_TEMPLATE_DEFINITIONS
        ],
    ]
    
    roles_map = {}
    for role_data in roles_config:
        role_data_copy = role_data.copy()
        role_name = role_data_copy.pop("name")
        perm_names = role_data_copy.pop("permissions")
        
        existing = Role.query.filter_by(name=role_name).first()
        
        role = existing
        if not existing:
            role = Role(name=role_name, **role_data_copy)
            db.session.add(role)
            db.session.flush()
            print(f"[RBAC] Created role: {role_name}")
        else:
            # Update description if system role
            if existing.is_system:
                existing.description = role_data_copy["description"]
                db.session.add(existing)
            print(f"[RBAC] Role updated/verified: {role_name}")
            
        roles_map[role_name] = role
        
        # Asignar permisos (Sync permissions for system roles)
        if role.is_system:
            # Clear existing perms for system roles to ensure they match config
            # But be careful not to break anything? Actually for system roles, we WANT to enforce the template.
            # However, clearing is drastic. Let's just ADD missing ones.
            # User request: "No quiero eliminar tablas".
            
            # Better strategy: Get current perms, add missing.
            # Ideally we should remove extra perms too if we want strict templates.
            pass

        for perm_name in perm_names:
            if perm_name.endswith(".*"):
                prefix = perm_name[:-2]
                target_perms = [p for name, p in permissions_map.items() if name.startswith(prefix)]
            else:
                target_perms = [permissions_map.get(perm_name)] if perm_name in permissions_map else []
            
            for p in target_perms:
                if p:
                    existing_link = RolePermission.query.filter_by(role_id=role.id, permission_id=p.id).first()
                    if not existing_link:
                        rp = RolePermission(role_id=role.id, permission_id=p.id)
                        db.session.add(rp)
    
    db.session.commit()
    print(f"[RBAC] Roles processing completed")
    
    return roles_map
