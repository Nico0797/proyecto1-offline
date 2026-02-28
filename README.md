# Cuaderno - App Contable para Negocios Informales

## 📋 Índice

1. [Descripción del Producto](#descripción-del-producto)
2. [Arquitectura Técnica](#arquitectura-técnica)
3. [Estructura del Proyecto](#estructura-del-proyecto)
4. [Mapa de Pantallas UI](#mapa-de-pantallas-ui)
5. [Mapa de Endpoints REST](#mapa-de-endpoints-rest)
6. [Modelo de Datos](#modelo-de-datos)
7. [Autenticación y Seguridad](#autenticación-y-seguridad)
8. [Monetización y Planes](#monetización-y-planes)
9. [Guía de Instalación](#guía-de-instalación)
10. [Guía de Deploy](#guía-de-deploy)

---

## 1. Descripción del Producto

**Cuaderno** es una aplicación web contable diseñada para negocios informales (tiendas, comidas, servicios, ventas por WhatsApp, emprendimientos familiares) que no usan software contable formal.

### Propuesta de Valor
- ✅ Registro rápido de ventas, gastos, abonos, clientes y productos
- ✅ Caja del día (entradas/salidas), saldo y utilidad estimada
- ✅ Cuentas por cobrar (quién debe, cuánto, desde cuándo)
- ✅ Resúmenes por día/semana/mes
- ✅ Exportación a Excel/CSV y respaldo
- ✅ UX extremadamente simple (móvil primero)
- ✅ Preparada para monetizar con freemium

### Segmento Objetivo
- Tiendas de barrio
- Restaurantes y cafeterías
- Servicios profesionales independientes
- Vendedores por WhatsApp
- Emprendimientos familiares
- Mercados locales

---

## 2. Arquitectura Técnica

### Stack Elegido

| Componente | Tecnología | Justificación |
|------------|-------------|---------------|
| **Backend** | Python Flask + SQLAlchemy | Simple, rápido de desarrollar, bajo costo de hosting |
| **DB Local** | SQLite | Sin configuración, ideal para MVP |
| **DB Prod** | PostgreSQL | Robusta, escalable (preparado para producción) |
| **Frontend** | HTML + Tailwind CSS + Vanilla JS | Sin build step, rápido, mantenible |
| **Export** | openpyxl | Biblioteca robusta para Excel |
| **Auth** | JWT + bcrypt | Estándar industry, seguro |
| **Deploy** | Docker + Railway/Render | Low-cost, fácil configuración |

### Por qué este stack?
1. **Velocidad de desarrollo**: Flask es mínimo y flexible
2. **Costo**: SQLite es gratis, PostgreSQL tiene tier gratuito
3. **Mantenibilidad**: Vanilla JS sin frameworks complejos
4. **Escalabilidad**: Preparado para migrar a PostgreSQL
5. **Monetización**: Estructura lista para implementar pagos

---

## 3. Estructura del Proyecto

```
cuaderno/
├── README.md                    # Este archivo
├── .env.example                 # Variables de entorno ejemplo
├── requirements.txt             # Dependencias Python
├── pyproject.toml              # Configuración proyecto
├── Dockerfile                  # Imagen Docker
├── docker-compose.yml          # Orquestación Docker
├── .gitignore                  # Archivos ignorados
│
├── backend/
│   ├── __init__.py
│   ├── config.py               # Configuración app
│   ├── database.py            # Conexión DB
│   ├── models.py              # Modelos SQLAlchemy
│   ├── schemas.py             # Schemas validación
│   ├── auth.py                # Autenticación JWT
│   ├── services/
│   │   ├── __init__.py
│   │   ├── business.py        # Lógica negocio
│   │   ├── sales.py          # Lógica ventas
│   │   ├── reports.py        # Reportes y cálculos
│   │   └── export.py         # Exportación Excel
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py         # Rutas principales
│   │   ├── auth.py           # Rutas auth
│   │   ├── businesses.py     # Rutas negocios
│   │   ├── products.py      # Rutas productos
│   │   ├── customers.py     # Rutas clientes
│   │   ├── sales.py         # Rutas ventas
│   │   ├── expenses.py      # Rutas gastos
│   │   ├── payments.py      # Rutas pagos
│   │   ├── reports.py       # Rutas reportes
│   │   └── export.py        # Rutas exportación
│   └── main.py               # Entry point
│
├── frontend/
│   ├── index.html            # SPA entry point
│   ├── css/
│   │   └── styles.css        # Estilos globales
│   ├── js/
│   │   ├── app.js            # Router y app principal
│   │   ├── api.js            # Cliente API
│   │   ├── auth.js           # Manejo auth
│   │   ├── router.js         # SPA router
│   │   ├── pages/
│   │   │   ├── login.js      # Página login
│   │   │   ├── register.js  # Página registro
│   │   │   ├── dashboard.js # Dashboard
│   │   │   ├── products.js  # CRUD productos
│   │   │   ├── customers.js # CRUD clientes
│   │   │   ├── sales.js     # CRUD ventas
│   │   │   ├── expenses.js  # CRUD gastos
│   │   │   ├── payments.js  # CRUD pagos
│   │   │   ├── reports.js   # Reportes
│   │   │   ├── settings.js  # Configuración negocio
│   │   │   └── pricing.js   # Planes y pricing
│   │   └── components/
│   │       ├── navbar.js     # Navbar
│   │       ├── modal.js      # Modal genérico
│   │       ├── table.js      # Tabla genérica
│   │       └── form.js       # Formularios
│   └── assets/
│       └── logo.png          # Logo
│
├── scripts/
│   ├── init_db.py            # Inicializar DB
│   ├── seed.py              # Datos ejemplo
│   └── test_api.py          # Tests básicos
│
└── tests/
    ├── __init__.py
    ├── test_auth.py         # Tests auth
    ├── test_sales.py       # Tests ventas
    ├── test_reports.py     # Tests reportes
    └── test_export.py      # Tests exportación
```

---

## 4. Mapa de Pantallas UI

### Flujo de Usuario

```
┌─────────────────────────────────────────────────────────────────┐
│                        PÚBLICO                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   ┌──────────┐         ┌──────────┐                           │
│   │   Login  │────────▶│Registro  │                           │
│   └──────────┘         └──────────┘                           │
│         │                     │                                 │
│         ▼                     ▼                                 │
│   ┌──────────────────────────────────┐                         │
│   │         ONBOARDING               │                         │
│   │   "Crea tu primer negocio"       │                         │
│   └──────────────────────────────────┘                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     APP PRINCIPAL                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐  │
│  │  NAVBAR: Logo | Dashboard | Ventas | Gastos | Clientes │  │
│  │          | Productos | Reportes | [Negocio] | [Usuario] │  │
│  └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Dashboard  │ │  Ventas    │ │  Gastos    │ │ Clientes   │  │
│  │            │ │            │ │            │ │            │  │
│  │ • Caja Hoy │ │ • Nueva    │ │ • Nuevo    │ │ • Lista    │  │
│  │ • Caja Mes │ │ • Historial│ │ • Historial│ │ • Deudores │  │
│  │ • Ventas   │ │ • Fiada    │ │ • Categoría│ │ • Abonos   │  │
│  │ • Gastos   │ │            │ │            │ │            │  │
│  │ • Utilidad │ │            │ │            │ │            │  │
│  │ • Top Prod │ │            │ │            │ │            │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                                                                 │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐  │
│  │ Productos  │ │ Reportes  │ │ Config     │ │ Pricing    │  │
│  │            │ │            │ │            │ │            │  │
│  │ • Lista    │ │ • Diario   │ │ • Negocio  │ │ • Free     │  │
│  │ • Nuevo    │ │ • Semanal  │ │ • Moneda   │ │ • Pro      │  │
│  │ • Editar   │ │ • Mensual  │ │ • Backup   │ │ • Upsells  │  │
│  │            │ │ • Exportar │ │ • Importar │ │            │  │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Detalle de Pantallas

| Página | Ruta | Descripción |
|--------|------|-------------|
| Login | `/login` | Formulario email/password |
| Registro | `/register` | Registro nuevo usuario |
| Dashboard | `/` | Resumen caja, ventas, gastos, utilidad |
| Ventas | `/sales` | Nueva venta, historial, filtro |
| Gastos | `/expenses` | Nuevo gasto, historial por categoría |
| Clientes | `/customers` | Lista, crear, editar, cuenta corriente |
| Productos | `/products` | Catálogo productos/servicios |
| Pagos | `/payments` | Registrar abonos a cuenta |
| Reportes | `/reports` | Resúmenes por periodo, exportar |
| Configuración | `/settings` | Datos negocio, moneda, backup |
| Pricing | `/pricing` | Planes Free/Pro, upgrades |

---

## 5. Mapa de Endpoints REST

### Autenticación
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/api/auth/register` | Registrar usuario |
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/refresh` | Refrescar token |
| POST | `/api/auth/logout` | Cerrar sesión |
| POST | `/api/auth/forgot-password` | Solicitar reset |
| POST | `/api/auth/reset-password` | Resetear password |

### Negocios
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/businesses` | Listar negocios usuario |
| POST | `/api/businesses` | Crear negocio |
| GET | `/api/businesses/:id` | Ver negocio |
| PUT | `/api/businesses/:id` | Actualizar negocio |
| DELETE | `/api/businesses/:id` | Eliminar negocio |

### Productos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/businesses/:id/products` | Listar productos |
| POST | `/api/businesses/:id/products` | Crear producto |
| GET | `/api/businesses/:id/products/:pid` | Ver producto |
| PUT | `/api/businesses/:id/products/:pid` | Actualizar producto |
| DELETE | `/api/businesses/:id/products/:pid` | Eliminar producto |

### Clientes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/businesses/:id/customers` | Listar clientes |
| POST | `/api/businesses/:id/customers` | Crear cliente |
| GET | `/api/businesses/:id/customers/:cid` | Ver cliente |
| PUT | `/api/businesses/:id/customers/:cid` | Actualizar cliente |
| DELETE | `/api/businesses/:id/customers/:cid` | Eliminar cliente |
| GET | `/api/businesses/:id/customers/debtors` | Clientes con deuda |

### Ventas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/businesses/:id/sales` | Listar ventas |
| POST | `/api/businesses/:id/sales` | Crear venta |
| GET | `/api/businesses/:id/sales/:sid` | Ver venta |
| DELETE | `/api/businesses/:id/sales/:sid` | Eliminar venta |
| GET | `/api/businesses/:id/sales/unpaid` | Ventas fiadas |

### Gastos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/businesses/:id/expenses` | Listar gastos |
| POST | `/api/businesses/:id/expenses` | Crear gasto |
| GET | `/api/businesses/:id/expenses/:eid` | Ver gasto |
| PUT | `/api/businesses/:id/expenses/:eid` | Actualizar gasto |
| DELETE | `/api/businesses/:id/expenses/:eid` | Eliminar gasto |

### Pagos/Abonos
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/businesses/:id/payments` | Listar pagos |
| POST | `/api/businesses/:id/payments` | Registrar pago |
| GET | `/api/businesses/:id/payments/:pid` | Ver pago |
| GET | `/api/businesses/:id/customers/:cid/balance` | Balance cliente |

### Reportes
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/businesses/:id/reports/daily` | Reporte diario |
| GET | `/api/businesses/:id/reports/weekly` | Reporte semanal |
| GET | `/api/businesses/:id/reports/monthly` | Reporte mensual |
| GET | `/api/businesses/:id/reports/summary` | Resumen general |
| GET | `/api/businesses/:id/reports/top-products` | Productos top |
| GET | `/api/businesses/:id/reports/top-customers` | Clientes top |

### Exportación/Backup
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/businesses/:id/export/sales` | Exportar ventas Excel |
| GET | `/api/businesses/:id/export/expenses` | Exportar gastos Excel |
| GET | `/api/businesses/:id/export/customers` | Exportar clientes Excel |
| GET | `/api/businesses/:id/backup` | Descargar backup JSON |
| POST | `/api/businesses/:id/restore` | Restaurar backup JSON |

### Sistema
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/ping` | Ping simple |

---

## 6. Modelo de Datos

### Tablas Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                   │
├─────────────────────────────────────────────────────────────────┤
│ id          INTEGER PRIMARY KEY                                  │
│ email       VARCHAR(255) UNIQUE NOT NULL                        │
│ password    VARCHAR(255) NOT NULL (hashed)                     │
│ name        VARCHAR(255) NOT NULL                               │
│ plan        VARCHAR(20) DEFAULT 'free'                          │
│ created_at  DATETIME DEFAULT CURRENT_TIMESTAMP                  │
│ updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       BUSINESSES                                │
├─────────────────────────────────────────────────────────────────┤
│ id          INTEGER PRIMARY KEY                                  │
│ user_id     INTEGER FOREIGN KEY REFERENCES users(id)            │
│ name        VARCHAR(255) NOT NULL                                │
│ currency    VARCHAR(10) DEFAULT 'COP'                           │
│ timezone    VARCHAR(50) DEFAULT 'America/Bogota'                │
│ settings    JSONB DEFAULT '{}'                                  │
│ created_at  DATETIME DEFAULT CURRENT_TIMESTAMP                  │
│ updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1:N
                              ▼
┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│   PRODUCTS    │  │   CUSTOMERS    │  │    SALES       │
├────────────────┤  ├────────────────┤  ├────────────────┤
│ id             │  │ id             │  │ id             │
│ business_id    │  │ business_id    │  │ business_id    │
│ name           │  │ name           │  │ sale_date      │
│ sku            │  │ phone          │  │ customer_id    │
│ price          │  │ address        │  │ items (JSON)   │
│ cost           │  │ notes          │  │ total          │
│ unit           │  │ created_at     │  │ payment_method │
│ active         │  │                │  │ paid           │
│ created_at     │  │                │  │ created_at     │
└────────────────┘  └────────────────┘  └────────────────┘
                              │                    │
                              │ 1:N                │ N:1
                              ▼                    ▼
                     ┌────────────────┐  ┌────────────────┐
                     │    EXPENSES    │  │    PAYMENTS    │
                     ├────────────────┤  ├────────────────┤
                     │ id             │  │ id             │
                     │ business_id    │  │ business_id    │
                     │ expense_date   │  │ customer_id    │
                     │ category       │  │ payment_date   │
                     │ amount         │  │ amount         │
                     │ description    │  │ method         │
                     │ created_at     │  │ note           │
                     └────────────────┘  │ sale_id        │
                                         │ created_at     │
                                         └────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                     RELATIONS (Cuentas por Cobrar)              │
├─────────────────────────────────────────────────────────────────┤
│ 1 venta fiada (paid=0) genera 1 charge en ledger                │
│ 1 pago genera 1 payment en ledger + allocations               │
│                                                                 │
│ LEDGER                                                          │
├─────────────────────────────────────────────────────────────────┤
│ id          INTEGER PRIMARY KEY                                  │
│ business_id  INTEGER                                             │
│ customer_id  INTEGER                                             │
│ entry_type  VARCHAR(20) CHECK(entry_type IN ('charge','payment'))│
│ amount      REAL                                                 │
│ entry_date  DATE                                                 │
│ note        TEXT                                                 │
│ ref_type    VARCHAR(20) ('sale')                                 │
│ ref_id      INTEGER                                             │
│ created_at  DATETIME                                            │
│                                                                 │
│ LEDGER_ALLOCATIONS                                              │
├─────────────────────────────────────────────────────────────────┤
│ id          INTEGER PRIMARY KEY                                  │
│ payment_id  INTEGER (ledger)                                    │
│ charge_id   INTEGER (ledger)                                    │
│ amount      REAL                                                 │
│ created_at  DATETIME                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. Autenticación y Seguridad

### Flujo de Auth

```
1. Registro:
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ User     │────▶│ bcrypt   │────▶│ Save DB  │
   │ password │     │ hash     │     │ JWT      │
   └──────────┘     └──────────┘     └──────────┘

2. Login:
   ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ User     │────▶│ bcrypt   │────▶│ Validate │────▶│ JWT      │
   │ password │     │ compare  │     │ DB       │     │ Access   │
   └──────────┘     └──────────┘     └──────────┘     └──────────┘

3. Acceso API:
   ┌──────────┐     ┌──────────┐     ┌──────────┐
   │ Request  │────▶│ JWT      │────▶│ Business │
   │ + Token  │     │ Verify   │     │ Access   │
   └──────────┘     └──────────┘     └──────────┘
```

### Medidas de Seguridad

| Medida | Implementación |
|--------|----------------|
| Password hashing | bcrypt con salt |
| Tokens | JWT (access: 15min, refresh: 7 días) |
| CORS | Whitelist domains configurables |
| Rate limiting | 100 req/min por IP |
| SQL Injection | SQLAlchemy ORM (parametrized) |
| XSS | Sanitización HTML en frontend |
| CSRF | Token en headers |
| Data encryption | En producción (PostgreSQL) |

---

## 8. Monetización y Planes

### Planes

| Feature | Free | Pro |
|---------|------|-----|
| **Precio** | $0/mes | $9.99/mes |
| **Negocios** | 1 | Ilimitados |
| **Registros/mes** | 100 | Ilimitados |
| **Productos** | 20 | Ilimitados |
| **Clientes** | 10 | Ilimitados |
| **Exportación** | CSV básico | Excel completo |
| **Backup** | Manual | Automático |
| **Multi-usuario** | ❌ | ✅ |
| **Soporte** | Email | Priority |
| **Upsells** | - | - |

### Upsells (future)
- Reporte para contador (PDF formal)
- Recordatorios WhatsApp/Email
- Plantillas por tipo de negocio
- API access

### Implementación Técnica

```python
# Plan flags en usuario
{
    "plan": "free",  # free | pro
    "features": {
        "max_businesses": 1,
        "max_products": 20,
        "max_customers": 10,
        "export_formats": ["csv"],
        "auto_backup": False,
        "multi_user": False
    },
    "limits": {
        "records_per_month": 100,
        "storage_mb": 50
    }
}
```

---

## 9. Guía de Instalación

### Requisitos
- Python 3.11+
- Node.js 18+ (opcional, para desarrollo)
- Docker (opcional)

### Local sin Docker

```bash
# 1. Clonar y entrar al directorio
cd cuaderno

# 2. Crear entorno virtual
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# 3. Instalar dependencias
pip install -r requirements.txt

# 4. Copiar configuración
copy .env.example .env

# 5. Inicializar base de datos
python scripts/init_db.py

# 6. (Opcional) Cargar datos ejemplo
python scripts/seed.py

# 7. Ejecutar servidor
python -m backend.main
# O: flask --app backend.main run --reload

# 8. Abrir浏览器
http://localhost:5000
```

### Local con Docker

```bash
# 1. Construir imagen
docker build -t cuaderno .

# 2. Ejecutar contenedor
docker run -p 5000:5000 --env-file .env cuaderno

# O con docker-compose
docker-compose up --build
```

---

## 10. Guía de Deploy

### Railway (Recomendado)

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Iniciar proyecto
railway init

# 4. Agregar PostgreSQL
railway add postgresql

# 5. Deploy
railway up

# 6. Variables de entorno
railway variables set SECRET_KEY=your-secret-key
railway variables set FLASK_ENV=production
```

### Render

```bash
# 1. Conectar repo GitHub
# 2. Crear Web Service
# 3. Build command: pip install -r requirements.txt
# 4. Start command: gunicorn -w 4 -b 0.0.0.0:$PORT backend.main:app
# 5. Agregar PostgreSQL
```

### Fly.io

```bash
# 1. Instalar flyctl
winget install flyctl

# 2. Login
flyctl auth login

# 3. Launch
flyctl launch

# 4. Agregar DB
flyctl postgres create

# 5. Deploy
flyctl deploy
```

---

## Checklist de Producción

- [ ] Variables de entorno configuradas
- [ ] PostgreSQL en producción
- [ ] SSL/HTTPS habilitado
- [ ] Backup automático configurado
- [ ] Logs configurados (Sentry/opcional)
- [ ] Rate limiting activo
- [ ] CORS configurado para dominio producción
- [ ] Plan Free con límites activos
- [ ] Tests pasando (>80% coverage)
- [ ] Documentación actualizada

---

## Licencia

Copyright © 2026 EnCaja. Todos los derechos reservados.
Este software es propietario y confidencial. No se permite su distribución, copia o modificación sin autorización expresa.
