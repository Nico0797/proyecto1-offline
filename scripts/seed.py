#!/usr/bin/env python
# Cuaderno - Seed Data Script
# ============================================
"""
Script para cargar datos de ejemplo y datos RBAC iniciales
"""
import os
import sys
from datetime import date, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import db
from backend.main import create_app
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
        role_name = role_data.pop("name")
        perm_names = role_data.pop("permissions")
        
        existing = Role.query.filter_by(name=role_name).first()
        if not existing:
            role = Role(name=role_name, **role_data)
            db.session.add(role)
            db.session.flush()
            
            # Asignar permisos al rol usando RolePermission
            for perm_name in perm_names:
                if perm_name in permissions_map:
                    rp = RolePermission(
                        role_id=role.id,
                        permission_id=permissions_map[perm_name].id
                    )
                    db.session.add(rp)
            
            roles_map[role_name] = role
            print(f"[RBAC] Created role: {role_name}")
        else:
            roles_map[role_name] = existing
            print(f"[RBAC] Role already exists: {role_name}")
    
    db.session.commit()
    print(f"[RBAC] Created {len(roles_map)} roles")
    
    return roles_map


def seed_data():
    """Cargar datos de ejemplo"""
    print("[SEED] Loading seed data...")
    
    app = create_app()
    
    with app.app_context():
        # First seed RBAC
        roles_map = seed_rbac()
        
        # Create test user
        existing_user = User.query.filter_by(email="demo@cuaderno.app").first()
        if existing_user:
            print("[SEED] Seed data already exists!")
        else:
            # Create user
            user = User(
                email="demo@cuaderno.app",
                name="Demo User",
                plan="free",
                is_admin=True,
                is_active=True
            )
            user.set_password("demo123")
            db.session.add(user)
            db.session.flush()
            
            # Asignar rol SUPERADMIN al usuario demo
            if "SUPERADMIN" in roles_map:
                user_role = UserRole(
                    user_id=user.id,
                    role_id=roles_map["SUPERADMIN"].id
                )
                db.session.add(user_role)
                print("[SEED] Assigned SUPERADMIN role to demo@cuaderno.app")
            
            # Create business
            business = Business(
                user_id=user.id,
                name="Yogurt Griego Premium",
                currency="COP",
                timezone="America/Bogota"
            )
            db.session.add(business)
            db.session.flush()
            
            # Create products
            products_data = [
                {"name": "Yogurt Griego 500g", "sku": "YG-500G", "price": 12000, "cost": 6000, "unit": "und"},
                {"name": "Yogurt Griego 1000g", "sku": "YG-1000G", "price": 20000, "cost": 10000, "unit": "und"},
                {"name": "Promo 2x1000g", "sku": "PROMO-2X1K", "price": 36000, "cost": 18000, "unit": "und"},
                {"name": "Yogurt Familiar 2000g", "sku": "YG-FAM2K", "price": 35000, "cost": 17000, "unit": "und"},
                {"name": "Copa de Frutas", "sku": "COPA-FRUT", "price": 15000, "cost": 7000, "unit": "und"},
            ]
            
            products = []
            for p in products_data:
                product = Product(business_id=business.id, **p)
                db.session.add(product)
                products.append(product)
            
            db.session.flush()
            
            # Create customers
            customers_data = [
                {"name": "María García", "phone": "3001234567", "address": "Calle 10 #5-20"},
                {"name": "Juan López", "phone": "3109876543", "address": "Carrera 15 #8-30"},
                {"name": "Ana Martínez", "phone": "3154567890", "address": "Avenida 5 #12-45"},
                {"name": "Carlos Rodríguez", "phone": "3201234987", "address": "Calle 20 #3-15"},
            ]
            
            customers = []
            for c in customers_data:
                customer = Customer(business_id=business.id, **c)
                db.session.add(customer)
                customers.append(customer)
            
            db.session.flush()
            
            # Create sales
            today = date.today()
            
            sales_data = [
                {"customer": customers[0], "items": [products[0], products[2]], "total": 48000, "payment_method": "cash", "paid": True},
                {"customer": customers[1], "items": [products[1]], "total": 20000, "payment_method": "transfer", "paid": True},
                {"customer": customers[2], "items": [products[3], products[4]], "total": 50000, "payment_method": "credit", "paid": False},
                {"customer": None, "items": [products[0], products[0]], "total": 24000, "payment_method": "cash", "paid": True},
            ]
            
            for i, s in enumerate(sales_data):
                sale_date = today - timedelta(days=i)
                sale = Sale(
                    business_id=business.id,
                    customer_id=s["customer"].id if s["customer"] else None,
                    sale_date=sale_date,
                    items=[{
                        "product_id": p.id,
                        "name": p.name,
                        "qty": 1,
                        "unit_price": p.price,
                        "total": p.price
                    } for p in s["items"]],
                    subtotal=s["total"],
                    discount=0,
                    total=s["total"],
                    payment_method=s["payment_method"],
                    paid=s["paid"]
                )
                db.session.add(sale)
            
            # Create expenses
            expenses_data = [
                {"category": "Servicios", "amount": 150000, "description": "Agua mes anterior"},
                {"category": "Servicios", "amount": 250000, "description": "Luz mes anterior"},
                {"category": "Inventario", "amount": 500000, "description": "Leche fresca"},
                {"category": "Mantenimiento", "amount": 80000, "description": "Limpieza equipos"},
            ]
            
            for i, e in enumerate(expenses_data):
                expense = Expense(
                    business_id=business.id,
                    expense_date=today - timedelta(days=i),
                    **e
                )
                db.session.add(expense)
            
            db.session.commit()
            
            print("[SEED] Seed data loaded successfully!")
            print(f"   - User: demo@cuaderno.app / demo123")
            print(f"   - Business: {business.name}")
            print(f"   - Products: {len(products_data)}")
            print(f"   - Customers: {len(customers_data)}")
            print(f"   - Sales: {len(sales_data)}")
            print(f"   - Expenses: {len(expenses_data)}")


if __name__ == "__main__":
    seed_data()
