export type HelpCategory =
  | 'empezar'
  | 'ventas'
  | 'cobros'
  | 'clientes'
  | 'productos'
  | 'gastos'
  | 'reportes'
  | 'alertas'
  | 'pro'
  | 'cuenta';

export type HelpTutorial = {
  id: string;          // moduleId del sistema de tutoriales
  title: string;
  description: string;
  route: string;
};

export type HelpFaq = {
  id: string;
  category: HelpCategory;
  question: string;
  answer: string;
  relatedTutorialId?: string; // id de tutorial para abrir
};

export type HelpTip = {
  id: string;
  category: 'negocio' | 'app';
  text: string;
};

export const CATEGORIES: { id: HelpCategory; label: string }[] = [
  { id: 'empezar', label: 'Empezar' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'cobros', label: 'Cobros' },
  { id: 'clientes', label: 'Clientes' },
  { id: 'productos', label: 'Productos' },
  { id: 'gastos', label: 'Gastos' },
  { id: 'reportes', label: 'Reportes' },
  { id: 'alertas', label: 'Alertas' },
  { id: 'pro', label: 'Pro' },
  { id: 'cuenta', label: 'Cuenta' },
];

export const TUTORIALS: HelpTutorial[] = [
  { id: 'dashboard', title: 'Dashboard: tabs y recordatorios', description: 'Navega Hoy, Balance, Analíticas y gestiona recordatorios.', route: '/dashboard' },
  { id: 'sales', title: 'Ventas: contado y fiado', description: 'Registra ventas pagadas o fiadas, aplica descuentos y comparte por WhatsApp.', route: '/sales' },
  { id: 'customers', title: 'Clientes: deudas y plazos', description: 'Detecta vencidos, edita plazo, revisa top clientes.', route: '/customers' },
  { id: 'payments', title: 'Pagos/Abonos: cobranza', description: 'Aplica pagos automáticos o manuales, estados de cuenta y vencidas.', route: '/payments' },
  { id: 'expenses', title: 'Gastos: rápido y recurrentes', description: 'Registra gastos, agenda recurrentes y arma presupuestos.', route: '/expenses' },
  { id: 'products', title: 'Productos: stock y precios', description: 'Gestiona inventario, precios y ajustes masivos.', route: '/products' },
  { id: 'orders', title: 'Pedidos: Kanban', description: 'Gestiona pedidos con tablero, arrastra y cambia estados.', route: '/orders' },
  { id: 'reports', title: 'Reportes: filtros y export', description: 'Filtra reportes, compara periodos y exporta CSV.', route: '/reports' },
  { id: 'alerts', title: 'Alertas: resolver y posponer', description: 'Gestiona alertas, pospone y comparte por WhatsApp.', route: '/alerts' },
  { id: 'settings', title: 'Configuración: plantillas y negocio', description: 'Configura tu negocio y plantillas de WhatsApp.', route: '/settings' },
];

export const FAQS: HelpFaq[] = [
  { id: 'q1', category: 'empezar', question: '¿Qué es el ticket promedio?', answer: 'El ticket promedio es ventas totales / número de ventas en el periodo.', relatedTutorialId: 'reports' },
  { id: 'q2', category: 'empezar', question: '¿Qué es utilidad y margen?', answer: 'Utilidad = ingresos - costos. Margen = utilidad / ingresos.', relatedTutorialId: 'reports' },
  { id: 'q3', category: 'empezar', question: '¿Cómo iniciar el tutorial inicial?', answer: 'Entra a Ayuda → Iniciar tutorial inicial o desde la bienvenida.', relatedTutorialId: 'dashboard' },
  { id: 'q4', category: 'reportes', question: '¿Por qué no carga Balance?', answer: 'Verifica API_BASE_URL, el servidor (HTTP 404/500) y tu conexión.', relatedTutorialId: 'dashboard' },
  { id: 'q5', category: 'cobros', question: '¿Cómo funciona fiado y vencimiento?', answer: 'Un fiado crea una cuenta por cobrar con plazo. Vencido si supera los días de crédito.', relatedTutorialId: 'customers' },
  { id: 'q6', category: 'ventas', question: '¿Cómo registrar una venta pagada?', answer: 'Ve a Ventas → Nueva venta y marca método de pago contado.', relatedTutorialId: 'sales' },
  { id: 'q7', category: 'ventas', question: '¿Cómo registrar una venta fiada?', answer: 'En Nueva venta elige “Fiado” y asocia cliente.', relatedTutorialId: 'sales' },
  { id: 'q8', category: 'ventas', question: '¿Cómo aplicar descuentos?', answer: 'En Nueva venta, ingresa % o valor en la sección de descuentos.', relatedTutorialId: 'sales' },
  { id: 'q9', category: 'ventas', question: '¿Cómo enviar el resumen de venta por WhatsApp?', answer: 'En Detalle de venta, usa el botón WhatsApp para generar mensaje.', relatedTutorialId: 'sales' },
  { id: 'q10', category: 'cobros', question: '¿Cómo aplicar un pago automáticamente?', answer: 'En Pagos/Abonos, selecciona cliente y aplica a facturas abiertas.', relatedTutorialId: 'payments' },
  { id: 'q11', category: 'cobros', question: '¿Cómo aplicar pagos manuales?', answer: 'En Pagos/Abonos, elige facturas exactas a cubrir.', relatedTutorialId: 'payments' },
  { id: 'q12', category: 'cobros', question: '¿Cómo ver estado de cuenta?', answer: 'En Clientes → Detalle, abre Estado de cuenta y exporta.', relatedTutorialId: 'customers' },
  { id: 'q13', category: 'clientes', question: '¿Cómo ver deudas vencidas?', answer: 'En Clientes, filtra por “Vencidos” o usa Reportes de cartera.', relatedTutorialId: 'customers' },
  { id: 'q14', category: 'clientes', question: '¿Cómo editar días de crédito?', answer: 'En Clientes → Ajustes de crédito, actualiza el plazo.', relatedTutorialId: 'customers' },
  { id: 'q15', category: 'productos', question: '¿Cómo ajustar precios masivamente?', answer: 'En Productos → Herramientas de Precios, usa ajuste por % o valor.', relatedTutorialId: 'products' },
  { id: 'q16', category: 'gastos', question: '¿Cómo registrar gasto rápido?', answer: 'En Dashboard o Gastos → Gasto rápido.', relatedTutorialId: 'expenses' },
  { id: 'q17', category: 'gastos', question: '¿Cómo crear gastos recurrentes?', answer: 'En Gastos → Recurrentes, agenda la periodicidad.', relatedTutorialId: 'expenses' },
  { id: 'q18', category: 'reportes', question: '¿Cómo exportar reportes?', answer: 'En Reportes elige periodo y haz clic en “Exportar”.', relatedTutorialId: 'reports' },
  { id: 'q19', category: 'pro', question: '¿Cómo pasar a Pro?', answer: 'Ve a Configuración → Membresía y elige tu plan.', relatedTutorialId: 'settings' },
  { id: 'q20', category: 'alertas', question: '¿Cómo resolver o posponer alertas?', answer: 'En Alertas abre la alerta y elige “Resolver” o “Posponer”.', relatedTutorialId: 'alerts' },
];

export const TIPS: HelpTip[] = [
  { id: 't1', category: 'negocio', text: 'Define metas semanales de ventas y mídete con reportes.' },
  { id: 't2', category: 'app', text: 'Usa “Recurrentes” para no olvidar pagos de servicios.' },
  { id: 't3', category: 'negocio', text: 'Sube tus precios gradualmente si el margen cae.' },
  { id: 't4', category: 'app', text: 'Exporta CSV de reportes para análisis en hojas de cálculo.' },
  { id: 't5', category: 'negocio', text: 'Premia a tus mejores clientes con descuentos por volumen.' },
  { id: 't6', category: 'app', text: 'Usa filtros de productos para encontrar bajas de stock.' },
  { id: 't7', category: 'negocio', text: 'Revisa el ticket promedio cada quincena.' },
  { id: 't8', category: 'app', text: 'Comparte ventas por WhatsApp para confirmar cobros.' },
  { id: 't9', category: 'negocio', text: 'Agrupa gastos por categoría para detectar excesos.' },
  { id: 't10', category: 'app', text: 'Usa “Ajustes masivos” para alinear precios al dólar.' },
  { id: 't11', category: 'negocio', text: 'Negocia mejores precios con proveedores clave.' },
  { id: 't12', category: 'app', text: 'Documenta conceptos en Notas rápidas del negocio.' },
  { id: 't13', category: 'negocio', text: 'Conserva margen ≥ 30% para estabilidad.' },
  { id: 't14', category: 'app', text: 'Activa tema oscuro para trabajar de noche.' },
  { id: 't15', category: 'negocio', text: 'Evita fiado sin referencias del cliente.' },
  { id: 't16', category: 'app', text: 'Duplica productos para crear variantes más rápido.' },
  { id: 't17', category: 'negocio', text: 'Define presupuesto de gastos mensuales.' },
  { id: 't18', category: 'app', text: 'Revisa Alertas todos los días antes de abrir.' },
  { id: 't19', category: 'negocio', text: 'Haz corte de caja diario y concilia.' },
  { id: 't20', category: 'app', text: 'Usa atajos para navegar más rápido (ver sección de atajos).' },
];

export const TOOLS = {
  atajos: [
    { key: 'Ctrl + K', desc: 'Buscar/Comando' },
    { key: 'Alt + N', desc: 'Nueva venta' },
    { key: 'Alt + G', desc: 'Gasto rápido' },
    { key: 'Alt + C', desc: 'Clientes' },
    { key: 'Alt + P', desc: 'Productos' },
  ]
};

