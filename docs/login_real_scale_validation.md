# Validación LOGIN con 2 réplicas reales y CPU adicional

## Resumen

Este slice valida `LOGIN` sobre dos réplicas reales del backend con CPU adicional real. La meta es repetir el benchmark aprobado de `LOGIN` con la misma PostgreSQL y el mismo Redis, manteniendo `Gunicorn 4 workers x 1 thread` por réplica y colocando un balanceador mínimo delante de ambas réplicas.

## Diagnóstico

La validación previa demostró que `1 vs 2 vs 4` réplicas en el mismo host no mejora `LOGIN` porque el cuello sigue siendo CPU-bound por `password_verify` y cola/runtime. La base de datos no es el cuello dominante (`db_waiting_connections_peak = 0`, `db_active_connections_peak` bajo). La siguiente validación útil requiere dos réplicas con CPU adicional real, no más contenedores sobre el mismo CPU físico.

## Plan en pasos numerados

1. Construir una única imagen backend production-like.
2. Desplegar la réplica A en un host/VM con CPU dedicada o garantizada.
3. Desplegar la réplica B en otro host/VM con CPU dedicada o garantizada.
4. Mantener ambas réplicas contra la misma PostgreSQL y el mismo Redis.
5. Desplegar un balanceador Nginx mínimo delante de ambas réplicas.
6. Ejecutar smoke test contra el load balancer.
7. Ejecutar benchmark `LOGIN` para `20,40,60,80,100`.
8. Comparar explícitamente contra el baseline `1 réplica 4x1`.

## Arquitectura mínima de deploy recomendada

### Opción recomendada

- `VM/Host A`: backend réplica A
- `VM/Host B`: backend réplica B
- `VM/Host LB`: Nginx
- `PostgreSQL`: instancia actual compartida
- `Redis`: instancia actual compartida
- `Benchmark host`: máquina con este repo y acceso HTTP al LB; idealmente también acceso privado a PostgreSQL para métricas DB

### Requisitos mínimos por réplica

- Linux x86_64 o ARM64 con Docker Engine
- al menos `2 vCPU` reales por réplica
- memoria suficiente para `Gunicorn 4x1`
- acceso privado a PostgreSQL y Redis
- misma versión de imagen en ambas réplicas

### Balanceo mínimo correcto

- Nginx con `least_conn`
- upstreams directos a `replica-a:8000` y `replica-b:8000`
- timeouts de lectura/envío de `180s`
- health endpoint del LB en `/healthz`

## Cambios por archivo/configuración

### `deploy/login-real-scale/backend-replica.compose.yml`

Compose mínimo para levantar una réplica backend production-like con healthcheck.

### `deploy/login-real-scale/backend-replica.env.example`

Variables exactas para una réplica real:

- `APP_ENV=production`
- `GUNICORN_WORKERS=4`
- `GUNICORN_THREADS=1`
- `DATABASE_URL` compartida
- `REDIS_URL` compartida
- pool SQLAlchemy conservador por réplica (`8 + 4`)

### `deploy/login-real-scale/lb.compose.yml`

Compose mínimo para el balanceador Nginx.

### `deploy/login-real-scale/nginx.two-replicas.conf.template`

Template del balanceador para dos réplicas reales.

### `deploy/login-real-scale/run-login-benchmark.ps1`

Wrapper para correr el benchmark `LOGIN` contra el load balancer real.

## Cómo desplegar

### 1. Construir la imagen

Ejecutar en una máquina de build:

```bash
docker build -t encaja-login-real:latest .
```

Publicar esa imagen en un registry accesible por ambos hosts.

### 2. Preparar la réplica A

En `VM/Host A`:

1. Copiar `deploy/login-real-scale/backend-replica.compose.yml`
2. Copiar `deploy/login-real-scale/backend-replica.env.example` como `backend-replica.env`
3. Ajustar:
   - `APP_IMAGE`
   - `DATABASE_URL`
   - `REDIS_URL`
   - `SECRET_KEY`
   - `JWT_SECRET_KEY`
   - `CLIENT_URL`
   - `CORS_ORIGINS`
4. Definir nombre de contenedor, por ejemplo `encaja-login-real-a`
5. Levantar:

```bash
APP_IMAGE=registry.example.com/encaja-login-real:latest \
CONTAINER_NAME=encaja-login-real-a \
docker compose -f backend-replica.compose.yml up -d
```

### 3. Preparar la réplica B

Repetir el mismo procedimiento en `VM/Host B` con nombre `encaja-login-real-b`.

### 4. Verificar salud individual

En cada host:

```bash
curl http://127.0.0.1:8000/api/health
curl http://127.0.0.1:8000/api/ready
```

### 5. Desplegar el load balancer

En `VM/Host LB`:

1. Copiar `deploy/login-real-scale/lb.compose.yml`
2. Crear `nginx.conf` a partir de `nginx.two-replicas.conf.template`
3. Reemplazar:
   - `REPLICA_A_PRIVATE_IP`
   - `REPLICA_B_PRIVATE_IP`
4. Levantar:

```bash
docker compose -f lb.compose.yml up -d
```

### 6. Smoke test end-to-end

Desde el benchmark host o cualquier host con acceso HTTP al LB:

```powershell
.venv\Scripts\python.exe scripts\smoke_test_backend.py `
  --mode base-url `
  --base-url http://LB_PUBLIC_OR_PRIVATE_URL `
  --email qa.loadtest@cuaderno.local `
  --password qa-loadtest-123 `
  --business-id 2 `
  --json
```

## Cómo correr / probar

### Benchmark mínimo aprobado

Desde la máquina que ejecutará Locust:

```powershell
.\deploy\login-real-scale\run-login-benchmark.ps1 `
  -BaseUrl http://LB_PUBLIC_OR_PRIVATE_URL `
  -Email qa.loadtest@cuaderno.local `
  -Password qa-loadtest-123 `
  -BusinessId 2 `
  -Users 20,40,60,80,100 `
  -RunTime 2m `
  -SpawnRate 5 `
  -OutputDir load-tests\results\phase-auth-runtime-gunicorn-4x1-real2-full `
  -DatabaseUrl postgresql://READONLY_USER:READONLY_PASSWORD@DB_PRIVATE_HOST:5432/cuaderno
```

### Si el benchmark host no puede leer PostgreSQL directamente

Usar una de estas dos variantes:

1. Ejecutar el benchmark desde una máquina con acceso privado a PostgreSQL y pasar `-DatabaseUrl`
2. Ejecutarlo desde el host de DB o uno con acceso Docker al contenedor DB y usar:

```powershell
  -DockerDbContainer encaja-db -DockerDbUser postgres -DockerDbName cuaderno
```

### CPU por réplica

Si el benchmark corre desde un entorno con acceso Docker a ambas réplicas, añadir:

```powershell
  -DockerContainers encaja-login-real-a,encaja-login-real-b
```

Si cada réplica vive en un host distinto y no existe acceso Docker centralizado, medir CPU por réplica desde la métrica del proveedor o con `docker stats` local en cada host durante la prueba.

### Métricas obligatorias a revisar

- `avg_ms`
- `p95_ms`
- `failures`
- `auth.login wall_time_ms_avg`
- `auth.login sql_time_ms_avg`
- `auth.login python_time_ms_avg`
- `query_count_avg`
- `queue_gap_ms_avg`
- CPU por réplica si se puede medir
- `db_waiting_connections_peak`
- `db_active_connections_peak`

### Criterio de éxito

- reducción material de `avg_ms` y `p95_ms` en `40/60/80/100`
- reducción material de `queue_gap_ms_avg`
- sin subida relevante de `failures`
- evidencia clara de que CPU adicional real mejora `LOGIN`

## Riesgos / rollback

### Riesgos

- si ambas réplicas no tienen CPU realmente garantizada, la validación puede volver a mezclar cola e interferencia de vecinos
- si el benchmark se ejecuta sobre Internet pública, la latencia de red puede contaminar `avg/p95`
- si se sobredimensiona el pool SQLAlchemy por réplica, se puede inflar el total de conexiones sin necesidad

### Rollback

- apagar el LB
- apagar ambas réplicas
- volver al baseline de `1 réplica 4x1`
- no requiere cambios de código en `auth.login`

## Conclusión clara sobre el siguiente paso hacia 150

El siguiente paso mínimo correcto hacia `150` no es más tuning en el mismo host. Es validar `2` réplicas reales con CPU adicional real, mismas dependencias compartidas y el mismo benchmark `LOGIN`. Si esa validación reduce materialmente `avg/p95` y `queue_gap` en `40/60/80/100`, entonces `2` réplicas reales pasan a ser el nuevo baseline. Solo después de esa medición corresponde decidir si `2` bastan, si hace falta `4`, si conviene abrir `write.payment` o si existe argumento técnico real para tocar `bcrypt`.
