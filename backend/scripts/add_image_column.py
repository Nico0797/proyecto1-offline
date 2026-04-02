import sys
import os

# Añadir el directorio padre al path para poder importar backend
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.main import app, db
from sqlalchemy import text

def add_image_column():
    with app.app_context():
        try:
            # Intentar añadir la columna image a la tabla products
            # Esto fallará si ya existe, así que lo envolvemos en try/except o verificamos antes
            # SQLite no soporta "ADD COLUMN IF NOT EXISTS" directamente en versiones viejas, 
            # pero SQLAlchemy puede ayudar. O simplemente ejecutamos raw SQL.
            
            # Verificar si la columna existe (PostgreSQL específico)
            result = db.session.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'products'")).fetchall()
            columns = [row[0] for row in result]
            
            if 'image' not in columns:
                print("Añadiendo columna 'image' a la tabla 'products'...")
                db.session.execute(text("ALTER TABLE products ADD COLUMN image TEXT"))
                db.session.commit()
                print("Columna añadida con éxito.")
            else:
                print("La columna 'image' ya existe.")
                
        except Exception as e:
            print(f"Error: {e}")
            db.session.rollback()

if __name__ == "__main__":
    add_image_column()
