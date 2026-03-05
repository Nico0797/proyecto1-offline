#!/usr/bin/env python
# Cuaderno - Seed Data Script
# ============================================
"""
Script para cargar datos de ejemplo y datos RBAC iniciales
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.main import create_app
from backend.database import db
from backend.models import User, UserRole
# Import seed_rbac from the new location
from backend.seeds import seed_rbac

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
                # Check if role exists in roles_map (it returns roles objects)
                # roles_map values are Role objects which are attached to the session
                # We need to ensure they are bound or re-query if session closed (but we are in same context)
                role = roles_map["SUPERADMIN"]
                user_role = UserRole(
                    user_id=user.id,
                    role_id=role.id
                )
                db.session.add(user_role)
            
            db.session.commit()
            print("[SEED] Created demo user: demo@cuaderno.app / demo123")

if __name__ == "__main__":
    seed_data()
