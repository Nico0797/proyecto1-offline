# Backend Operations

## Objetivo

Guía mínima para operar el backend sin romper staging/producción.

## Variables obligatorias en staging/producción

- `APP_ENV=staging` o `APP_ENV=production`
- `DATABASE_URL` con PostgreSQL real
- `SECRET_KEY` fuerte y no default
- `JWT_SECRET_KEY` fuerte y distinto de `SECRET_KEY`
- `CLIENT_URL` real
- `CORS_ORIGINS` con orígenes reales permitidos

## Flags sensibles

Estos flags deben permanecer en `false` en staging/producción:

- `ALLOW_SQLITE_FALLBACK`
- `ALLOW_RUNTIME_SCHEMA_MUTATIONS`
- `ALLOW_STARTUP_DATA_BOOTSTRAP`

Si `ALLOW_STARTUP_DATA_BOOTSTRAP=true`, también debes definir `ADMIN_PASSWORD` explícitamente.

## Checks disponibles

- `GET /api/health`
  - liveness
  - confirma que el proceso HTTP está arriba
- `GET /api/ready`
  - readiness
  - confirma conectividad básica con base de datos
- `GET /api/readiness`
  - alias de readiness

## Arranque local

### Backend local directo

```bash
python backend/main.py
```

### Docker Compose local

```bash
docker compose up --build
```

Compose está configurado para entorno local seguro (`development`), no para staging/producción.

## Arranque staging/producción

### Docker

```bash
docker build -t encaja-app .
docker run -p 8000:8000 \
  -e APP_ENV=production \
  -e DATABASE_URL="postgresql://..." \
  -e SECRET_KEY="..." \
  -e JWT_SECRET_KEY="..." \
  -e CLIENT_URL="https://app.tudominio.com" \
  -e CORS_ORIGINS="https://app.tudominio.com" \
  encaja-app
```

### Gunicorn

El contenedor arranca con:

- `gunicorn.conf.py`
- `wsgi:app`

Variables operativas disponibles:

- `PORT`
- `GUNICORN_WORKERS`
- `GUNICORN_THREADS`
- `GUNICORN_TIMEOUT`
- `GUNICORN_GRACEFUL_TIMEOUT`
- `GUNICORN_KEEPALIVE`
- `GUNICORN_MAX_REQUESTS`
- `GUNICORN_MAX_REQUESTS_JITTER`
- `LOG_LEVEL`

## Smoke test predeploy/postdeploy

### Remoto por base URL

```bash
python scripts/smoke_test_backend.py \
  --mode base-url \
  --base-url http://127.0.0.1:5000 \
  --email admin@cuaderno.app \
  --password TU_PASSWORD
```

### In-process con test client

```bash
python scripts/smoke_test_backend.py \
  --mode test-client \
  --email admin@cuaderno.app \
  --password TU_PASSWORD
```

El smoke test valida, en orden:

- `health`
- `ready` (si no se omite)
- `business_profile`
- `login`
- `select-context` cuando aplica
- `dashboard-summary`

## Verificación Alembic / esquema

```bash
python scripts/check_alembic_state.py
python scripts/check_schema_alignment.py
```

Para reconciliación controlada:

```bash
python scripts/reconcile_alembic_state.py --apply
```

## Benchmark autenticado reproducible

```bash
python scripts/profile_dashboard_endpoints.py --mode test-client --email TU_EMAIL --password TU_PASSWORD
```

## Flujo recomendado antes de deploy

1. Verificar variables críticas
2. Ejecutar `check_alembic_state.py`
3. Ejecutar `check_schema_alignment.py`
4. Ejecutar `smoke_test_backend.py`
5. Si necesitas validar dashboard crítico, correr `profile_dashboard_endpoints.py`

## Flujo recomendado después de deploy

1. `GET /api/health`
2. `GET /api/ready`
3. Ejecutar `smoke_test_backend.py --mode base-url --base-url <url>`
4. Confirmar login + contexto + dashboard-summary + business_profile

## Señales de fallo que deben bloquear deploy

- backend arranca con `DEBUG=true` en staging/producción
- `DATABASE_URL` inválida o fallback SQLite no deseado
- `SECRET_KEY` o `JWT_SECRET_KEY` débiles/default
- `CORS_ORIGINS` vacío, local-only o `*` con credenciales en staging/producción
- readiness fallando
- smoke test autenticado fallando
