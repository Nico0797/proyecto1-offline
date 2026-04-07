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
  selector?: string;
  route?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left' | 'auto';
  targets?: {
    desktop?: StepTarget;
    mobile?: StepTarget;
  };
  allowInteraction?: boolean;
  optional?: boolean;
  waitFor?: string;
};

export type Tour = {
  id: string;
  title: string;
  steps: TourStep[];
  duration?: string;
};

export type TourModule = {
  id: string;
  title: string;
  description?: string;
  route?: string;
  tour: Tour;
};

const onboardingBasic: TourModule = {
  id: 'onboarding.basic',
  title: 'Recorrido inicial',
  description: 'Empieza por lo esencial: inicio, ventas, productos, gastos y configuracion.',
  route: '/dashboard',
  tour: {
    id: 'onboarding.basic',
    title: 'Primer recorrido',
    duration: '3 min',
    steps: [
      {
        id: 'ob0',
        route: '/dashboard',
        title: 'Bienvenido a tu espacio de trabajo',
        body: [
          'Este recorrido te muestra solo lo indispensable para empezar sin ruido.',
          'Podras repetirlo luego desde Ayuda cuando quieras.',
        ],
      },
      {
        id: 'ob1',
        title: 'Empieza por el inicio',
        body: [
          'Aqui ves lo mas importante del negocio activo.',
          'Usalo para decidir si te conviene vender, cobrar o revisar pendientes.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.panel),
        route: '/dashboard',
        placement: 'bottom',
      },
      {
        id: 'ob2',
        title: 'Lee primero estos indicadores',
        body: [
          'Ventas, gastos y saldos te dan el pulso del dia.',
          'No necesitas abrir varios modulos para entender si algo se movio.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.kpis),
        placement: 'bottom',
      },
      {
        id: 'ob3',
        title: 'Registrar una venta',
        body: [
          'Este es el acceso mas importante para la operacion diaria.',
          'Abre el modulo cuando quieras registrar una venta real.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.panel),
        route: '/sales',
        placement: 'bottom',
      },
      {
        id: 'ob4',
        title: 'Organiza lo que vendes',
        body: [
          'En Productos mantienes catalogo, stock y precios.',
          'Es el lugar correcto para preparar tu operacion antes de vender.',
        ],
        selector: tourSel(TOUR_TARGETS.products.panel),
        route: '/products',
        placement: 'bottom',
      },
      {
        id: 'ob5',
        title: 'No pierdas de vista los gastos',
        body: [
          'Registrar egresos a tiempo evita que la caja y reportes queden maquillados.',
          'Hazlo desde este acceso o desde el inicio.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.panel),
        route: '/expenses',
        placement: 'bottom',
      },
      {
        id: 'ob6',
        title: 'Configura el negocio a tu medida',
        body: [
          'Aqui ajustas perfil, negocio, personalizacion y membresia.',
          'Si cambian tus modulos o tu plan, Ayuda tambien se adapta desde aqui.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.panel),
        route: '/settings',
        placement: 'right',
      },
    ],
  },
};

const onboardingPro: TourModule = {
  id: 'onboarding.pro',
  title: 'Recorrido inicial',
  description: 'Incluye inicio, ventas, cobros, reportes y configuracion.',
  route: '/dashboard',
  tour: {
    id: 'onboarding.pro',
    title: 'Primer recorrido',
    duration: '4 min',
    steps: [
      {
        id: 'op0',
        route: '/dashboard',
        title: 'Bienvenido a la version guiada de tu negocio',
        body: [
          'Este recorrido te ubica rapido en los modulos que mas suelen mover el dia.',
          'Si algo cambia en tu plan, podras reabrir la ayuda desde el centro de aprendizaje.',
        ],
      },
      {
        id: 'op1',
        title: 'Inicio: tu lectura rapida del dia',
        body: [
          'Usa este tablero para ver que pasa hoy antes de abrir un modulo especifico.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.panel),
        route: '/dashboard',
        placement: 'bottom',
      },
      {
        id: 'op2',
        title: 'Ventas primero',
        body: [
          'Desde aqui registras ventas y dejas el movimiento listo para caja, cartera y reportes.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.panel),
        route: '/sales',
        placement: 'bottom',
      },
      {
        id: 'op3',
        title: 'Cobros y seguimiento',
        body: [
          'Si vendes con saldo pendiente, este modulo te ayuda a priorizar vencidos y registrar abonos.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.panel),
        route: '/payments',
        placement: 'bottom',
      },
      {
        id: 'op4',
        title: 'Reportes cuando necesites entender mas',
        body: [
          'No es para abrirlo todo el tiempo, sino para revisar resultados, comparativos y exportaciones.',
        ],
        selector: tourSel(TOUR_TARGETS.reports.panel),
        route: '/reports',
        placement: 'bottom',
      },
      {
        id: 'op5',
        title: 'Configuracion y membresia',
        body: [
          'Aqui cambias negocio, personalizacion, plantillas y plan del negocio.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.panel),
        route: '/settings',
        placement: 'right',
      },
    ],
  },
};

const onboardingBusiness: TourModule = {
  id: 'onboarding.business',
  title: 'Recorrido inicial',
  description: 'Incluye inicio, ventas, cobros, reportes y bodega.',
  route: '/dashboard',
  tour: {
    id: 'onboarding.business',
    title: 'Primer recorrido',
    duration: '5 min',
    steps: [
      {
        id: 'obb0',
        route: '/dashboard',
        title: 'Bienvenido a una operacion mas completa',
        body: [
          'Este recorrido resume los flujos que suelen mover un negocio con mas control operativo.',
          'Despues puedes ir a Ayuda para abrir tutoriales puntuales segun la tarea del dia.',
        ],
      },
      {
        id: 'obb1',
        title: 'Todo arranca en el inicio',
        body: [
          'Aqui detectas rapido si hoy conviene vender, cobrar, revisar reportes o mirar la bodega.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.panel),
        route: '/dashboard',
        placement: 'bottom',
      },
      {
        id: 'obb2',
        title: 'Ventas y cobros van juntos',
        body: [
          'Primero registras la venta. Luego sigues el saldo desde Cobros o cartera segun el flujo del negocio.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.panel),
        route: '/sales',
        placement: 'bottom',
      },
      {
        id: 'obb3',
        title: 'Cobros y cartera con prioridad',
        body: [
          'Cuando la venta no queda pagada, aqui priorizas lo vencido y registras abonos con contexto.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.panel),
        route: '/payments',
        placement: 'bottom',
      },
      {
        id: 'obb4',
        title: 'Reportes para decisiones',
        body: [
          'Esta vista te ayuda a mirar resultados, comparativos y rentabilidad sin improvisar.',
        ],
        selector: tourSel(TOUR_TARGETS.reports.panel),
        route: '/reports',
        placement: 'bottom',
      },
      {
        id: 'obb5',
        title: 'Bodega e insumos',
        body: [
          'Si produces o transformas, aqui controlas materias primas, movimientos y minimos.',
        ],
        selector: tourSel(TOUR_TARGETS.rawInventory.panel),
        route: '/raw-inventory',
        placement: 'bottom',
      },
      {
        id: 'obb6',
        title: 'No olvides configurar el negocio',
        body: [
          'Plantillas, personalizacion, equipo y membresia viven en Configuracion.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.panel),
        route: '/settings',
        placement: 'right',
      },
    ],
  },
};

const dashboardModule: TourModule = {
  id: 'dashboard',
  title: 'Inicio',
  description: 'Entiende que significa cada zona del tablero y como usarla sin saturarte.',
  route: '/dashboard',
  tour: {
    id: 'dashboard.expert',
    title: 'Leer el inicio con criterio',
    duration: '4 min',
    steps: [
      {
        id: 'db1',
        title: 'Esta es tu vista de control',
        body: [
          'No intenta reemplazar todos los módulos.',
          'Te ayuda a decidir qué atender primero.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.panel),
        route: '/dashboard',
        placement: 'bottom',
      },
      {
        id: 'db2',
        title: 'Empieza por los indicadores',
        body: [
          'Ventas, gastos y saldos te dan una lectura rápida del momento.',
          'Haz clic en cualquier KPI para ver más detalle si lo necesitas.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.kpis),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'db3',
        title: 'Cambia de vista según la pregunta',
        body: [
          'Usa Caja cuando necesites operación diaria.',
          'Usa Análisis cuando quieras más detalle.',
          'Prueba cambiando de pestaña.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.tabs.balance),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'db4',
        title: 'Ventas recientes y pendientes',
        body: [
          'Estas tarjetas te ayudan a revisar lo recién registrado y lo que aún pide seguimiento.',
          'Puedes hacer clic en una venta para ver su detalle.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.charts),
        placement: 'top',
        allowInteraction: true,
      },
      {
        id: 'db5',
        title: 'Si algo exige atención, suele aparecer aquí',
        body: [
          'Pendientes, alertas o recordatorios viven en esta zona del tablero.',
          'Haz clic en una alerta para ir directamente al módulo correspondiente.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.alerts),
        placement: 'left',
        allowInteraction: true,
      },
    ],
  },
};

const salesModule: TourModule = {
  id: 'sales',
  title: 'Ventas',
  description: 'Recorre el flujo real de venta: productos, cliente, cobro y cierre.',
  route: '/sales',
  tour: {
    id: 'sales.expert',
    title: 'Registrar una venta con menos errores',
    duration: '6 min',
    steps: [
      {
        id: 's1',
        title: 'Panel de ventas',
        body: [
          'Aqui quedan registradas las operaciones y el acceso para crear una nueva.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.panel),
        route: '/sales',
        placement: 'bottom',
      },
      {
        id: 's2',
        title: 'Empieza una nueva venta',
        body: [
          'Entra por aqui para abrir el modal real de venta.',
          'Cuando lo abras, el recorrido te ira guiando por cada paso del flujo.',
        ],
        targets: {
          desktop: { selector: tourSel(TOUR_TARGETS.sales.primaryAction.desktop), placement: 'left' },
          mobile: { selector: tourSel(TOUR_TARGETS.sales.primaryAction.mobile), placement: 'bottom' },
        },
        allowInteraction: true,
      },
      {
        id: 's3',
        title: 'Busca productos o servicios',
        body: [
          'Escribe para buscar por nombre o referencia.',
          'O escanea el codigo de barras si tienes el producto fisico.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.modal.search),
        waitFor: tourSel(TOUR_TARGETS.sales.modal.search),
        placement: 'bottom',
      },
      {
        id: 's4',
        title: 'Agrega productos desde la lista',
        body: [
          'Toca una tarjeta para sumar productos o servicios a la venta.',
          'El carrito se actualiza en esta misma pantalla mientras vas agregando items.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.modal.products),
        waitFor: tourSel(TOUR_TARGETS.sales.modal.products),
        placement: 'top',
      },
      {
        id: 's5',
        title: 'Revisa carrito, cantidades y total',
        body: [
          'Aqui validas cantidades, precio unitario, descuento y total antes de seguir.',
          'Si el boton para continuar aparece desactivado, primero agrega al menos un producto.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.modal.cart),
        waitFor: tourSel(TOUR_TARGETS.sales.modal.cart),
        placement: 'left',
      },
      {
        id: 's6',
        title: 'Pasa al paso de cliente y cobro',
        body: [
          'Este boton te lleva al siguiente paso del flujo.',
          'Usalo cuando ya revisaste lo que el cliente lleva y el total de la venta.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.modal.nextToClient),
        placement: 'left',
        allowInteraction: true,
      },
      {
        id: 's7',
        title: 'Elige cliente si la venta puede quedar pendiente',
        body: [
          'Cliente casual sirve para una venta de contado rapida.',
          'Si la venta quedara con saldo o con abono, aqui si conviene elegir un cliente real.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.modal.clientSelect),
        waitFor: tourSel(TOUR_TARGETS.sales.modal.clientSelect),
        placement: 'bottom',
      },
      {
        id: 's8',
        title: 'Continua al paso final de cobro',
        body: [
          'Cuando ya tienes claro el cliente, entra por aqui al paso final.',
          'Alla defines si pagan todo hoy, dejan saldo o hacen un abono.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.modal.nextToPayment),
        placement: 'left',
        allowInteraction: true,
      },
      {
        id: 's9',
        title: 'Define como se paga la venta',
        body: [
          'Aqui eliges si pagan todo hoy, dejan saldo pendiente o hacen un abono.',
          'Tambien defines el metodo de pago antes de guardar.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.modal.paymentMethods),
        waitFor: tourSel(TOUR_TARGETS.sales.modal.paymentMethods),
        placement: 'top',
      },
      {
        id: 's10',
        title: 'Guarda la venta cuando todo este correcto',
        body: [
          'Este es el cierre real del flujo.',
          'Antes de guardar, confirma metodo de pago, nota interna y si la venta queda pagada o con saldo.',
        ],
        selector: tourSel(TOUR_TARGETS.sales.modal.confirm),
        waitFor: tourSel(TOUR_TARGETS.sales.modal.confirm),
        placement: 'bottom',
      },
    ],
  },
};

const paymentsModule: TourModule = {
  id: 'payments',
  title: 'Cobros',
  description: 'Sigue saldos pendientes y registra abonos desde la vista correcta.',
  route: '/payments',
  tour: {
    id: 'payments.expert',
    title: 'Cobrar sin perder contexto',
    duration: '4 min',
    steps: [
      {
        id: 'p1',
        title: 'Aquí decides a quién cobrar primero',
        body: [
          'La pantalla combina clientes con saldo, cobros registrados y cuentas por vencer.',
          'Cada pestaña prioriza un tipo de acción.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.panel),
        route: '/payments',
        placement: 'bottom',
      },
      {
        id: 'p2',
        title: 'Mira el resumen antes de cobrar',
        body: [
          'Estos indicadores te muestran total pendiente, vencido y comportamiento de los pagos.',
          'Si no tienes permisos de cobro, solo podrás ver.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.kpis),
        placement: 'bottom',
      },
      {
        id: 'p3',
        title: 'Filtra por cliente o periodo',
        body: [
          'Usa esta barra para reducir el ruido antes de registrar un abono.',
          'Puedes buscar por nombre y ajustar el periodo.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.filters),
        placement: 'bottom',
      },
      {
        id: 'p4',
        title: 'Registrar un cobro',
        body: [
          'Desde aquí abres el flujo para aplicar el pago al cliente correcto.',
          'Haz clic para continuar.',
        ],
        targets: {
          desktop: { selector: tourSel(TOUR_TARGETS.payments.primaryAction.desktop), placement: 'left' },
          mobile: { selector: tourSel(TOUR_TARGETS.payments.primaryAction.mobile), placement: 'bottom' },
        },
        placement: 'left',
        allowInteraction: true,
        waitFor: tourSel(TOUR_TARGETS.payments.modal.clientSearch),
      },
      {
        id: 'p5',
        title: 'Elige el cliente',
        body: [
          'Busca y selecciona el cliente que te está pagando.',
          'La lista se filtra mientras escribes.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.modal.clientSearch),
        waitFor: tourSel(TOUR_TARGETS.payments.modal.clientSearch),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'p6',
        title: 'Confirma el valor y la fecha',
        body: [
          'Revisa el monto recibido y ajusta la fecha si es necesario.',
          'El sistema sugerirá el saldo pendiente.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.modal.details),
        waitFor: tourSel(TOUR_TARGETS.payments.modal.details),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'p7',
        title: 'Revisa los cobros registrados',
        body: [
          'Aquí puedes ver todos los abonos ya aplicados.',
          'Útil para corregir errores o validar entradas.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.tabs.all),
        placement: 'bottom',
      },
      {
        id: 'p8',
        title: 'No olvides revisar vencidos',
        body: [
          'Esta vista te ayuda a priorizar lo que requiere seguimiento hoy.',
          'Puedes enviar recordatorios desde aquí.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.tabs.overdue),
        placement: 'bottom',
      },
    ],
  },
};

const expensesModule: TourModule = {
  id: 'expenses',
  title: 'Gastos',
  description: 'Registra egresos y ubica recurrentes o categorias sin perder tiempo.',
  route: '/expenses',
  tour: {
    id: 'expenses.expert',
    title: 'Registrar un gasto completo',
    duration: '3 min',
    steps: [
      {
        id: 'e1',
        title: 'Aquí quedan tus egresos',
        body: [
          'Esta pantalla concentra el historial, las categorías y el acceso para crear gastos.',
          'Las pestañas separan lo ya ocurrido de lo programado y análisis.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.panel),
        route: '/expenses',
        placement: 'bottom',
      },
      {
        id: 'e2',
        title: 'Revisa los indicadores rápidos',
        body: [
          'Estos KPIs te muestran comportamiento, compromisos recurrentes y deudas.',
          'Útil antes de registrar un nuevo gasto.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.kpis),
        placement: 'top',
      },
      {
        id: 'e3',
        title: 'Filtra antes de buscar',
        body: [
          'Usa esta barra para reducir por periodo, categoría o texto.',
          'En móvil está dentro del menú de filtros.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.filters),
        placement: 'right',
      },
      {
        id: 'e4',
        title: 'Crear un gasto',
        body: [
          'Usa este acceso para registrar una salida real de dinero.',
          'Haz clic para continuar.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.primaryAction),
        placement: 'left',
        allowInteraction: true,
        waitFor: tourSel(TOUR_TARGETS.expenses.modal.description),
      },
      {
        id: 'e5',
        title: 'Completa los datos básicos',
        body: [
          'Descripción, categoría y valor son la base para que caja y reportes queden bien.',
          'Adjunta un comprobante si lo tienes.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.modal.description),
        waitFor: tourSel(TOUR_TARGETS.expenses.modal.description),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'e6',
        title: 'Confirma el gasto',
        body: [
          'Revisa los datos y guarda el registro.',
          'El sistema lo reflejará enDashboard y reportes.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.modal.confirm),
        waitFor: tourSel(TOUR_TARGETS.expenses.modal.confirm),
        placement: 'right',
        allowInteraction: true,
      },
      {
        id: 'e7',
        title: 'Gestiona categorías',
        body: [
          'Aquí puedes crear o editar categorías personalizadas.',
          'Útil para organizar mejor tus reportes.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.category),
        placement: 'bottom',
      },
      {
        id: 'e8',
        title: 'Revisa programados (si aplica)',
        body: [
          'Si tienes el plan PRO, aquí verás gastos recurrentes.',
          'Puedes editar o pausar compromisos mensuales.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.recurring),
        placement: 'bottom',
      },
    ],
  },
};

const productsModule: TourModule = {
  id: 'products',
  title: 'Productos',
  description: 'Mantiene catalogo, stock comercial y herramientas de precios.',
  route: '/products',
  tour: {
    id: 'products.expert',
    title: 'Ordenar catalogo y stock',
    duration: '5 min',
    steps: [
      {
        id: 'pr1',
        title: 'Productos y servicios en un solo lugar',
        body: [
          'Aquí organizas lo que vendes y encuentras sus herramientas operativas.',
          'Puedes crear, editar o archivar productos según necesites.',
        ],
        selector: tourSel(TOUR_TARGETS.products.panel),
        route: '/products',
        placement: 'bottom',
      },
      {
        id: 'pr2',
        title: 'Lee el resumen del catálogo',
        body: [
          'Los indicadores te ayudan a ver stock, archivados y valor general del catálogo.',
          'Haz clic en un KPI para ver más detalle si lo necesitas.',
        ],
        selector: tourSel(TOUR_TARGETS.products.kpis),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'pr3',
        title: 'Filtra antes de editar',
        body: [
          'Busca por nombre o SKU y aplica filtros de estado, tipo o stock.',
          'Escribe algo para probar cómo funciona el filtro.',
        ],
        selector: tourSel(TOUR_TARGETS.products.search),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'pr4',
        title: 'Usa las vistas según la tarea',
        body: [
          'Catálogo sirve para vender, Inventario para stock real y Precios para revisar cálculos o ajustes.',
          'Prueba cambiando de pestaña para ver las diferentes vistas.',
        ],
        selector: tourSel(TOUR_TARGETS.products.tabs.inventory),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'pr5',
        title: 'Crea un nuevo producto',
        body: [
          'Si necesitas agregar algo al catálogo, usa este botón.',
          'El modal te guiará por los datos básicos necesarios.',
        ],
        selector: tourSel(TOUR_TARGETS.products.primaryAction),
        placement: 'left',
        allowInteraction: true,
        waitFor: tourSel(TOUR_TARGETS.products.modal.form),
      },
      {
        id: 'pr6',
        title: 'Completa los datos básicos',
        body: [
          'Nombre, precio y tipo son los campos mínimos necesarios.',
          'Puedes agregar más detalles después si lo requieres.',
        ],
        selector: tourSel(TOUR_TARGETS.products.modal.form),
        waitFor: tourSel(TOUR_TARGETS.products.modal.form),
        placement: 'right',
        allowInteraction: true,
      },
    ],
  },
};

const invoicesModule: TourModule = {
  id: 'invoices',
  title: 'Facturas',
  description: 'Ubica estados, acciones clave y accesos para emitir, configurar o sincronizar.',
  route: '/invoices',
  tour: {
    id: 'invoices.expert',
    title: 'Entender el modulo de facturas',
    duration: '4 min',
    steps: [
      {
        id: 'i1',
        title: 'Este módulo organiza tus documentos',
        body: [
          'Aquí ves el historial de facturas y los accesos para crear, configurar o revisar cartera.',
          'Puedes emitir, sincronizar o hacer seguimiento desde aquí.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.panel),
        route: '/invoices',
        placement: 'bottom',
      },
      {
        id: 'i2',
        title: 'Filtra y revisa estados',
        body: [
          'Usa esta zona para buscar borradores, vencidas, pagadas o un cliente específico.',
          'Escribe algo para probar cómo funciona el filtro.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.filters),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'i3',
        title: 'Lee primero el resumen',
        body: [
          'Estos indicadores te dicen cuánto facturaste, cuánto sigue pendiente y cuántos borradores quedan.',
          'Haz clic en una tarjeta para ver más detalle.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.summary),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'i4',
        title: 'La tabla es tu centro de seguimiento',
        body: [
          'Desde aquí revisas estado, saldo, cliente y acceso al detalle de cada documento.',
          'Haz clic en una factura para ver su detalle.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.table),
        placement: 'top',
        allowInteraction: true,
      },
      {
        id: 'i5',
        title: 'Crea una nueva factura',
        body: [
          'Usa este botón para emitir una nueva factura.',
          'El sistema te guiará por los pasos necesarios.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.primaryAction),
        placement: 'left',
        allowInteraction: true,
        waitFor: tourSel(TOUR_TARGETS.invoices.modal.form),
      },
      {
        id: 'i6',
        title: 'Configura ajustes de facturación',
        body: [
          'Aquí puedes ajustar numeración, plantillas o configuraciones específicas.',
          'Útil si necesitas personalizar el formato.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.settings),
        placement: 'left',
        allowInteraction: true,
      },
      {
        id: 'i7',
        title: 'Accede a la cartera de facturas',
        body: [
          'Desde aquí saltas directamente a cartera para gestionar cobros.',
          'No necesitas salir a buscar esa herramienta en otra parte del menú.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.receivables),
        placement: 'bottom',
        allowInteraction: true,
      },
    ],
  },
};

const invoiceReceivablesModule: TourModule = {
  id: 'invoice-receivables',
  title: 'Cartera de facturas',
  description: 'Prioriza cobranza segun saldo, vencimiento y cliente.',
  route: '/invoices/receivables',
  tour: {
    id: 'invoice-receivables.expert',
    title: 'Cobrar desde la cartera de facturas',
    duration: '4 min',
    steps: [
      {
        id: 'ir1',
        title: 'Esta vista esta pensada para recaudo',
        body: [
          'Aqui el foco es saldo pendiente, vencimiento y accion de cobro por factura.',
        ],
        selector: tourSel(TOUR_TARGETS.invoiceReceivables.panel),
        route: '/invoices/receivables',
        placement: 'bottom',
      },
      {
        id: 'ir2',
        title: 'Filtra antes de llamar o escribir',
        body: [
          'Busca por cliente, estado, rango de fechas o texto libre para priorizar mejor.',
        ],
        selector: tourSel(TOUR_TARGETS.invoiceReceivables.filters),
        placement: 'bottom',
      },
      {
        id: 'ir3',
        title: 'Diferencia saldo pendiente y saldo vencido',
        body: [
          'El resumen superior te ayuda a decidir donde empezar el seguimiento.',
        ],
        selector: tourSel(TOUR_TARGETS.invoiceReceivables.summary),
        placement: 'bottom',
      },
      {
        id: 'ir4',
        title: 'Desde la tabla disparas la accion',
        body: [
          'Puedes abrir recordatorio, estado de cuenta o detalle de la factura segun necesites.',
        ],
        selector: tourSel(TOUR_TARGETS.invoiceReceivables.table),
        placement: 'top',
      },
    ],
  },
};

const rawInventoryModule: TourModule = {
  id: 'raw-inventory',
  title: 'Bodega',
  description: 'Controla materias primas, movimientos y minimos de inventario.',
  route: '/raw-inventory',
  tour: {
    id: 'raw-inventory.expert',
    title: 'Mover y cuidar la bodega',
    duration: '5 min',
    steps: [
      {
        id: 'ri1',
        title: 'Bodega vive separada del catalogo comercial',
        body: [
          'Aqui controlas insumos y materias primas, no los productos que vendes al cliente final.',
        ],
        selector: tourSel(TOUR_TARGETS.rawInventory.panel),
        route: '/raw-inventory',
        placement: 'bottom',
      },
      {
        id: 'ri2',
        title: 'Filtra por nombre o stock bajo',
        body: [
          'Usa estos filtros para enfocarte en lo urgente o encontrar un material rapido.',
        ],
        selector: tourSel(TOUR_TARGETS.rawInventory.filters),
        placement: 'bottom',
      },
      {
        id: 'ri3',
        title: 'La lista te muestra el estado real',
        body: [
          'Aqui comparas stock actual, minimo y costo referencial antes de decidir un movimiento.',
        ],
        selector: tourSel(TOUR_TARGETS.rawInventory.list),
        placement: 'top',
      },
      {
        id: 'ri4',
        title: 'El detalle concentra movimientos y trazabilidad',
        body: [
          'Cuando seleccionas un insumo, esta zona te ayuda a entender entradas, salidas y ajustes.',
        ],
        selector: tourSel(TOUR_TARGETS.rawInventory.movement),
        placement: 'left',
        optional: true,
      },
      {
        id: 'ri5',
        title: 'Abre el detalle para ver historial',
        body: [
          'Cuando necesites entradas, salidas o ajustes, el detalle te muestra la trazabilidad.',
        ],
        selector: tourSel(TOUR_TARGETS.rawInventory.detail),
        placement: 'left',
        optional: true,
      },
    ],
  },
};

const settingsModule: TourModule = {
  id: 'settings',
  title: 'Configuracion',
  description: 'Ubica donde cambia cada cosa: perfil, negocio, experiencia, plantillas y plan.',
  route: '/settings',
  tour: {
    id: 'settings.expert',
    title: 'Configurar sin perderse',
    duration: '3 min',
    steps: [
      {
        id: 'st1',
        title: 'Esta pantalla reune los ajustes importantes',
        body: [
          'Aqui vives entre perfil, negocio, personalizacion, plantillas y membresia.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.panel),
        route: '/settings',
        placement: 'right',
      },
      {
        id: 'st2',
        title: 'Perfil y negocio primero',
        body: [
          'Empieza por estas pestañas cuando necesites corregir informacion base del negocio activo.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.business),
        placement: 'right',
      },
      {
        id: 'st3',
        title: 'Personalizacion cambia la experiencia',
        body: [
          'Si tu operacion cambio, aqui puedes ajustar la experiencia y modulos sugeridos.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.personalization),
        placement: 'right',
        optional: true,
      },
      {
        id: 'st4',
        title: 'Plantillas y membresia',
        body: [
          'Plantillas sirve para mensajes frecuentes. Membresia te muestra plan, cobro y upgrade.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.billing),
        placement: 'right',
        optional: true,
      },
    ],
  },
};

const personalizationModule: TourModule = {
  id: 'personalization',
  title: 'Personalizacion',
  description: 'Adapta la app al tipo de negocio, a las areas activas y al menu que quieres priorizar.',
  route: '/settings?tab=personalization',
  tour: {
    id: 'personalization.expert',
    title: 'Ajustar la experiencia del negocio',
    duration: '5 min',
    steps: [
      {
        id: 'ps1',
        title: 'Esta pantalla adapta la app a tu operacion',
        body: [
          'Personalizacion no cambia tus datos historicos.',
          'Sirve para ordenar la experiencia, las areas activas y el menu del negocio.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.personalizationPanel),
        route: '/settings?tab=personalization',
        placement: 'bottom',
      },
      {
        id: 'ps2',
        title: 'Empieza por la base del negocio',
        body: [
          'Aqui eliges el tipo de operacion que mejor describe tu negocio.',
          'Eso ajusta recomendaciones de areas y menu sin borrar configuracion existente.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.personalizationBase),
        placement: 'bottom',
      },
      {
        id: 'ps3',
        title: 'Activa solo las areas que realmente usas',
        body: [
          'Esta seccion te ayuda a encender o apagar areas del negocio con menos ruido.',
          'Lo ideal es dejar primero lo esencial y sumar lo opcional despues.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.personalizationModules),
        placement: 'bottom',
      },
      {
        id: 'ps4',
        title: 'Ordena lo que ves primero al entrar',
        body: [
          'Desde aqui priorizas accesos principales, visibles y ocultos.',
          'Esto cambia el menu del usuario actual en este negocio, no los permisos del equipo.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.personalizationMenu),
        placement: 'bottom',
      },
      {
        id: 'ps5',
        title: 'Confirma la vista final antes de salir',
        body: [
          'La vista previa te deja revisar como quedara el menu en desktop y movil.',
          'Usala para validar que la app refleje tu flujo real antes de seguir operando.',
        ],
        selector: tourSel(TOUR_TARGETS.settings.personalizationPreview),
        placement: 'top',
      },
    ],
  },
};

const treasuryModule: TourModule = {
  id: 'treasury',
  title: 'Caja y bancos',
  description: 'Lee saldos, cuentas y movimientos reales sin perder trazabilidad.',
  route: '/treasury',
  tour: {
    id: 'treasury.expert',
    title: 'Leer caja y movimientos reales',
    duration: '4 min',
    steps: [
      {
        id: 'ty1',
        title: 'Esta vista concentra el dinero real del negocio',
        body: [
          'Aqui lees cajas, bancos y billeteras desde el negocio activo.',
          'Te sirve para revisar saldos y movimientos antes de tomar decisiones operativas.',
        ],
        selector: tourSel(TOUR_TARGETS.treasury.panel),
        route: '/treasury',
        placement: 'bottom',
      },
      {
        id: 'ty2',
        title: 'Filtra antes de sacar conclusiones',
        body: [
          'Busca por cuenta, tipo o rango de fechas para reducir ruido y revisar solo lo que importa.',
        ],
        selector: tourSel(TOUR_TARGETS.treasury.filters),
        placement: 'bottom',
      },
      {
        id: 'ty3',
        title: 'Las cuentas te muestran donde vive cada saldo',
        body: [
          'Aqui organizas caja, bancos y billeteras, con una cuenta principal y su historial.',
        ],
        selector: tourSel(TOUR_TARGETS.treasury.accounts),
        placement: 'right',
      },
      {
        id: 'ty4',
        title: 'Agrega o ajusta cuentas cuando administras tesoreria',
        body: [
          'Si tu rol puede operar cuentas, este acceso sirve para crear nuevas o mantenerlas actualizadas.',
        ],
        selector: tourSel(TOUR_TARGETS.treasury.primaryAction),
        placement: 'left',
        optional: true,
      },
      {
        id: 'ty5',
        title: 'Los movimientos te explican entradas y salidas',
        body: [
          'Aqui validas cobros, gastos, pagos y transferencias con trazabilidad por cuenta.',
        ],
        selector: tourSel(TOUR_TARGETS.treasury.movements),
        placement: 'left',
      },
    ],
  },
};

const teamRolesModule: TourModule = {
  id: 'team-roles',
  title: 'Equipo y roles',
  description: 'Organiza colaboradores, invitaciones y permisos finos para el negocio.',
  route: '/settings?tab=team',
  tour: {
    id: 'team-roles.expert',
    title: 'Organizar equipo y permisos',
    duration: '5 min',
    steps: [
      {
        id: 'tr1',
        title: 'Aqui administras el trabajo compartido',
        body: [
          'Esta vista sirve para ordenar colaboradores, invitaciones y seguimiento del equipo.',
        ],
        selector: tourSel(TOUR_TARGETS.teamWorkspace.panel),
        route: '/settings?tab=team',
        placement: 'bottom',
      },
      {
        id: 'tr2',
        title: 'Filtra antes de intervenir',
        body: [
          'Usa estos filtros para encontrar rapido miembros activos, invitados o un rol especifico.',
        ],
        selector: tourSel(TOUR_TARGETS.teamWorkspace.filters),
        placement: 'bottom',
      },
      {
        id: 'tr3',
        title: 'Invita cuando realmente administras el equipo',
        body: [
          'Este acceso abre la invitacion de nuevos miembros para el negocio actual.',
        ],
        selector: tourSel(TOUR_TARGETS.teamWorkspace.invite),
        placement: 'left',
        optional: true,
      },
      {
        id: 'tr4',
        title: 'Los roles viven en una vista separada',
        body: [
          'Cuando el negocio usa control fino, aqui defines plantillas y permisos por rol.',
        ],
        selector: tourSel(TOUR_TARGETS.roleManagement.panel),
        route: '/settings?tab=roles',
        placement: 'bottom',
      },
      {
        id: 'tr5',
        title: 'Empieza por la lista de roles',
        body: [
          'Selecciona un rol primero para revisar su alcance antes de editar permisos.',
        ],
        selector: tourSel(TOUR_TARGETS.roleManagement.list),
        placement: 'right',
      },
      {
        id: 'tr6',
        title: 'La matriz muestra exactamente que puede hacer cada rol',
        body: [
          'Aqui activas o quitas permisos por categoria para proteger areas sensibles sin improvisar.',
        ],
        selector: tourSel(TOUR_TARGETS.roleManagement.permissions),
        placement: 'left',
      },
    ],
  },
};

const invoiceSyncModule: TourModule = {
  id: 'invoice-sync',
  title: 'Sync de facturas',
  description: 'Entiende la cola offline y como resolver reintentos o conflictos.',
  route: '/invoices/sync',
  tour: {
    id: 'invoice-sync.expert',
    title: 'Leer la cola de sincronizacion',
    duration: '3 min',
    steps: [
      {
        id: 'is1',
        title: 'Esta es la cola offline de facturas',
        body: [
          'Aqui ves que cambios quedaron pendientes o presentaron conflicto cuando volvio la conexion.',
        ],
        selector: tourSel(TOUR_TARGETS.invoiceSync.panel),
        route: '/invoices/sync',
        placement: 'bottom',
      },
      {
        id: 'is2',
        title: 'Empieza por el resumen',
        body: [
          'Pendientes, conflictos, fallos y bloqueadas te dicen que requiere accion inmediata.',
        ],
        selector: tourSel(TOUR_TARGETS.invoiceSync.summary),
        placement: 'bottom',
      },
      {
        id: 'is3',
        title: 'La tabla te explica cada caso',
        body: [
          'Desde aqui puedes reintentar, usar la version del servidor o quitar una operacion ya resuelta.',
        ],
        selector: tourSel(TOUR_TARGETS.invoiceSync.table),
        placement: 'top',
      },
    ],
  },
};

const customersModule: TourModule = {
  id: 'customers',
  title: 'Clientes',
  description: 'Revisa clientes, detalle y contexto comercial.',
  route: '/customers',
  tour: {
    id: 'customers.expert',
    title: 'Leer mejor tu base de clientes',
    duration: '3 min',
    steps: [
      {
        id: 'c1',
        title: 'Aquí administras tu base de clientes',
        body: [
          'La lista y el detalle te ayudan a revisar historial, saldo y datos de contacto.',
          'Puedes crear nuevos clientes o editar los existentes.',
        ],
        selector: tourSel(TOUR_TARGETS.customers.panel),
        route: '/customers',
        placement: 'bottom',
      },
      {
        id: 'c2',
        title: 'Usa los filtros para encontrar clientes',
        body: [
          'Busca por nombre, filtra por estado o ajusta la vista.',
          'Escribe algo para probar cómo funciona el filtro.',
        ],
        selector: tourSel(TOUR_TARGETS.customers.filters),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'c3',
        title: 'Empieza por la lista',
        body: [
          'Busca, filtra y elige un cliente para abrir su detalle.',
          'Haz clic en un cliente para ver su información completa.',
        ],
        selector: tourSel(TOUR_TARGETS.customers.table),
        placement: 'top',
        allowInteraction: true,
      },
      {
        id: 'c4',
        title: 'El detalle concentra el contexto',
        body: [
          'Historial, pagos y seguimiento viven aquí cuando seleccionas un cliente.',
          'Puedes ver saldo, dirección y registrar pagos.',
        ],
        selector: tourSel(TOUR_TARGETS.customers.detail),
        placement: 'left',
        allowInteraction: true,
      },
      {
        id: 'c5',
        title: 'Crea un nuevo cliente',
        body: [
          'Si necesitas agregar alguien nuevo, usa este botón.',
          'El modal te guiará por los datos básicos necesarios.',
        ],
        targets: {
          desktop: { selector: tourSel(TOUR_TARGETS.customers.primaryAction.desktop), placement: 'left' },
          mobile: { selector: tourSel(TOUR_TARGETS.customers.primaryAction.mobile), placement: 'bottom' },
        },
        placement: 'left',
        allowInteraction: true,
        waitFor: tourSel(TOUR_TARGETS.customers.modal.form),
      },
      {
        id: 'c6',
        title: 'Completa los datos básicos',
        body: [
          'Nombre y contacto son los campos mínimos necesarios.',
          'Puedes agregar más detalles después si lo requieres.',
        ],
        selector: tourSel(TOUR_TARGETS.customers.modal.form),
        waitFor: tourSel(TOUR_TARGETS.customers.modal.form),
        placement: 'right',
        allowInteraction: true,
      },
    ],
  },
};

const quotesModule: TourModule = {
  id: 'quotes',
  title: 'Cotizaciones',
  description: 'Prepara propuestas y conviértelas a venta cuando el cliente confirme.',
  route: '/quotes',
  tour: {
    id: 'quotes.expert',
    title: 'Crear y convertir cotizaciones con contexto',
    duration: '5 min',
    steps: [
      {
        id: 'q1',
        title: 'Aqui vives las propuestas antes de vender',
        body: [
          'Cotizaciones sirve para proponer, negociar y decidir antes de generar la venta real.',
        ],
        selector: tourSel(TOUR_TARGETS.quotes.panel),
        route: '/quotes',
        placement: 'bottom',
      },
      {
        id: 'q2',
        title: 'Filtra por estado, fecha o cliente',
        body: [
          'Usa estos filtros para separar borradores, propuestas enviadas, vencidas o convertidas.',
        ],
        selector: tourSel(TOUR_TARGETS.quotes.filters),
        placement: 'bottom',
      },
      {
        id: 'q3',
        title: 'Empieza una nueva cotizacion desde aqui',
        body: [
          'Este acceso abre el flujo para crear la propuesta sin mezclarla aun con ventas reales.',
        ],
        selector: tourSel(TOUR_TARGETS.quotes.primaryAction),
        placement: 'left',
        allowInteraction: true,
      },
      {
        id: 'q4',
        title: 'Primero define el contexto comercial',
        body: [
          'Cliente, emision, vencimiento y estado te ayudan a dejar clara la propuesta desde el inicio.',
        ],
        selector: tourSel(TOUR_TARGETS.quotes.modal.context),
        waitFor: tourSel(TOUR_TARGETS.quotes.modal.context),
        placement: 'bottom',
      },
      {
        id: 'q5',
        title: 'Los items explican exactamente lo que propones',
        body: [
          'Puedes mezclar productos del catalogo con conceptos libres y dejar el total listo para negociar.',
        ],
        selector: tourSel(TOUR_TARGETS.quotes.modal.items),
        waitFor: tourSel(TOUR_TARGETS.quotes.modal.items),
        placement: 'top',
      },
      {
        id: 'q6',
        title: 'Guarda la propuesta cuando ya este clara',
        body: [
          'Despues podras enviarla, ajustar su estado o convertirla explicitamente a venta cuando el cliente confirme.',
        ],
        selector: tourSel(TOUR_TARGETS.quotes.modal.confirm),
        waitFor: tourSel(TOUR_TARGETS.quotes.modal.confirm),
        placement: 'bottom',
      },
    ],
  },
};

const suppliersModule: TourModule = {
  id: 'suppliers',
  title: 'Proveedores',
  description: 'Centraliza terceros operativos, compras asociadas y contexto pendiente.',
  route: '/suppliers',
  tour: {
    id: 'suppliers.expert',
    title: 'Organizar proveedores con contexto operativo',
    duration: '4 min',
    steps: [
      {
        id: 'sp1',
        title: 'Aqui administras tus proveedores operativos',
        body: [
          'Esta vista te ayuda a unificar abastecimiento, compras relacionadas y saldo operativo por proveedor.',
        ],
        selector: tourSel(TOUR_TARGETS.suppliers.panel),
        route: '/suppliers',
        placement: 'bottom',
      },
      {
        id: 'sp2',
        title: 'Filtra antes de entrar al detalle',
        body: [
          'Busca por nombre o contacto y decide si necesitas incluir proveedores inactivos.',
        ],
        selector: tourSel(TOUR_TARGETS.suppliers.filters),
        placement: 'bottom',
      },
      {
        id: 'sp3',
        title: 'La tabla resume compras y saldos',
        body: [
          'Aqui ves actividad reciente, compras registradas y obligaciones abiertas del proveedor.',
        ],
        selector: tourSel(TOUR_TARGETS.suppliers.table),
        placement: 'top',
      },
      {
        id: 'sp4',
        title: 'Crea un proveedor cuando realmente lo necesites',
        body: [
          'Usa este acceso para dejar listo el tercero antes de registrar compras o obligaciones operativas.',
        ],
        selector: tourSel(TOUR_TARGETS.suppliers.primaryAction),
        placement: 'left',
        allowInteraction: true,
      },
      {
        id: 'sp5',
        title: 'Captura la identidad y el contacto base',
        body: [
          'Nombre, contacto y notas bastan para dejar el proveedor listo sin sobrecargar el formulario.',
        ],
        selector: tourSel(TOUR_TARGETS.suppliers.modal.form),
        waitFor: tourSel(TOUR_TARGETS.suppliers.modal.form),
        placement: 'bottom',
      },
      {
        id: 'sp6',
        title: 'Guarda y vuelve al flujo operativo',
        body: [
          'Despues podras asociar este proveedor en compras, obligaciones o seguimiento detallado.',
        ],
        selector: tourSel(TOUR_TARGETS.suppliers.modal.confirm),
        waitFor: tourSel(TOUR_TARGETS.suppliers.modal.confirm),
        placement: 'bottom',
      },
    ],
  },
};

const rawPurchasesModule: TourModule = {
  id: 'raw-purchases',
  title: 'Compras de insumos',
  description: 'Registra abastecimiento y confirma su impacto en bodega y obligaciones.',
  route: '/raw-purchases',
  tour: {
    id: 'raw-purchases.expert',
    title: 'Registrar compras de insumos con trazabilidad',
    duration: '5 min',
    steps: [
      {
        id: 'rp1',
        title: 'Este modulo une compra, stock y traza financiera',
        body: [
          'Aqui registras compras de insumos antes de confirmar su impacto en bodega, caja o por pagar.',
        ],
        selector: tourSel(TOUR_TARGETS.rawPurchases.panel),
        route: '/raw-purchases',
        placement: 'bottom',
      },
      {
        id: 'rp2',
        title: 'Empieza por búsqueda y estado',
        body: [
          'Usa estos filtros para separar borradores, compras confirmadas o registros cancelados.',
        ],
        selector: tourSel(TOUR_TARGETS.rawPurchases.filters),
        placement: 'bottom',
      },
      {
        id: 'rp3',
        title: 'Abre un borrador de compra desde aqui',
        body: [
          'Primero guardas el borrador y luego decides si la confirmacion impacta caja o genera una obligación operativa.',
        ],
        selector: tourSel(TOUR_TARGETS.rawPurchases.primaryAction),
        placement: 'left',
        allowInteraction: true,
      },
      {
        id: 'rp4',
        title: 'Define fecha, proveedor y contexto',
        body: [
          'Esta cabecera deja claro qué se está comprando, cuándo y con qué proveedor.',
        ],
        selector: tourSel(TOUR_TARGETS.rawPurchases.modal.form),
        waitFor: tourSel(TOUR_TARGETS.rawPurchases.modal.form),
        placement: 'bottom',
      },
      {
        id: 'rp5',
        title: 'Los items explican exactamente qué entra a bodega',
        body: [
          'Selecciona materias primas, cantidad y costo para que el total y la trazabilidad queden bien calculados.',
        ],
        selector: tourSel(TOUR_TARGETS.rawPurchases.modal.items),
        waitFor: tourSel(TOUR_TARGETS.rawPurchases.modal.items),
        placement: 'top',
      },
      {
        id: 'rp6',
        title: 'Guarda el borrador y confirma después',
        body: [
          'La confirmacion es el momento en que decides si la compra impacta caja o si queda por pagar.',
        ],
        selector: tourSel(TOUR_TARGETS.rawPurchases.modal.confirm),
        waitFor: tourSel(TOUR_TARGETS.rawPurchases.modal.confirm),
        placement: 'bottom',
      },
    ],
  },
};

const recipesModule: TourModule = {
  id: 'recipes',
  title: 'Recetas',
  description: 'Relaciona productos con insumos y registra consumos explícitos.',
  route: '/recipes',
  tour: {
    id: 'recipes.expert',
    title: 'Definir recetas y consumos con trazabilidad',
    duration: '5 min',
    steps: [
      {
        id: 'rc1',
        title: 'Aqui defines la formula operativa del producto',
        body: [
          'Recetas conecta productos con materias primas para costear mejor y registrar consumos explícitos.',
        ],
        selector: tourSel(TOUR_TARGETS.recipes.panel),
        route: '/recipes',
        placement: 'bottom',
      },
      {
        id: 'rc2',
        title: 'Filtra por receta, producto o estado',
        body: [
          'Usa estos controles para encontrar fórmulas activas, inactivas o específicas de un producto.',
        ],
        selector: tourSel(TOUR_TARGETS.recipes.filters),
        placement: 'bottom',
      },
      {
        id: 'rc3',
        title: 'Crea una receta nueva desde aqui',
        body: [
          'Este flujo sirve para definir la fórmula base antes de empezar a registrar consumos.',
        ],
        selector: tourSel(TOUR_TARGETS.recipes.primaryAction),
        placement: 'left',
        allowInteraction: true,
      },
      {
        id: 'rc4',
        title: 'Primero define producto y nombre',
        body: [
          'Empieza identificando claramente para qué producto aplica la receta y cómo la reconocerá tu equipo.',
        ],
        selector: tourSel(TOUR_TARGETS.recipes.modal.form),
        waitFor: tourSel(TOUR_TARGETS.recipes.modal.form),
        placement: 'bottom',
      },
      {
        id: 'rc5',
        title: 'Los insumos describen la formula por unidad',
        body: [
          'Selecciona materia prima, cantidad y notas para dejar lista la base de costo y consumo.',
        ],
        selector: tourSel(TOUR_TARGETS.recipes.modal.items),
        waitFor: tourSel(TOUR_TARGETS.recipes.modal.items),
        placement: 'top',
      },
      {
        id: 'rc6',
        title: 'Guarda la receta cuando ya esté clara',
        body: [
          'Luego podrás revisarla, costearla mejor o usarla para registrar consumos explícitos con trazabilidad.',
        ],
        selector: tourSel(TOUR_TARGETS.recipes.modal.confirm),
        waitFor: tourSel(TOUR_TARGETS.recipes.modal.confirm),
        placement: 'bottom',
      },
    ],
  },
};

const costCalculatorModule: TourModule = {
  id: 'cost-calculator',
  title: 'Calculadora de costos',
  description: 'Simula costos sin mover stock ni tocar historial.',
  route: '/cost-calculator',
  tour: {
    id: 'cost-calculator.expert',
    title: 'Simular costos antes de cambiar la operación',
    duration: '4 min',
    steps: [
      {
        id: 'cc1',
        title: 'Esta herramienta sirve para simular con seguridad',
        body: [
          'La calculadora te ayuda a decidir antes de tocar recetas, stock o catálogo.',
        ],
        selector: tourSel(TOUR_TARGETS.costCalculator.panel),
        route: '/cost-calculator',
        placement: 'bottom',
      },
      {
        id: 'cc2',
        title: 'Empieza definiendo qué quieres costear',
        body: [
          'Puedes costear sobre un producto existente o simular primero con una referencia libre.',
        ],
        selector: tourSel(TOUR_TARGETS.costCalculator.scope),
        placement: 'bottom',
      },
      {
        id: 'cc3',
        title: 'Las materias primas son la base del costeo',
        body: [
          'Selecciona insumos, cantidades y costos manuales solo cuando necesites corregir una referencia temporal.',
        ],
        selector: tourSel(TOUR_TARGETS.costCalculator.materials),
        placement: 'top',
      },
      {
        id: 'cc4',
        title: 'Luego define extras y calcula',
        body: [
          'Empaque, mano de obra y precio deseado te ayudan a comparar escenarios antes de guardar algo definitivo.',
        ],
        selector: tourSel(TOUR_TARGETS.costCalculator.actions),
        placement: 'top',
      },
      {
        id: 'cc5',
        title: 'Lee el resultado antes de guardar',
        body: [
          'Aquí comparas costo total, costo unitario, precio sugerido y faltantes antes de aplicar cambios reales.',
        ],
        selector: tourSel(TOUR_TARGETS.costCalculator.result),
        placement: 'left',
      },
    ],
  },
};

const reportsModule: TourModule = {
  id: 'reports',
  title: 'Reportes',
  description: 'Genera y personaliza reportes para entender resultados y tomar decisiones.',
  route: '/reports',
  tour: {
    id: 'reports.expert',
    title: 'Generar reportes útiles',
    duration: '5 min',
    steps: [
      {
        id: 'r1',
        title: 'Aquí analizas tus resultados',
        body: [
          'Esta pantalla te ayuda a revisar resultados, comparativos y rentabilidad sin improvisar.',
          'Puedes generar reportes personalizados según lo que necesites analizar.',
        ],
        selector: tourSel(TOUR_TARGETS.reports.panel),
        route: '/reports',
        placement: 'bottom',
      },
      {
        id: 'r2',
        title: 'Usa los filtros para acotar el análisis',
        body: [
          'Filtra por periodo, tipo de reporte o categorías para enfocarte en lo relevante.',
          'Escribe algo o selecciona opciones para probar cómo funciona.',
        ],
        selector: tourSel(TOUR_TARGETS.reports.filters),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'r3',
        title: 'Cambia de tipo de reporte',
        body: [
          'Ventas, gastos, rentabilidad y otros análisis están disponibles.',
          'Prueba cambiando de pestaña para ver las diferentes vistas.',
        ],
        selector: tourSel(TOUR_TARGETS.reports.tabs.sales),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'r4',
        title: 'Genera el reporte personalizado',
        body: [
          'Cuando tengas los filtros listos, genera el reporte para ver los resultados.',
          'El sistema procesará los datos y mostrará el análisis correspondiente.',
        ],
        selector: tourSel(TOUR_TARGETS.reports.generate),
        placement: 'left',
        allowInteraction: true,
        waitFor: tourSel(TOUR_TARGETS.reports.content),
      },
      {
        id: 'r5',
        title: 'Revisa los resultados del reporte',
        body: [
          'Aquí verás los datos procesados según los filtros que aplicaste.',
          'Puedes hacer clic en elementos para ver más detalle.',
        ],
        selector: tourSel(TOUR_TARGETS.reports.content),
        waitFor: tourSel(TOUR_TARGETS.reports.content),
        placement: 'top',
        allowInteraction: true,
      },
      {
        id: 'r6',
        title: 'Exporta cuando necesites compartir',
        body: [
          'Usa esta opción para exportar el reporte a Excel o PDF.',
          'Útil para presentaciones o análisis externos.',
        ],
        selector: tourSel(TOUR_TARGETS.reports.export),
        placement: 'left',
        allowInteraction: true,
      },
    ],
  },
};

const ordersModule: TourModule = {
  id: 'orders',
  title: 'Pedidos',
  description: 'Gestiona pedidos y su tablero de seguimiento.',
  route: '/orders',
  tour: {
    id: 'orders.expert',
    title: 'Seguir pedidos',
    duration: '3 min',
    steps: [
      {
        id: 'o1',
        title: 'Panel de seguimiento de pedidos',
        body: [
          'Este módulo sirve para seguir compromisos y estados del pedido.',
          'Puedes ver Kanban o Lista según lo que necesites hacer.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.panel),
        route: '/orders',
        placement: 'bottom',
      },
      {
        id: 'o2',
        title: 'Crea un nuevo pedido',
        body: [
          'Este botón abre el flujo para cargar un pedido nuevo.',
          'Haz clic para continuar.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.primaryAction),
        placement: 'left',
        allowInteraction: true,
        waitFor: tourSel(TOUR_TARGETS.orders.modal.search),
      },
      {
        id: 'o3',
        title: 'Busca y selecciona productos',
        body: [
          'Escribe para encontrar productos rápidos y agrégalos al carrito.',
          'El sistema mostrará stock y precios.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.modal.search),
        waitFor: tourSel(TOUR_TARGETS.orders.modal.search),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'o4',
        title: 'Revisa el carrito',
        body: [
          'Aquí puedes ajustar cantidades o eliminar antes de continuar.',
          'El total se actualiza en tiempo real.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.modal.cart),
        waitFor: tourSel(TOUR_TARGETS.orders.modal.cart),
        placement: 'right',
        allowInteraction: true,
      },
      {
        id: 'o5',
        title: 'Asigna el cliente',
        body: [
          'Selecciona el cliente que realiza el pedido.',
          'Puedes buscar por nombre o ver los recientes.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.modal.client),
        waitFor: tourSel(TOUR_TARGETS.orders.modal.client),
        placement: 'bottom',
        allowInteraction: true,
      },
      {
        id: 'o6',
        title: 'Gestiona la configuración del módulo',
        body: [
          'Aquí ajustas columnas, estados y opciones del tablero.',
          'Útil para adaptar el flujo a tu operación.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.settings),
        placement: 'left',
      },
      {
        id: 'o7',
        title: 'Usa filtros para reducir el ruido',
        body: [
          'Filtra por estado, texto o periodo para encontrar pedidos específicos.',
          'En móvil está dentro del menú de filtros.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.filters),
        placement: 'bottom',
      },
      {
        id: 'o8',
        title: 'Revisa el tablero Kanban',
        body: [
          'Arrastra pedidos entre columnas para cambiar su estado.',
          'Ideal para seguimiento visual rápido.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.board),
        placement: 'top',
      },
      {
        id: 'o9',
        title: 'Usa la lista para detalles',
        body: [
          'La vista lista muestra más datos y permite búsquedas rápidas.',
          'Útil para auditoría o acciones masivas.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.card),
        placement: 'top',
      },
    ],
  },
};

export const tourModules: Record<string, TourModule> = {
  'onboarding.basic': onboardingBasic,
  'onboarding.pro': onboardingPro,
  'onboarding.business': onboardingBusiness,
  dashboard: dashboardModule,
  sales: salesModule,
  payments: paymentsModule,
  expenses: expensesModule,
  products: productsModule,
  customers: customersModule,
  quotes: quotesModule,
  suppliers: suppliersModule,
  'raw-purchases': rawPurchasesModule,
  recipes: recipesModule,
  'cost-calculator': costCalculatorModule,
  invoices: invoicesModule,
  'invoice-receivables': invoiceReceivablesModule,
  'raw-inventory': rawInventoryModule,
  settings: settingsModule,
  personalization: personalizationModule,
  treasury: treasuryModule,
  'team-roles': teamRolesModule,
  'invoice-sync': invoiceSyncModule,
  orders: ordersModule,
  reports: reportsModule,
};

export const tours: Record<string, Tour> = Object.values(tourModules).reduce((acc, module) => {
  acc[module.tour.id] = module.tour;
  return acc;
}, {} as Record<string, Tour>);

export const getTourById = (id: string): Tour | undefined => tours[id];
