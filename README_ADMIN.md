# Panel de Administración (Migración React)

Este panel reemplaza al antiguo panel Bootstrap/HTML. Está construido con React + Tailwind y se integra directamente con el backend existente.

## Acceso

Ruta: `/admin`

Requiere que el usuario tenga el flag `is_admin=true` o el permiso `admin.*` en su rol.

## Características Migradas

1.  **Dashboard**: Métricas en tiempo real (Usuarios, Ingresos, Actividad).
2.  **Usuarios**: Gestión completa (CRUD), asignación de planes (Free/Pro) y roles.
3.  **Roles y Permisos**: Sistema flexible de roles (RBAC).
4.  **Banners**: Gestión de banners para la app principal (Login/Dashboard).
5.  **Precios**: Configuración de precios de planes y características.
6.  **Negocios**: Listado global de negocios y sus métricas.
7.  **FAQ**: Gestión de preguntas frecuentes (visible en `/help`).

## Integración con App Principal

*   **Banners**: Se muestran en el Dashboard principal (`src/components/Public/BannerCarousel.tsx`).
*   **Ayuda/FAQ**: Nueva sección `/help` accesible desde el sidebar.
*   **Precios**: Expuestos en API pública para la landing page (futuro).

## Configuración Backend

Se agregaron los siguientes modelos en `backend/models.py`:
*   `Banner`
*   `FAQ`
*   `AppSettings` (para configuración de precios)

Se agregaron endpoints en `backend/main.py` bajo `/api/admin/...`.

## Variables de Entorno

No se requieren variables nuevas específicas para el admin, usa la configuración existente de JWT y Base de Datos.

## Desarrollo

Para agregar nuevas secciones:
1.  Crear componente en `src/pages/Admin/`.
2.  Agregar ruta en `src/App.tsx` bajo el layout `AdminLayout`.
3.  Asegurar que el backend tenga el endpoint correspondiente con `@permission_required('admin.*')`.
