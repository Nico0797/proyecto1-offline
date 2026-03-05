# Migración a Producción (React + Docker)

Este documento detalla los pasos para el cutover completo a la nueva interfaz React, dockerizada y lista para producción.

## 1. Arquitectura Nueva

*   **Frontend**: React + Tailwind (Vite). Se compila a estáticos (`dist/`) y es servido por el Backend.
*   **Backend**: Flask (Python). Sirve API (`/api/*`) y el Frontend (`/`).
*   **Database**: PostgreSQL (Dockerizado localmente, o servicio gestionado en prod).
*   **Contenedor**: Un solo contenedor `app` que contiene Backend + Frontend build.

## 2. Archivos de Infraestructura

*   `Dockerfile`: Build multi-stage.
    1.  Compila React (`node:18`).
    2.  Instala Python/Flask (`python:3.9`).
    3.  Copia el build de React a `/app/backend/static_dist`.
*   `docker-compose.yml`: Orquestación local.
    *   `app`: Puerto 8000.
    *   `db`: Postgres 15 (Persistencia en volumen `cuaderno-db-data`).

## 3. Comandos de Despliegue

### Local Development (Docker)

Levantar todo (Backend + Frontend Build + DB):

```bash
docker compose up --build
```

Acceder a: `http://localhost:8000`

### Producción (Build & Deploy)

1.  **Construir Imagen**:
    ```bash
    docker build -t encaja-app:latest .
    ```

2.  **Ejecutar (Ejemplo con Docker Run)**:
    ```bash
    docker run -d \
      -p 8000:8000 \
      -e DATABASE_URL="postgresql://user:pass@host:5432/dbname" \
      -e SECRET_KEY="prod-secret" \
      -e FLASK_ENV="production" \
      encaja-app:latest
    ```

## 4. Estado de Migración

*   **Frontend Legacy**: Movido a `frontend_legacy/`. Ya no es servido por defecto.
*   **Frontend Nuevo**: Se encuentra en `frontend-react/`.
*   **Backend**: Configurado para servir `frontend-react/dist` automáticamente si detecta la variable `APP_STATIC_DIR` (configurada en Docker) o si la carpeta existe.

## 5. Verificación

1.  Iniciar sesión en `http://localhost:8000/login` (Debe mostrar la nueva UI React).
2.  Probar `http://localhost:8000/admin` (Debe redirigir a `/admin/login`).
3.  Verificar que `/api/health` o endpoints similares respondan JSON.

## 6. Limpieza Final (Opcional)

Una vez validado en producción, se puede eliminar la carpeta `frontend_legacy/` de forma segura.
