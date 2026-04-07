export type TutorialStep = {
  target: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  route?: string;
};

export type TutorialModule = {
  id: string;
  title: string;
  description: string;
  steps: TutorialStep[];
};

export const TUTORIAL_MODULES: Record<string, TutorialModule> = {
  dashboard: {
    id: 'dashboard',
    title: 'Dashboard Principal',
    description: 'Conoce los indicadores clave de tu negocio.',
    steps: [
      { target: '[data-tour="dashboard-kpis"]', title: 'Indicadores Clave', content: 'Resumen de caja, ventas del día, gastos y cuentas por cobrar.', position: 'bottom', route: '/dashboard' },
      { target: '[data-tour="dashboard-period-selector"]', title: 'Vistas del Dashboard', content: 'Accede a Hoy, Balance, Analíticas y Recordatorios.', position: 'bottom' },
      { target: '[data-tour="dashboard-charts"]', title: 'Actividad Reciente', content: 'Revisa últimas ventas y recordatorios pendientes.', position: 'top' },
      { target: '[data-tour="dashboard-quick-actions"]', title: 'Acciones Rápidas', content: 'Registra ventas o gastos de forma inmediata.', position: 'left' }
    ]
  },
  sales: {
    id: 'sales',
    title: 'Ventas',
    description: 'Registra ventas y gestiona cuentas por cobrar.',
    steps: [
      { target: '[data-tour="sales.newSale"]', title: 'Venta rápida', content: 'Acceso directo para registrar ventas simples.', position: 'left', route: '/sales' },
      { target: '[data-tour="sales.kpis"]', title: 'KPIs de ventas', content: 'Rendimiento de tus ventas en el periodo.', position: 'bottom' },
      { target: '[data-tour="sales.table"]', title: 'Listado', content: 'Busca, filtra, exporta y administra ventas.', position: 'top' }
    ]
  },
  customers: {
    id: 'customers',
    title: 'Clientes',
    description: 'Gestiona tus clientes y sus deudas.',
    steps: [
      { target: '[data-tour="customers.addBtn"]', title: 'Nuevo cliente', content: 'Crea clientes para registrar fiados y contacto.', position: 'left', route: '/customers' },
      { target: '[data-tour="customers.balance"]', title: 'KPIs de clientes', content: 'Resumen de cartera y comportamiento.', position: 'bottom' },
      { target: '[data-tour="customers.table"]', title: 'Listado de clientes', content: 'Explora, busca y filtra tu base de clientes.', position: 'top' },
      { target: '[data-tour="customers.search"]', title: 'Herramientas', content: 'Búsqueda, filtros, exportación y ajustes.', position: 'bottom' },
      { target: '[data-tour="customers-detail-panel"]', title: 'Detalle', content: 'Historial, abonos y acciones por cliente.', position: 'left' }
    ]
  },
  products: {
    id: 'products',
    title: 'Productos y Servicios',
    description: 'Administra catálogo, inventario y precios.',
    steps: [
      { target: '[data-tour="products.addBtn"]', title: 'Nuevo', content: 'Crea productos o servicios rápidamente.', position: 'left', route: '/products' },
      { target: '[data-tour="products.export"]', title: 'Exportar', content: 'Descarga tu catálogo para compartir o respaldar.', position: 'left' },
      { target: '[data-tour="products-kpis"]', title: 'KPIs de catálogo', content: 'Visión general de tu inventario y mix.', position: 'bottom' },
      { target: '[data-tour="products-tabs"]', title: 'Vistas', content: 'Catálogo, inventario y herramientas de precios.', position: 'bottom' },
      { target: '[data-tour="products.search"]', title: 'Filtros', content: 'Busca y segmenta productos por múltiples criterios.', position: 'bottom' }
    ]
  },
  expenses: {
    id: 'expenses',
    title: 'Gastos',
    description: 'Controla egresos, categorías y recurrentes.',
    steps: [
      { target: '[data-tour="expenses.addBtn"]', title: 'Nuevo gasto', content: 'Registra un egreso y categorízalo.', position: 'left', route: '/expenses' },
      { target: '[data-tour="expenses.recurring"]', title: 'Recurrentes', content: 'Agenda pagos periódicos y alertas.', position: 'left' },
      { target: '[data-tour="expenses-kpis"]', title: 'KPIs de gastos', content: 'Monitorea tus egresos clave.', position: 'bottom' },
      { target: '[data-tour="expenses-tabs"]', title: 'Vistas', content: 'Movimientos, recurrentes, analítica y categorías.', position: 'bottom' },
      { target: '[data-tour="expenses.table"]', title: 'Listado', content: 'Filtra, exporta y administra gastos.', position: 'top' }
    ]
  },
  reports: {
    id: 'reports',
    title: 'Reportes',
    description: 'Explora tus métricas y exporta resultados.',
    steps: [
      { target: '[data-tour="reports.panel"]', title: 'Tipos de reporte', content: 'Resumen, ventas, clientes, productos y más.', position: 'bottom', route: '/reports' },
      { target: '[data-tour="reports.filters"]', title: 'Periodo', content: 'Selecciona fechas y presets para analizar.', position: 'bottom' },
      { target: '[data-tour="reports.export"]', title: 'Exportar', content: 'Descarga tus reportes en un clic.', position: 'left' }
    ]
  },
  payments: {
    id: 'payments',
    title: 'Pagos y Abonos',
    description: 'Registra abonos y concilia deudas.',
    steps: [
      { target: '[data-tour="payments.panel"]', title: 'Cobros', content: 'Aplica abonos automáticos o manuales según tus facturas.', route: '/payments' }
    ]
  },
  orders: {
    id: 'orders',
    title: 'Pedidos',
    description: 'Gestiona el flujo de pedidos en Kanban.',
    steps: [
      { target: '[data-tour="orders.panel"]', title: 'Kanban', content: 'Arrastra tarjetas para cambiar el estado de los pedidos.', route: '/orders' }
    ]
  },
  alerts: {
    id: 'alerts',
    title: 'Alertas',
    description: 'Administra alertas importantes.',
    steps: [
      { target: '[data-tour="alerts.panel"]', title: 'Alertas', content: 'Resuelve o pospone alertas para mantenerte al día.', route: '/alerts' }
    ]
  },
  settings: {
    id: 'settings',
    title: 'Configuración',
    description: 'Ajustes del negocio y plantillas.',
    steps: [
      { target: '[data-tour="settings.panel"]', title: 'Ajustes', content: 'Configura tu cuenta, negocio y plantillas de WhatsApp.', route: '/settings' }
    ]
  }
};
