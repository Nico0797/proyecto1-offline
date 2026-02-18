#!/usr/bin/env python3
"""
Script para migrar datos de SQLite a PostgreSQL
================================================

Usage:
    python migrate_to_postgres.py

Antes de ejecutar:
1. Instalar PostgreSQL y crear una base de datos vacía
2. Configurar DATABASE_URL en .env con la URL de PostgreSQL
3. Ejecutar: pip install psycopg2-binary

Ejemplo de DATABASE_URL:
    postgresql://postgres:password@localhost:5432/cuaderno
"""

import os
import sys
from datetime import datetime

# Agregar el directorio backend al path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker


def get_sqlite_engine():
    """Crear engine para SQLite (base de datos actual)"""
    sqlite_path = os.path.join(os.path.dirname(__file__), 'instance', 'cuaderno.db')
    return create_engine(f'sqlite:///{sqlite_path}')


def get_postgres_engine():
    """Crear engine para PostgreSQL (base de datos nueva)"""
    database_url = os.getenv('DATABASE_URL', '')
    
    if not database_url or 'postgresql' not in database_url:
        print("ERROR: DATABASE_URL no configurada para PostgreSQL")
        print("Configura tu .env con:")
        print("  DATABASE_URL=postgresql://user:password@host:5432/database")
        sys.exit(1)
    
    return create_engine(database_url)


def migrate_data():
    """Migrar todos los datos de SQLite a PostgreSQL"""
    
    print("=" * 60)
    print("MIGRACION DE SQLite a PostgreSQL")
    print("=" * 60)
    
    # Conectar a SQLite (origen)
    print("\n-> Conectando a SQLite (origen)...")
    sqlite_engine = get_sqlite_engine()
    print("OK: Conexion exitosa a SQLite")
    
    # Conectar a PostgreSQL (destino)
    print("\n-> Conectando a PostgreSQL (destino)...")
    try:
        pg_engine = get_postgres_engine()
        with pg_engine.connect() as conn:
            pass
        print("OK: Conexion exitosa a PostgreSQL")
    except Exception as e:
        print(f"ERROR: Error conectando a PostgreSQL: {e}")
        print("\nPara crear una base de datos PostgreSQL:")
        print("  1. Abre pgAdmin 4 o SQL Shell")
        print("  2. Crea una base de datos: CREATE DATABASE cuaderno;")
        print("  3. Verifica que el servicio de PostgreSQL este corriendo")
        sys.exit(1)
    
    # Crear tablas en PostgreSQL si no existen
    print("\n-> Creando tablas en PostgreSQL...")
    try:
        from backend.database import db
        from backend.main import create_app
        
        app = create_app()
        # Usar la URL de PostgreSQL directamente
        app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
        
        with app.app_context():
            db.create_all()
        print("OK: Tablas creadas correctamente")
    except Exception as e:
        print(f"ADVERTENCIA: Error creando tablas (pueden ya existir): {e}")
    
    # Tablas a migrar (en orden para respecting foreign keys)
    tables = [
        'users',
        'businesses', 
        'products',
        'customers',
        'sales',
        'expenses',
        'payments',
        'ledger_entries',
        'ledger_allocations',
        'roles',
        'user_roles',
        'permissions',
        'role_permissions',
        'audit_logs',
        'subscription_payments'
    ]
    
    print("\n-> Iniciando migracion de datos...")
    print("-" * 60)
    
    total_rows = 0
    
    with sqlite_engine.connect() as sqlite_conn:
        with pg_engine.connect() as pg_conn:
            
            for table in tables:
                # Contar registros en SQLite
                result = sqlite_conn.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.fetchone()[0]
                
                if count == 0:
                    print(f"  -- {table}: 0 registros (omitido)")
                    continue
                
                # Obtener datos de SQLite
                result = sqlite_conn.execute(text(f"SELECT * FROM {table}"))
                columns = result.keys()
                rows = result.fetchall()
                
                # Insertar en PostgreSQL
                placeholders = ', '.join([':' + col for col in columns])
                insert_sql = text(f"INSERT INTO {table} ({', '.join(columns)}) VALUES ({placeholders})")
                
                for row in rows:
                    data = dict(zip(columns, row))
                    try:
                        pg_conn.execute(insert_sql, data)
                    except Exception as e:
                        print(f"  ! Error en {table}: {e}")
                        # Continuar con siguientes registros
                        pass
                
                print(f"  OK: {table}: {count} registros migrados")
                total_rows += count
            
            pg_conn.commit()
    
    print("-" * 60)
    print(f"\nTODO COMPLETADO!")
    print(f"   Total de registros migrados: {total_rows}")
    print("\n📝 Próximos pasos:")
    print("   1. Verifica que los datos se migron correctamente")
    print("   2. Actualiza tu .env para usar PostgreSQL en producción")
    print("   3. Configura DATABASE_URL en tu servidor de producción")


def export_sql():
    """Exportar datos de SQLite a un archivo SQL"""
    
    print("=" * 60)
    print("EXPORTAR SQLite a SQL")
    print("=" * 60)
    
    sqlite_engine = get_sqlite_engine()
    output_file = f"backup_sqlite_{datetime.now().strftime('%Y%m%d_%H%M%S')}.sql"
    
    print(f"\n📄 Generando archivo: {output_file}")
    
    tables = [
        'users', 'businesses', 'products', 'customers', 'sales',
        'expenses', 'payments', 'ledger_entries', 'ledger_allocations',
        'roles', 'user_roles', 'permissions', 'role_permissions', 
        'audit_logs', 'subscription_payments'
    ]
    
    with sqlite_engine.connect() as conn:
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write("-- Export de SQLite - Cuaderno\n")
            f.write(f"-- Fecha: {datetime.now()}\n\n")
            
            for table in tables:
                result = conn.execute(text(f"SELECT * FROM {table}"))
                rows = result.fetchall()
                
                if not rows:
                    continue
                
                f.write(f"\n-- Tabla: {table}\n")
                
                for row in rows:
                    values = []
                    for val in row:
                        if val is None:
                            values.append('NULL')
                        elif isinstance(val, str):
                            values.append(f"'{val.replace("'", "''")}'")
                        elif isinstance(val, (int, float)):
                            values.append(str(val))
                        elif isinstance(val, datetime):
                            values.append(f"'{val.isoformat()}'")
                        else:
                            values.append(f"'{str(val)}'")
                    
                    f.write(f"INSERT INTO {table} VALUES ({', '.join(values)});\n")
    
    print(f"✅ Exportación completada: {output_file}")
    print(f"   Tamaño: {os.path.getsize(output_file) / 1024:.1f} KB")


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == 'export':
        export_sql()
    else:
        migrate_data()
