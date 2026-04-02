# Staging Release Checklist

## Alcance

Esta guía prepara y valida el backend para un despliegue controlado a staging usando los artefactos reales del repo:

- `Dockerfile`
- `gunicorn.conf.py`
- `wsgi.py`
- scripts operativos en `scripts/`

No asume Railway, Render, Heroku u otro proveedor específico. Si el proveedor exige comando, healthcheck, variables o puerto propios, aplícalos sobre esta base.

## 1. Predeploy

1. Confirmar variables críticas de staging.

```bash
APP_ENV=staging
DEBUG=false
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME
SECRET_KEY=<valor-fuerte-y-distinto>
JWT_SECRET_KEY=<valor-fuerte-y-distinto>
CLIENT_URL=https://staging.tu-dominio.com
CORS_ORIGINS=https://staging.tu-dominio.com
ALLOW_SQLITE_FALLBACK=false
ALLOW_RUNTIME_SCHEMA_MUTATIONS=false
ALLOW_STARTUP_DATA_BOOTSTRAP=false
LOG_LEVEL=INFO
PORT=8000
```

Resultado esperado:

- `DATABASE_URL` apunta a PostgreSQL real
- `SECRET_KEY` y `JWT_SECRET_KEY` no son default ni iguales
- los tres flags peligrosos están en `false`

2. Validar runtime config antes de desplegar.

```bash
python scripts/validate_runtime_config.py
```

Resultado esperado:

- exit code `0`
- JSON con `dangerous_flags=false`
- sin `RuntimeError`

Si falla:

- corregir variables de entorno
- no desplegar hasta que pase

3. Validar estado de Alembic.

```bash
python scripts/check_alembic_state.py
```

Resultado esperado:

- `alembic_version_table` coincide con `script_heads`
- `has_alembic_version=true`
- `has_business_profile=true`

Si falla:

- bloquear deploy
- revisar drift antes de continuar

4. Validar alineación mínima de esquema.

```bash
python scripts/check_schema_alignment.py
```

Resultado esperado:

- `business_profile_exists=true`
- `treasury_accounts_has_is_default=true`
- `payments_has_updated_at=true`
- `audit_logs_has_extended_columns=true`
- `invoice_payments_missing_columns=[]`

Si falla:

- bloquear deploy
- reconciliar esquema antes de continuar

5. Validar arranque/import seguro.

```bash
python -c "import backend.main; print('import backend.main ok')"
python -c "import wsgi; print('import wsgi ok')"
python -c "from backend.main import create_app; create_app(); print('create_app ok')"
```

Resultado esperado:

- exit code `0`
- no writes de bootstrap/admin en logs
- logs tipo:

```text
Startup data bootstrap disabled; no seed/admin writes will run during app startup.
```

6. Ejecutar smoke test local previo.

```bash
python scripts/smoke_test_backend.py --mode test-client --email TU_EMAIL --password TU_PASSWORD --business-id TU_BUSINESS_ID
```

Resultado esperado:

- `ok=True`
- `health=200`
- `readiness=200`
- `business_profile=200`
- `login=200`
- endpoint protegido `dashboard=200`

7. Benchmark rápido no bloqueante si quieres una señal operativa previa.

```bash
python scripts/profile_dashboard_endpoints.py --mode test-client --email TU_EMAIL --password TU_PASSWORD --business-id TU_BUSINESS_ID --repetitions 1 --endpoints dashboard,reports-summary,reports-daily
```

Resultado esperado:

- todos los endpoints en `200`
- sin errores de auth/contexto

8. Confirmar que bootstrap manual **no** será ejecutado salvo intención explícita.

No correr esto en un deploy normal:

```bash
python scripts/run_startup_bootstrap.py
```

Solo usarlo si realmente buscas seed/bootstrap manual y dejando:

```bash
ALLOW_STARTUP_DATA_BOOTSTRAP=true
ADMIN_PASSWORD=<valor-explicito>
```

## 2. Deploy

### Opción base con Docker local o proveedor que consume Dockerfile

Build:

```bash
docker build -t cuaderno-staging .
```

Run:

```bash
docker run --rm -p 8000:8000 \
  -e APP_ENV=staging \
  -e DEBUG=false \
  -e DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME" \
  -e SECRET_KEY="<secret-fuerte>" \
  -e JWT_SECRET_KEY="<jwt-secret-fuerte-y-distinto>" \
  -e CLIENT_URL="https://staging.tu-dominio.com" \
  -e CORS_ORIGINS="https://staging.tu-dominio.com" \
  -e ALLOW_SQLITE_FALLBACK=false \
  -e ALLOW_RUNTIME_SCHEMA_MUTATIONS=false \
  -e ALLOW_STARTUP_DATA_BOOTSTRAP=false \
  -e LOG_LEVEL=INFO \
  -e PORT=8000 \
  cuaderno-staging
```

### Comando real de arranque dentro del contenedor

```bash
gunicorn --config gunicorn.conf.py wsgi:app
```

### Resultado esperado en startup

- proceso arriba en el puerto configurado
- logs de runtime sanos
- sin `RuntimeError` de config
- sin writes de bootstrap/admin

Logs esperados:

```text
Runtime schema mutations disabled; expecting schema managed externally.
Startup data bootstrap disabled; no seed/admin writes will run during app startup.
```

## 3. Postdeploy

1. Validar liveness.

```bash
curl -fsS https://STAGING_URL/api/health
```

Esperado:

- HTTP `200`
- JSON con `status="ok"`

2. Validar readiness.

```bash
curl -fsS https://STAGING_URL/api/ready
curl -fsS https://STAGING_URL/api/readiness
```

Esperado:

- HTTP `200`
- JSON con `status="ready"`
- check de base de datos en `ok`

3. Validar login real.

```bash
curl -X POST https://STAGING_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"TU_EMAIL","password":"TU_PASSWORD"}'
```

Esperado:

- HTTP `200`
- `access_token`
- `active_context` o `accessible_contexts` utilizables

4. Si el usuario no trae contexto activo, validar `select-context`.

```bash
curl -X POST https://STAGING_URL/api/auth/select-context \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN" \
  -d '{"business_id": TU_BUSINESS_ID}'
```

Esperado:

- HTTP `200`
- nuevo `access_token` o contexto activo válido

5. Validar un endpoint protegido importante.

```bash
curl -fsS https://STAGING_URL/api/businesses/TU_BUSINESS_ID/dashboard \
  -H "Authorization: Bearer TU_TOKEN"
```

Esperado:

- HTTP `200`

6. Validar `business_profile` no destructivo.

```bash
curl -fsS https://STAGING_URL/api/business_profile
```

Esperado:

- HTTP `200`
- sin errores 500

7. Ejecutar smoke test remoto completo.

```bash
python scripts/smoke_test_backend.py \
  --mode base-url \
  --base-url https://STAGING_URL \
  --email TU_EMAIL \
  --password TU_PASSWORD \
  --business-id TU_BUSINESS_ID
```

Esperado:

- `ok=True`
- `health`, `readiness`, `business_profile`, `login`, `select_context` cuando aplique y endpoint protegido en `200`

8. Confirmar logs sanos de startup.

Buscar en logs:

```text
Runtime schema mutations disabled; expecting schema managed externally.
Startup data bootstrap disabled; no seed/admin writes will run during app startup.
```

Si `ALLOW_STARTUP_DATA_BOOTSTRAP=true`, el log esperado en arranque normal es:

```text
ALLOW_STARTUP_DATA_BOOTSTRAP is enabled, but bootstrap writes do not run during import/startup. Use scripts/run_startup_bootstrap.py for explicit bootstrap execution.
```

9. Confirmar ausencia de writes no deseados de bootstrap/admin.

No deberían aparecer logs como:

```text
Startup admin user created:
Startup admin user updated:
Assigned SUPERADMIN role to startup admin:
```

Si aparecen durante arranque normal:

- bloquear release
- revisar variables y comandos ejecutados

## 4. Rollback

### Caso 1: el backend no arranca

1. detener el release actual
2. redeploy de la imagen/revisión anterior estable
3. restaurar variables exactamente como estaban en la revisión previa
4. validar `/api/health` y `/api/ready`

### Caso 2: readiness falla

1. revertir a la revisión anterior
2. validar conectividad a `DATABASE_URL`
3. revisar si hubo drift de esquema o variables rotas
4. no insistir con la nueva revisión hasta corregir la causa

### Caso 3: login falla

1. ejecutar rollback a la revisión anterior
2. validar `SECRET_KEY`, `JWT_SECRET_KEY`, `CLIENT_URL`, `CORS_ORIGINS`
3. repetir smoke test remoto sobre la revisión anterior

### Caso 4: smoke test falla

1. identificar el primer paso fallido
2. si falla `health` o `ready`, rollback inmediato
3. si falla `login`, rollback inmediato
4. si falla endpoint protegido crítico, rollback salvo que haya una causa externa ya confirmada

### Caso 5: aparece problema de schema/alembic

1. congelar deploy
2. volver a la revisión anterior
3. correr `check_alembic_state.py` y `check_schema_alignment.py`
4. reconciliar antes de un nuevo intento

### Acción mínima de rollback

La acción mínima y realista es:

- **volver a la imagen/revisión anterior estable del backend**
- **mantener la base sin cambios manuales improvisados**
- **revalidar health/readiness/login/smoke**

## 5. Comandos de referencia rápida

Validación de runtime:

```bash
python scripts/validate_runtime_config.py
```

Estado Alembic:

```bash
python scripts/check_alembic_state.py
```

Alineación de esquema:

```bash
python scripts/check_schema_alignment.py
```

Smoke local:

```bash
python scripts/smoke_test_backend.py --mode test-client --email TU_EMAIL --password TU_PASSWORD --business-id TU_BUSINESS_ID
```

Smoke remoto:

```bash
python scripts/smoke_test_backend.py --mode base-url --base-url https://STAGING_URL --email TU_EMAIL --password TU_PASSWORD --business-id TU_BUSINESS_ID
```

Benchmark rápido:

```bash
python scripts/profile_dashboard_endpoints.py --mode test-client --email TU_EMAIL --password TU_PASSWORD --business-id TU_BUSINESS_ID --repetitions 1 --endpoints dashboard,reports-summary,reports-daily
```

Bootstrap manual explícito:

```bash
ALLOW_STARTUP_DATA_BOOTSTRAP=true ADMIN_PASSWORD='<valor-explicito>' python scripts/run_startup_bootstrap.py
```
