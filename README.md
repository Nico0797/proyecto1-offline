# EnCaja - Cuaderno Contable Digital

Plataforma completa para la gestión de pequeños negocios, ventas, gastos e inventario.

## Arquitectura

*   **Backend**: Python Flask (API REST + Static Serving)
*   **Frontend**: React + Tailwind (Vite)
*   **Mobile**: Capacitor (Android/iOS)
*   **Database**: PostgreSQL / SQLite (Dev)

## Estructura del Proyecto

*   `/backend`: Código fuente del servidor API.
*   `/frontend-react`: Código fuente de la aplicación web (SPA).
*   `/android`: Proyecto nativo Android (Capacitor).
*   `Dockerfile`: Configuración para despliegue en producción.
*   `docker-compose.yml`: Entorno de desarrollo local con base de datos.

## Guía de Desarrollo

### 1. Backend + Frontend (Local)

La forma más sencilla es usar Docker Compose:

```bash
docker compose up --build
```

La aplicación estará disponible en `http://localhost:8000`.

### 2. Desarrollo Frontend (Live Reload)

Si necesitas iterar rápido en la UI:

```bash
cd frontend-react
npm install
npm run dev
```

### 3. Aplicación Móvil (Android)

Para generar la APK o correr en emulador:

1.  **Construir Frontend**:
    ```bash
    cd frontend-react
    npm run build
    ```

2.  **Sincronizar Capacitor**:
    ```bash
    # Desde la raíz del proyecto
    npx cap sync android
    ```

3.  **Abrir en Android Studio**:
    ```bash
    npx cap open android
    ```

## Despliegue en Producción

El proyecto está configurado para construir una imagen Docker única que contiene tanto el backend como el frontend compilado.

```bash
docker build -t encaja-app .
docker run -p 8000:8000 -e DATABASE_URL="..." encaja-app
```

### Operacional Hardening

Para asegurar la seguridad y estabilidad de la aplicación en producción, se recomienda seguir los siguientes pasos:

*   **Pruebas de humo**: Después de desplegar la aplicación, ejecutar pruebas de humo para asegurarse de que la aplicación esté funcionando correctamente.
*   **Verificación de Alembic**: Verificar que las migraciones de la base de datos se hayan aplicado correctamente utilizando Alembic.

## Limpieza

El frontend legacy (HTML/Bootstrap) ha sido eliminado completamente en favor de la nueva arquitectura React.
