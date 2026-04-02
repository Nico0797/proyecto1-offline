
# Entorno local oficial de desarrollo

El entorno local oficial usa un único backend y un único puerto para evitar `502` y ambigüedad entre entrypoints.

## Fuente de verdad local

- **Backend oficial**: `backend/main.py`
- **Puerto oficial**: `5000`
- **Proxy del frontend**: `frontend-react/vite.config.ts` con `'/api' -> 'http://127.0.0.1:5000'`
- **Health check**: `GET /api/health`

## Entry points locales

1. **Oficial para desarrollo local**
   - `python backend/main.py`
   - o `start_backend.bat`

2. **Alineado pero no recomendado como arranque principal**
   - `python wsgi.py`
   - usa el mismo puerto `5000` cuando se ejecuta localmente

3. **Legacy / mock**
   - `python server.py`
   - mantiene `8001`
   - no debe usarse para login ni para el frontend React local

## Cambios realizados

1. **Puerto oficial unificado**: `backend/main.py` y `wsgi.py` quedan alineados a **5000** para desarrollo local.
2. **Proxy del frontend**: `vite.config.ts` apunta a **`http://127.0.0.1:5000`**.
3. **Script de backend robusto**: `start_backend.bat` usa `.venv` si existe y fija `APP_ENV=dev`, `FLASK_ENV=development`, `PORT=5000`.
4. **Health check**: `GET /api/health` permite verificar inmediatamente que el backend correcto está arriba.
5. **Legacy explícito**: `server.py` queda fuera del flujo local principal y se identifica como servidor legacy/mock.

## Cómo iniciar la aplicación correctamente

Sigue estos pasos desde cero:

1. **Detener procesos actuales**
   - Cierra terminales viejas de `python`, `flask` o `npm` si quedaron abiertas.

2. **Iniciar Backend**
   - Ejecuta `start_backend.bat`
   - Verás un log indicando que el backend local oficial corre en `http://127.0.0.1:5000`

3. **Verificar health**
   - Abre `http://127.0.0.1:5000/api/health`
   - Debe responder JSON con `status: ok`

4. **Iniciar Frontend**
   - Ejecuta `start_frontend.bat`
   - Vite debe iniciar en `http://localhost:5173`

5. **Probar login**
   - Abre `http://localhost:5173`
   - Inicia sesión normalmente
   - Las peticiones `/api/*` pasarán por Vite hacia `127.0.0.1:5000`

## Verificación técnica mínima

- Backend directo:
  - `GET http://127.0.0.1:5000/api/health`
  - `POST http://127.0.0.1:5000/api/auth/login`
- Frontend vía proxy:
  - `POST http://127.0.0.1:5173/api/auth/login`

Si aparece un `502`, verifica primero que `backend/main.py` siga escuchando en `5000`. Si `5000` no responde, el problema está en el backend, no en `API_BASE_URL`.
