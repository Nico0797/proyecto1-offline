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
          'No intenta reemplazar todos los modulos.',
          'Te ayuda a decidir que atender primero.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.panel),
        route: '/dashboard',
        placement: 'bottom',
      },
      {
        id: 'db2',
        title: 'Empieza por los indicadores',
        body: [
          'Ventas, gastos y saldos te dan una lectura rapida del momento.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.kpis),
        placement: 'bottom',
      },
      {
        id: 'db3',
        title: 'Cambia de vista segun la pregunta',
        body: [
          'Usa Caja cuando necesites operacion diaria.',
          'Usa Analisis cuando quieras mas detalle.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.tabs.balance),
        placement: 'bottom',
      },
      {
        id: 'db4',
        title: 'Ventas recientes y pendientes',
        body: [
          'Estas tarjetas te ayudan a revisar lo recien registrado y lo que aun pide seguimiento.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.charts),
        placement: 'top',
      },
      {
        id: 'db5',
        title: 'Si algo exige atencion, suele aparecer aqui',
        body: [
          'Pendientes, alertas o recordatorios viven en esta zona del tablero.',
        ],
        selector: tourSel(TOUR_TARGETS.dashboard.alerts),
        placement: 'left',
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
        title: 'Busca lo que vas a vender',
        body: [
          'Empieza buscando productos o servicios por nombre o SKU.',
          'Si trabajas con escaner, este es el paso donde normalmente arrancas.',
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
        title: 'Aqui decides a quien cobrar primero',
        body: [
          'La pantalla combina clientes con saldo, cobros registrados y cuentas por vencer.',
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
        ],
        selector: tourSel(TOUR_TARGETS.payments.kpis),
        placement: 'bottom',
      },
      {
        id: 'p3',
        title: 'Filtra por cliente o periodo',
        body: [
          'Usa esta barra para reducir el ruido antes de registrar un abono.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.search),
        placement: 'bottom',
      },
      {
        id: 'p4',
        title: 'Registrar un cobro',
        body: [
          'Desde aqui abres el flujo para aplicar el pago al cliente correcto.',
        ],
        targets: {
          desktop: { selector: tourSel(TOUR_TARGETS.payments.primaryAction.desktop), placement: 'left' },
          mobile: { selector: tourSel(TOUR_TARGETS.payments.primaryAction.mobile), placement: 'bottom' },
        },
        placement: 'left',
      },
      {
        id: 'p5',
        title: 'Elige el cliente y registra el valor',
        body: [
          'Primero seleccionas el cliente. Luego indicas el valor recibido y la fecha del pago.',
        ],
        selector: tourSel(TOUR_TARGETS.payments.modal.clientSearch),
        waitFor: tourSel(TOUR_TARGETS.payments.modal.clientSearch),
        placement: 'bottom',
      },
      {
        id: 'p6',
        title: 'No olvides revisar vencidos',
        body: [
          'Esta vista te ayuda a priorizar lo que requiere seguimiento hoy.',
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
        title: 'Aqui quedan tus egresos',
        body: [
          'Esta pantalla concentra el historial, las categorias y el acceso para crear gastos.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.panel),
        route: '/expenses',
        placement: 'bottom',
      },
      {
        id: 'e2',
        title: 'Crear un gasto',
        body: [
          'Usa este acceso para registrar una salida real de dinero.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.primaryAction),
        placement: 'left',
      },
      {
        id: 'e3',
        title: 'Completa los datos basicos',
        body: [
          'Descripcion, categoria y valor son la base para que caja y reportes queden bien.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.modal.description),
        waitFor: tourSel(TOUR_TARGETS.expenses.modal.description),
        placement: 'right',
      },
      {
        id: 'e4',
        title: 'Revisa los indicadores y recurrentes',
        body: [
          'Despues de registrar gastos, aqui podras revisar comportamiento y compromisos repetidos.',
        ],
        selector: tourSel(TOUR_TARGETS.expenses.kpis),
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
          'Aqui organizas lo que vendes y encuentras sus herramientas operativas.',
        ],
        selector: tourSel(TOUR_TARGETS.products.panel),
        route: '/products',
        placement: 'bottom',
      },
      {
        id: 'pr2',
        title: 'Lee el resumen del catalogo',
        body: [
          'Los indicadores te ayudan a ver stock, archivados y valor general del catalogo.',
        ],
        selector: tourSel(TOUR_TARGETS.products.kpis),
        placement: 'bottom',
      },
      {
        id: 'pr3',
        title: 'Filtra antes de editar',
        body: [
          'Busca por nombre o SKU y aplica filtros de estado, tipo o stock.',
        ],
        selector: tourSel(TOUR_TARGETS.products.search),
        placement: 'bottom',
      },
      {
        id: 'pr4',
        title: 'Usa las vistas segun la tarea',
        body: [
          'Catalogo sirve para vender, Inventario para stock real y Precios para revisar calculos o ajustes.',
        ],
        selector: tourSel(TOUR_TARGETS.products.tabs.inventory),
        placement: 'bottom',
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
        title: 'Este modulo organiza tus documentos',
        body: [
          'Aqui ves el historial de facturas y los accesos para crear, configurar o revisar cartera.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.panel),
        route: '/invoices',
        placement: 'bottom',
      },
      {
        id: 'i2',
        title: 'Filtra y revisa estados',
        body: [
          'Usa esta zona para buscar borradores, vencidas, pagadas o un cliente especifico.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.filters),
        placement: 'bottom',
      },
      {
        id: 'i3',
        title: 'Lee primero el resumen',
        body: [
          'Estos indicadores te dicen cuanto facturaste, cuanto sigue pendiente y cuantos borradores quedan.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.summary),
        placement: 'bottom',
      },
      {
        id: 'i4',
        title: 'La tabla es tu centro de seguimiento',
        body: [
          'Desde aqui revisas estado, saldo, cliente y acceso al detalle de cada documento.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.table),
        placement: 'top',
      },
      {
        id: 'i5',
        title: 'Desde aqui saltas a cartera, ajustes o sync',
        body: [
          'No necesitas salir a buscar esas herramientas en otra parte del menu.',
        ],
        selector: tourSel(TOUR_TARGETS.invoices.receivables),
        placement: 'bottom',
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
        title: 'Aqui administras tu base de clientes',
        body: [
          'La lista y el detalle te ayudan a revisar historial, saldo y datos de contacto.',
        ],
        selector: tourSel(TOUR_TARGETS.customers.panel),
        route: '/customers',
        placement: 'bottom',
      },
      {
        id: 'c2',
        title: 'Empieza por la lista',
        body: [
          'Busca, filtra y elige un cliente para abrir su detalle.',
        ],
        selector: tourSel(TOUR_TARGETS.customers.table),
        placement: 'top',
      },
      {
        id: 'c3',
        title: 'El detalle concentra el contexto',
        body: [
          'Historial, pagos y seguimiento viven aqui cuando seleccionas un cliente.',
        ],
        selector: tourSel(TOUR_TARGETS.customers.detail),
        placement: 'left',
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
        title: 'Panel de pedidos',
        body: [
          'Este modulo sirve para seguir compromisos y estados del pedido.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.panel),
        route: '/orders',
        placement: 'bottom',
      },
      {
        id: 'o2',
        title: 'Crea un pedido desde aqui',
        body: [
          'Este boton abre el flujo para cargar un pedido nuevo.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.primaryAction),
        placement: 'left',
      },
      {
        id: 'o3',
        title: 'El tablero muestra el avance',
        body: [
          'Usa el tablero para revisar cada estado del proceso.',
        ],
        selector: tourSel(TOUR_TARGETS.orders.board),
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
  customers: customersModule,
  payments: paymentsModule,
  expenses: expensesModule,
  products: productsModule,
  invoices: invoicesModule,
  'invoice-receivables': invoiceReceivablesModule,
  'raw-inventory': rawInventoryModule,
  settings: settingsModule,
  personalization: personalizationModule,
  'invoice-sync': invoiceSyncModule,
  orders: ordersModule,
};

export const tours: Record<string, Tour> = Object.values(tourModules).reduce((acc, module) => {
  acc[module.tour.id] = module.tour;
  return acc;
}, {} as Record<string, Tour>);

export const getTourById = (id: string): Tour | undefined => tours[id];
