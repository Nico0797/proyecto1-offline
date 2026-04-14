# EnCaja

Aplicacion contable productiva con una sola base de frontend en [`frontend-react`](c:\Users\harae\Desktop\offline app\proyecto1\frontend-react).

## Arquitectura soportada

- Backend real: [`backend/main.py`](c:\Users\harae\Desktop\offline app\proyecto1\backend\main.py)
- Frontend base unico: [`frontend-react`](c:\Users\harae\Desktop\offline app\proyecto1\frontend-react)
- Web productiva: mismo frontend con backend remoto
- Desktop offline oficial: Tauri sobre el mismo frontend real en [`frontend-react/src-tauri`](c:\Users\harae\Desktop\offline app\proyecto1\frontend-react\src-tauri)
- Persistencia local offline: IndexedDB desde el frontend real

No existe una segunda app soportada para offline. La rama `proyecto1-offline/apps/mobile-offline` queda fuera del flujo del producto.

## Desarrollo web

```bash
cd frontend-react
npm install
npm run dev
```

## Build web

```bash
cd frontend-react
npm install
npm run build
```

## Desktop offline

Desarrollo desktop:

```bash
cd frontend-react
npm install
npm run desktop:dev
```

Build desktop para Windows:

```bash
cd frontend-react
npm install
npm run desktop:build
```

El contenedor desktop usa `frontend-react/dist` como salida compilada del mismo frontend productivo.

## Mobile

```bash
cd frontend-react
npm install
npm run build
cd ..
npx cap sync android
```
