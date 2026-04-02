# Protocolo de QA: Diferenciación de Cuentas (Free vs Empleado)

Este documento detalla los criterios de visualización y el checklist de verificación para asegurar que las subcuentas de empleado no vean opciones de actualización (upsell), mientras que las cuentas Free sí mantengan el flujo de conversión.

## Criterios de Visualización

### 1. Cuentas Free (Dueños)
*   **Objetivo:** Incentivar la actualización al plan Pro/Business.
*   **Comportamiento:**
    *   **Sidebar:** Ven items bloqueados (con candado) y pueden hacer clic para ver el modal de upgrade.
    *   **Banner:** Ven el banner "Actualizar a PRO" en la navegación.
    *   **Footer:** Ven la tarjeta promocional en la parte inferior del menú lateral.
    *   **ProGate:** Al intentar acceder a una función restringida (por URL o clic), ven el modal o pantalla de bloqueo con botón "Ver Planes".
    *   **Crear Negocio:** Pueden ver el botón "Crear nuevo negocio" (limitado a 1).

### 2. Subcuentas de Empleado (Team Members)
*   **Objetivo:** Enfocarse en la operación sin distracciones ni opciones de facturación.
*   **Comportamiento:**
    *   **Sidebar:** NO ven items bloqueados. Solo ven lo que su rol les permite acceder y que está disponible en el plan del negocio.
    *   **Banner:** NO ven el banner de actualización.
    *   **Footer:** NO ven la tarjeta promocional. Solo ven el botón de cerrar sesión.
    *   **ProGate:** Si intentan acceder a una función restringida, ven una pantalla de "Acceso Restringido" o nada (null), SIN botones de compra.
    *   **Crear Negocio:** NO ven el botón "Crear nuevo negocio".
    *   **Página /pro:** Si navegan manualmente a `/pro`, son redirigidos o ven un mensaje de bloqueo.
    *   **Modales:** El `UpgradeModal` no se renderiza para ellos bajo ninguna circunstancia.

## Checklist de Verificación Manual

### Preparación
1.  Tener una cuenta **Free** (Dueño).
2.  Tener una cuenta **Business** (Dueño) y crear un **Empleado** (Team Member).

### Caso A: Verificación Cuenta Free (Dueño)
- [ ] **Sidebar:** ¿Aparecen los items con candado (ej. Reportes, Pedidos)?
- [ ] **Sidebar:** ¿Al hacer clic en un item con candado, se abre el modal de "Actualiza a Pro"?
- [ ] **Sidebar:** ¿Aparece el banner dorado "Actualizar a PRO" en la lista de navegación?
- [ ] **Sidebar Footer:** ¿Aparece la tarjeta grande invitando a actualizar?
- [ ] **Crear Negocio:** ¿Aparece el botón "Crear nuevo negocio"?
- [ ] **URL /pro:** ¿Al ir a `/pro`, se ven las tarjetas de precios y botones de compra?

### Caso B: Verificación Cuenta Empleado (Team Member)
- [ ] **Sidebar:** ¿Están **ocultos** los items bloqueados (que el negocio no tiene o el rol no permite)? (No deben verse candados, simplemente no deben estar).
- [ ] **Sidebar:** ¿Ha desaparecido el banner dorado "Actualizar a PRO"?
- [ ] **Sidebar Footer:** ¿Ha desaparecido la tarjeta promocional del footer?
- [ ] **Crear Negocio:** ¿Ha desaparecido el botón "Crear nuevo negocio"?
- [ ] **Texto Plan:** ¿En el selector de negocio, dice "Miembro de Equipo" en lugar de "Plan Free/Pro"?
- [ ] **URL /pro:** ¿Al ir a `/pro`, aparece el mensaje "Acceso Restringido" sin precios?
- [ ] **URL Restringida:** Intenta ir a `/orders` (si el plan del negocio no lo incluye o el rol no tiene permiso). ¿Aparece "Acceso Restringido" **sin** botón de "Actualizar"?

### Caso C: Regresión
- [ ] ¿El cierre de sesión funciona correctamente en ambos casos?
- [ ] ¿La navegación básica (Dashboard, Ventas) funciona fluida?

## Notas Técnicas
*   La propiedad clave en el frontend es `user.account_type` ('personal' vs 'team_member').
*   El componente `ProGate` y `Sidebar` usan la constante `canUpgrade` derivada de esta propiedad.
