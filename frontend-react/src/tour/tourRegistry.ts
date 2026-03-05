import { TOUR_TARGETS, tourSel } from './tourTargets';

export type StepTarget = { 
  selector: string; 
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  title?: string;
  body?: string[];
};

export type TourStep = {
  id: string;
  title: string;
  body: string[];
  selector?: string; // Deprecated, use targets instead
  route?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'auto'; // Default placement
  targets?: {
    desktop?: StepTarget;
    mobile?: StepTarget;
  };
  allowInteraction?: boolean;
  optional?: boolean;
  waitFor?: string; // Selector to wait for before showing the step
};

export type Tour = {
  id: string;
  title: string;
  steps: TourStep[];
  duration?: string; // e.g. "3 min"
};

export type TourModule = {
  id: string;
  title: string;
  description?: string;
  route?: string;
  tour: Tour;
  plan?: 'free' | 'pro';
};

const salesModule: TourModule = {
  id: 'sales',
  title: 'Ventas',
  description: 'Registra ventas pagadas o fiadas, aplica descuentos y comparte por WhatsApp.',
  route: '/sales',
  tour: {
      id: 'sales.expert',
      title: 'Maestría en Ventas',
      duration: '8 min',
      steps: [
        {
          id: 'e1',
          title: 'El Panel de Ventas',
          body: ['Aquí gestionas todas tus operaciones.', 'Usa los atajos de teclado para agilidad.'],
          selector: tourSel(TOUR_TARGETS.sales.panel),
          route: '/sales',
          placement: 'bottom'
        },
        {
          id: 'e1_5',
          title: 'Funciones Avanzadas',
          body: ['Para ver las opciones avanzadas, necesitamos abrir una nueva venta.', 'Haz clic aquí para continuar.'],
          targets: {
            desktop: { selector: tourSel(TOUR_TARGETS.sales.primaryAction.desktop), placement: 'left' },
            mobile: { selector: tourSel(TOUR_TARGETS.sales.primaryAction.mobile), placement: 'bottom' }
          },
          allowInteraction: true
        },
        {
          id: 'e2',
          title: 'Búsqueda Avanzada',
          body: ['Puedes buscar por categoría o proveedor usando los filtros.', 'Tip: Usa el lector de código de barras si tienes uno.'],
          selector: tourSel(TOUR_TARGETS.sales.modal.search),
          placement: 'bottom',
          waitFor: tourSel(TOUR_TARGETS.sales.modal.search)
        },
        {
          id: 'e3',
          title: 'Gestión de Precios',
          body: ['Agrega un producto haciendo clic en él.'],
          selector: tourSel(TOUR_TARGETS.sales.modal.products),
          placement: 'top',
          allowInteraction: true
        },
        {
          id: 'e3_5',
          title: 'Carrito de Compras',
          body: ['Luego puedes ajustar su precio o cantidad directamente en el carrito.'],
          selector: tourSel(TOUR_TARGETS.sales.modal.cart),
          placement: 'left',
          allowInteraction: true
        },
        {
          id: 'e3_6',
          title: 'Siguiente Paso',
          body: ['Haz clic en Continuar para seleccionar el cliente.'],
          selector: tourSel(TOUR_TARGETS.sales.modal.nextToClient),
          placement: 'top',
          allowInteraction: true
        },
        {
          id: 'e4',
          title: 'Cliente: ¿Contado o Fiado?',
          body: ['Selecciona un cliente registrado para habilitar crédito.', 'Si es "Cliente Casual", la venta será solo de contado.'],
          selector: tourSel(TOUR_TARGETS.sales.modal.clientSelect),
          placement: 'bottom',
          waitFor: tourSel(TOUR_TARGETS.sales.modal.clientSelect)
        },
        {
          id: 'e5',
          title: 'Detalles del Cliente',
          body: ['Verifica su saldo pendiente antes de fiar más.', 'Error común: Fiar a clientes con deuda vencida.'],
          selector: tourSel(TOUR_TARGETS.sales.modal.clientInfo),
          placement: 'right',
          optional: true
        },
        {
          id: 'e5_5',
          title: 'Ir al Pago',
          body: ['Avanza a la sección final para cerrar la venta.'],
          selector: tourSel(TOUR_TARGETS.sales.modal.nextToPayment),
          placement: 'top',
          allowInteraction: true
        },
        {
          id: 'e6',
          title: 'Métodos de Pago',
          body: ['Registra pagos mixtos (Efectivo + Tarjeta).', 'Asegura que el total coincida.'],
          selector: tourSel(TOUR_TARGETS.sales.modal.paymentMethods),
          placement: 'top',
          waitFor: tourSel(TOUR_TARGETS.sales.modal.paymentMethods)
        },
        {
          id: 'e7',
          title: 'Descuento Global',
          body: ['Aplica un descuento al total de la venta.', 'Úsalo con precaución.'],
          selector: tourSel(TOUR_TARGETS.sales.modal.discount),
          placement: 'top'
        },
        {
          id: 'e8',
          title: 'Comprobante',
          body: ['Puedes enviar el ticket por WhatsApp o imprimirlo.', 'Ahorra papel enviando digitalmente.'],
          selector: tourSel(TOUR_TARGETS.sales.modal.receipt),
          placement: 'left'
        },
        {
          id: 'e8_5',
          title: 'Cerrar Ventana',
          body: ['Cierra el modal para volver al panel principal y ver las opciones finales.'],
          selector: tourSel(TOUR_TARGETS.common.modalClose),
          placement: 'left',
          allowInteraction: true
        },
        {
          id: 'e9',
          title: 'Ventas Pendientes',
          body: ['Si el cliente olvidó algo, guarda la venta como "Pendiente" y atiénde a otro.', 'No pierdas el progreso.'],
          selector: tourSel(TOUR_TARGETS.sales.hold),
          placement: 'bottom'
        },
        {
          id: 'e10',
          title: 'Cierre de Caja',
          body: ['Al final del día, verifica que el efectivo coincida con tus ventas.', 'Usa el reporte de cierre.'],
          selector: tourSel(TOUR_TARGETS.sales.kpis),
          placement: 'bottom'
        }
      ]
  }
};

const customersModule: TourModule = {
  id: 'customers',
  title: 'Clientes',
  description: 'Detecta vencidos, edita plazo, revisa top clientes.',
  route: '/customers',
  tour: {
      id: 'customers.expert',
      title: 'Fidelización y Crédito',
      duration: '7 min',
      steps: [
        { id: 'ce_start', title: 'Selecciona un Cliente', body: ['Haz clic en un cliente para ver sus detalles avanzados.'], selector: tourSel(TOUR_TARGETS.customers.listItem), route: '/customers', placement: 'right', allowInteraction: true },
        { id: 'ce1', title: 'Segmentación', body: ['Usa etiquetas para clasificar (VIP, Moroso).', 'Ayuda a decidir a quién dar crédito.'], selector: tourSel(TOUR_TARGETS.customers.tags), placement: 'bottom', optional: true },
        { id: 'ce2', title: 'Límite de Crédito', body: ['Configura el monto máximo para fiar.', 'El sistema te avisará si se excede.'], selector: tourSel(TOUR_TARGETS.customers.creditLimit), placement: 'right' },
        { id: 'ce3', title: 'Historial de Compras', body: ['Analiza qué compra más cada cliente.', 'Ofrece productos relacionados.'], selector: tourSel(TOUR_TARGETS.customers.history), placement: 'top', waitFor: tourSel(TOUR_TARGETS.customers.detail) },
        { id: 'ce4', title: 'Abonos a Cuenta', body: ['Registra pagos parciales a la deuda total.', 'No es necesario ligarlo a una venta específica.'], selector: tourSel(TOUR_TARGETS.customers.payment), placement: 'left' },
        { id: 'ce5', title: 'Recordatorios de Cobro', body: ['Envía un mensaje de cobro por WhatsApp.', 'Plantillas predefinidas disponibles.'], selector: tourSel(TOUR_TARGETS.customers.whatsappBtn), placement: 'left' },
        { id: 'ce6', title: 'Ubicación', body: ['Guarda la dirección para entregas.', 'Se integra con Google Maps.'], selector: tourSel(TOUR_TARGETS.customers.address), placement: 'bottom' },
        { id: 'ce7', title: 'Clientes Inactivos', body: ['Filtra quienes no compran hace tiempo.', 'Haz una campaña de reactivación.'], selector: tourSel(TOUR_TARGETS.customers.filterInactive), placement: 'bottom' }
      ]
  }
};

const dashboardModule: TourModule = {
  id: 'dashboard',
  title: 'Dashboard',
  description: 'Domina tu negocio: KPIs, Balance, Analíticas y Recordatorios.',
  route: '/dashboard',
  plan: 'pro',
  tour: {
      id: 'dashboard.expert',
      title: 'Centro de Comando',
      duration: '6 min',
      steps: [
        { 
          id: 'de_start', 
          title: 'Visión General', 
          body: ['Bienvenido a tu centro de control.', 'Aquí tienes un resumen en tiempo real de tu negocio.'], 
          selector: tourSel(TOUR_TARGETS.dashboard.panel), 
          route: '/dashboard', 
          placement: 'bottom' 
        },
        { 
            id: 'de_kpis', 
            title: 'Indicadores Clave', 
            body: ['Revisa tus ventas totales, ganancias y efectivo en caja al instante.'], 
            selector: tourSel(TOUR_TARGETS.dashboard.kpis), 
            placement: 'bottom' 
        },
        { 
            id: 'de_tabs', 
            title: 'Navegación Estratégica', 
            body: ['El Dashboard se divide en 4 áreas vitales.', 'Exploremos cada una.'], 
            selector: tourSel(TOUR_TARGETS.dashboard.periodSelector), 
            placement: 'bottom' 
        },
        { 
            id: 'de_hoy', 
            title: 'Pestaña: Hoy', 
            body: ['Aquí ves la operación del día en curso.', 'Haz clic para ver detalles diarios.'], 
            selector: tourSel(TOUR_TARGETS.dashboard.tabs.hoy), 
            placement: 'bottom', 
            allowInteraction: true 
        },
        { 
            id: 'de_balance', 
            title: 'Pestaña: Balance', 
            body: ['Analiza la salud financiera.', 'Ingresos vs Gastos y Margen de ganancia.', 'Haz clic para entrar.'], 
            selector: tourSel(TOUR_TARGETS.dashboard.tabs.balance), 
            placement: 'bottom', 
            allowInteraction: true 
        },
        { 
            id: 'de_balance_detail', 
            title: 'Resumen Financiero', 
            body: ['Visualiza la evolución de tus finanzas mes a mes.', 'Identifica tendencias de crecimiento.'], 
            selector: tourSel(TOUR_TARGETS.dashboard.balance.summary), 
            placement: 'top', 
            waitFor: tourSel(TOUR_TARGETS.dashboard.balance.summary) 
        },
        { 
            id: 'de_analytics', 
            title: 'Pestaña: Analíticas', 
            body: ['Toma decisiones basadas en datos.', 'Productos top, mejores clientes y más.', 'Haz clic para explorar.'], 
            selector: tourSel(TOUR_TARGETS.dashboard.tabs.analytics), 
            placement: 'bottom', 
            allowInteraction: true 
        },
        { 
            id: 'de_analytics_chart', 
            title: 'Gráficos de Tendencia', 
            body: ['Entiende los picos y valles de tu venta.', '¿Qué días vendes más?'], 
            selector: tourSel(TOUR_TARGETS.dashboard.analytics.salesChart), 
            placement: 'top', 
            waitFor: tourSel(TOUR_TARGETS.dashboard.analytics.salesChart) 
        },
         { 
            id: 'de_top_products', 
            title: 'Productos Estrella', 
            body: ['Descubre cuáles son tus productos más vendidos.', '¡Nunca te quedes sin stock de estos!'], 
            selector: tourSel(TOUR_TARGETS.dashboard.topProducts), 
            placement: 'left'
        },
        { 
            id: 'de_reminders', 
            title: 'Pestaña: Recordatorios', 
            body: ['Tu asistente personal.', 'Cobros pendientes, pagos a proveedores y tareas.'], 
            selector: tourSel(TOUR_TARGETS.dashboard.tabs.reminders), 
            placement: 'bottom', 
            allowInteraction: true 
        }
      ]
  }
};

const productsModule: TourModule = {
  id: 'products',
  title: 'Productos',
  description: 'Inventario inteligente, precios dinámicos y control total.',
  route: '/products',
  tour: {
      id: 'products.expert',
      title: 'Maestría en Inventario',
      duration: '7 min',
      steps: [
        { 
            id: 'p_start', 
            title: 'Gestión de Productos', 
            body: ['Aquí nace tu catálogo.', 'Controla precios, costos y existencias.'], 
            selector: tourSel(TOUR_TARGETS.products.panel), 
            route: '/products', 
            placement: 'bottom' 
        },
        { 
            id: 'p_new', 
            title: 'Crear Producto', 
            body: ['Agrega nuevos productos o servicios.', 'Soporta códigos de barra y categorías.'], 
            selector: tourSel(TOUR_TARGETS.products.primaryAction), 
            placement: 'left' 
        },
        { 
            id: 'p_kpis', 
            title: 'Valor del Inventario', 
            body: ['Conoce cuánto dinero tienes invertido en mercancía.', 'Dato clave para tu balance.'], 
            selector: tourSel(TOUR_TARGETS.products.kpis), 
            placement: 'bottom' 
        },
        { 
            id: 'p_search', 
            title: 'Búsqueda Inteligente', 
            body: ['Encuentra cualquier item por nombre, código o categoría.', 'Filtra para ver solo los de bajo stock.'], 
            selector: tourSel(TOUR_TARGETS.products.search), 
            placement: 'bottom' 
        },
        { 
            id: 'p_tabs_inventory', 
            title: 'Control de Stock', 
            body: ['Gestiona entradas y salidas rápidamente.', 'Haz clic para ver la tabla de inventario.'], 
            selector: tourSel(TOUR_TARGETS.products.tabs.inventory), 
            placement: 'bottom', 
            allowInteraction: true 
        },
        { 
            id: 'p_inventory_adjust', 
            title: 'Ajuste Rápido', 
            body: ['¿Llegó mercancía? Súmala aquí sin entrar a editar.', 'Ahorra tiempo en la recepción.'], 
            selector: tourSel(TOUR_TARGETS.products.inventory.quickAdjust), 
            placement: 'left', 
            waitFor: tourSel(TOUR_TARGETS.products.inventory.table) 
        },
        { 
            id: 'p_tabs_pricing', 
            title: 'Estrategia de Precios', 
            body: ['Herramientas para calcular márgenes y precios masivos.', 'Haz clic para optimizar tus ganancias.'], 
            selector: tourSel(TOUR_TARGETS.products.tabs.pricing), 
            placement: 'bottom', 
            allowInteraction: true 
        },
        { 
            id: 'p_pricing_calc', 
            title: 'Calculadora de Precios', 
            body: ['Ajusta tus precios base o por porcentaje.', 'Ideal para cambios por inflación o temporada.'], 
            selector: tourSel(TOUR_TARGETS.products.pricing.calculator), 
            placement: 'right', 
            waitFor: tourSel(TOUR_TARGETS.products.pricing.calculator) 
        },
        { 
            id: 'p_export', 
            title: 'Importar y Exportar', 
            body: ['Maneja tu catálogo en Excel.', 'Útil para cargas iniciales o respaldos.'], 
            selector: tourSel(TOUR_TARGETS.products.export), 
            placement: 'left' 
        }
      ]
  }
};

const ordersModule: TourModule = {
  id: 'orders',
  title: 'Pedidos',
  description: 'Flujo de trabajo visual, seguimiento y entregas perfectas.',
  route: '/orders',
  plan: 'pro',
  tour: {
      id: 'orders.expert',
      title: 'Logística Pro',
      duration: '6 min',
      steps: [
        { 
            id: 'o_start', 
            title: 'Tablero de Pedidos', 
            body: ['Gestiona el ciclo de vida de tus pedidos.', 'Desde la solicitud hasta la entrega.'], 
            selector: tourSel(TOUR_TARGETS.orders.panel), 
            route: '/orders', 
            placement: 'bottom' 
        },
        { 
            id: 'o_new', 
            title: 'Crear Pedido', 
            body: ['Registra un nuevo pedido manualmente.', 'Vamos a crear uno juntos.'], 
            selector: tourSel(TOUR_TARGETS.orders.primaryAction), 
            placement: 'left', 
            allowInteraction: true 
        },
        { 
            id: 'o_modal_products', 
            title: 'Selección de Productos', 
            body: ['Busca y agrega los productos solicitados.', 'Puedes ver el stock disponible.'], 
            selector: tourSel(TOUR_TARGETS.orders.modal.products), 
            placement: 'right', 
            waitFor: tourSel(TOUR_TARGETS.orders.modal.products), 
            allowInteraction: true 
        },
        { 
            id: 'o_modal_cart', 
            title: 'Resumen del Pedido', 
            body: ['Verifica cantidades y precios.', 'Asegúrate que todo esté correcto.'], 
            selector: tourSel(TOUR_TARGETS.orders.modal.cart), 
            placement: 'left', 
            allowInteraction: true 
        },
        { 
            id: 'o_modal_next', 
            title: 'Datos del Cliente', 
            body: ['Avanza para asignar el pedido a un cliente.', 'Haz clic en Siguiente.'], 
            selector: tourSel(TOUR_TARGETS.orders.modal.next), 
            placement: 'top', 
            allowInteraction: true 
        },
        { 
            id: 'o_modal_client', 
            title: 'Asignación y Estado', 
            body: ['Elige el cliente y define si es para entrega o retiro.', 'Añade notas importantes.'], 
            selector: tourSel(TOUR_TARGETS.orders.modal.client), 
            placement: 'bottom', 
            waitFor: tourSel(TOUR_TARGETS.orders.modal.client) 
        },
        { 
            id: 'o_modal_close', 
            title: 'Volver al Tablero', 
            body: ['Cierra el modal para ver cómo quedó en el tablero.'], 
            selector: tourSel(TOUR_TARGETS.common.modalClose), 
            placement: 'left', 
            allowInteraction: true 
        },
        { 
            id: 'o_board', 
            title: 'Vista Kanban', 
            body: ['Visualiza el progreso de cada pedido.', 'Arrastra y suelta para cambiar de estado.'], 
            selector: tourSel(TOUR_TARGETS.orders.board), 
            placement: 'top' 
        },
        { 
            id: 'o_card_actions', 
            title: 'Acciones Rápidas', 
            body: ['Contacta al cliente por WhatsApp directamente desde la tarjeta.', 'Duplica pedidos recurrentes.'], 
            selector: tourSel(TOUR_TARGETS.orders.whatsapp),
            placement: 'right' 
        },
        { 
            id: 'o_settings', 
            title: 'Configuración del Flujo', 
            body: ['Personaliza tus columnas y estados.', 'Adapta el tablero a tu proceso real.'], 
            selector: tourSel(TOUR_TARGETS.orders.settings), 
            placement: 'bottom' 
        }
      ]
  }
};

const expensesModule: TourModule = {
  id: 'expenses',
  title: 'Gastos',
  description: 'Registra gastos, agenda recurrentes y arma presupuestos.',
  route: '/expenses',
  tour: {
      id: 'expenses.expert',
      title: 'Control de Costos',
      duration: '5 min',
      steps: [
        { id: 'exe1', title: 'Nuevo Gasto', body: ['Registra un nuevo gasto manual.'], selector: tourSel(TOUR_TARGETS.expenses.primaryAction), route: '/expenses', placement: 'left', allowInteraction: true },
        { id: 'exe2', title: 'Detalles del Gasto', body: ['Ingresa descripción, monto y fecha.'], selector: tourSel(TOUR_TARGETS.expenses.modal.description), placement: 'right', waitFor: tourSel(TOUR_TARGETS.expenses.modal.description), allowInteraction: true },
        { id: 'exe3', title: 'Categorización', body: ['Clasifica tus gastos para mejores reportes (Ej: Nómina, Servicios).'], selector: tourSel(TOUR_TARGETS.expenses.modal.category), placement: 'right', allowInteraction: true },
        { id: 'exe4', title: 'Comprobantes', body: ['Sube una foto de la factura o recibo.'], selector: tourSel(TOUR_TARGETS.expenses.modal.receipt), placement: 'top', allowInteraction: true },
        { id: 'exe5', title: 'Confirmar', body: ['Guarda el gasto en tu historial.'], selector: tourSel(TOUR_TARGETS.expenses.modal.confirm), placement: 'top' },
        { id: 'exe6', title: 'Cerrar Modal', body: ['Vuelve al panel principal.'], selector: tourSel(TOUR_TARGETS.common.modalClose), placement: 'left', allowInteraction: true },
        { id: 'exe7', title: 'Gastos Recurrentes', body: ['Configura pagos fijos (Alquiler, Luz) que se generan automáticamente.'], selector: tourSel(TOUR_TARGETS.expenses.recurring), placement: 'top' },
        { id: 'exe8', title: 'KPIs Financieros', body: ['Monitorea tus egresos totales y promedio.'], selector: tourSel(TOUR_TARGETS.expenses.kpis), placement: 'bottom' }
      ]
  }
};

const paymentsModule: TourModule = {
  id: 'payments',
  title: 'Pagos',
  description: 'Aplica pagos automáticos o manuales, estados de cuenta y vencidas.',
  route: '/payments',
  tour: {
      id: 'payments.expert',
      title: 'Gestión de Cartera',
      duration: '4 min',
      steps: [
        {
          id: 'py1',
          title: 'Registrar Pago',
          body: ['Comienza registrando un abono o pago total.'],
          targets: {
            desktop: { selector: tourSel(TOUR_TARGETS.payments.primaryAction.desktop), placement: 'left' },
            mobile: { selector: tourSel(TOUR_TARGETS.payments.primaryAction.mobile), placement: 'bottom' }
          },
          route: '/payments',
          allowInteraction: true
        },
        { id: 'py2', title: 'Selección de Cliente', body: ['Busca al cliente que realiza el pago.'], selector: tourSel(TOUR_TARGETS.payments.modal.clientSearch), placement: 'bottom', waitFor: tourSel(TOUR_TARGETS.payments.modal.clientSearch), allowInteraction: true },
        { id: 'py3', title: 'Lista de Clientes', body: ['Haz clic en el cliente para continuar.'], selector: tourSel(TOUR_TARGETS.payments.modal.clientList), placement: 'right', allowInteraction: true },
        { id: 'py4', title: 'Monto y Fecha', body: ['Ingresa el valor recibido y la fecha del pago.'], selector: tourSel(TOUR_TARGETS.payments.modal.details), placement: 'bottom', waitFor: tourSel(TOUR_TARGETS.payments.modal.details) },
        { id: 'py5', title: 'Continuar', body: ['Avanza a la aplicación del pago.'], selector: tourSel(TOUR_TARGETS.payments.modal.next), placement: 'top', allowInteraction: true },
        { id: 'py6', title: 'Cerrar Modal', body: ['Cierra para volver al historial.'], selector: tourSel(TOUR_TARGETS.common.modalClose), placement: 'left', allowInteraction: true },
        { id: 'py7', title: 'Pestaña Vencidas', body: ['Filtra rápidamente las cuentas por cobrar expiradas.'], selector: tourSel(TOUR_TARGETS.payments.tabs.overdue), placement: 'bottom' },
        { id: 'py8', title: 'Historial de Transacciones', body: ['Revisa todos los pagos registrados en el periodo.'], selector: tourSel(TOUR_TARGETS.payments.list), placement: 'top' }
      ]
  }
};

export const tourModules: Record<string, TourModule> = {
  sales: salesModule,
  customers: customersModule,
  dashboard: dashboardModule,
  products: productsModule,
  orders: ordersModule,
  expenses: expensesModule,
  payments: paymentsModule,
};

// Flat registry for ID lookup
export const tours: Record<string, Tour> = Object.values(tourModules).reduce((acc, mod) => {
  acc[mod.tour.id] = mod.tour;
  return acc;
}, {} as Record<string, Tour>);

export const getTourById = (id: string): Tour | undefined => tours[id];
