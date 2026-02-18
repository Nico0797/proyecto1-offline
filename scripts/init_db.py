#!/usr/bin/env python
# Cuaderno - Database Initialization Script
# ============================================
"""
Script para inicializar la base de datos
"""
import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import db
from backend.main import create_app


def init_database():
    """Inicializar base de datos"""
    print("Initializing database...")
    
    app = create_app()
    
    with app.app_context():
        # Create all tables
        db.create_all()
        print("Tables created successfully!")
        
    print("Database initialization complete!")


if __name__ == "__main__":
    init_database()
