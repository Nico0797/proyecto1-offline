import { canAccessFeatureInPlan, FeatureKey, getPlanName, isPlanAtLeast } from '../auth/plan';
import { BUSINESS_MODULE_META, BusinessModuleKey, isBusinessModuleEnabled, type Business } from '../types';

export const LEARNING_CENTER_VERSION = '2026-03-help-v2';

export type LearningCategoryId =
  | 'getting-started'
  | 'daily-workflows'
  | 'money'
  | 'inventory'
  | 'settings'
  | 'sync'
  | 'troubleshooting';

export type LearningTutorialId =
  | 'onboarding.basic'
  | 'onboarding.pro'
  | 'onboarding.business'
  | 'dashboard'
  | 'sales'
  | 'payments'
  | 'expenses'
  | 'products'
  | 'invoices'
  | 'invoice-receivables'
  | 'raw-inventory'
  | 'settings'
  | 'personalization'
  | 'invoice-sync';

export type LearningAudience = 'basic' | 'pro' | 'business';

export type LearningVisibilityRule = {
  moduleKey?: BusinessModuleKey;
  feature?: FeatureKey;
  permission?: string;
  minimumPlan?: 'basic' | 'pro' | 'business';
  showLocked?: boolean;
};

export type LearningTutorialDefinition = {
  id: LearningTutorialId;
  title: string;
  summary: string;
  route: string;
  tourId: string;
  categoryId: LearningCategoryId;
  estimatedTime: string;
  whenToUse: string;
  outcomes: string[];
  visibility?: LearningVisibilityRule;
  audience?: LearningAudience[];
  isOnboarding?: boolean;
  spotlight?: boolean;
};

export type LearningCategoryDefinition = {
  id: LearningCategoryId;
  label: string;
  description: string;
};

export type LearningFaqItem = {
  id: string;
  categoryId: LearningCategoryId;
  question: string;
  answer: string;
  relatedTutorialId?: LearningTutorialId;
};

export type LearningGuideCard = {
  id: string;
  categoryId: LearningCategoryId;
  title: string;
  body: string;
  route?: string;
};

export type LearningAccessSnapshot = {
  plan: string | null | undefined;
  business: Business | null | undefined;
  canAccessFeature: (feature: FeatureKey) => boolean;
  hasPermission: (permission?: string) => boolean;
};

export const LEARNING_CATEGORIES: LearningCategoryDefinition[] = [
  {
    id: 'getting-started',
    label: 'Primeros pasos',
    description: 'Que mirar primero para entender el negocio activo y registrar el primer movimiento con confianza.',
  },
  {
    id: 'daily-workflows',
    label: 'Trabajo diario',
    description: 'Las acciones que mas se repiten durante el dia: vender, cobrar, gastar y revisar pendientes.',
  },
  {
    id: 'money',
    label: 'Dinero y recaudo',
    description: 'Facturas, cartera, reportes y seguimiento del dinero que entra o sigue pendiente.',
  },
  {
    id: 'inventory',
    label: 'Inventario y produccion',
    description: 'Catalogo comercial, bodega, insumos, compras y costo base cuando el negocio lo necesita.',
  },
  {
    id: 'settings',
    label: 'Configuracion',
    description: 'Cuenta, negocio, personalizacion, membresia y acceso del equipo.',
  },
  {
    id: 'sync',
    label: 'Offline y sync',
    description: 'Que pasa cuando trabajas sin internet y como revisar la cola de sincronizacion.',
  },
  {
    id: 'troubleshooting',
    label: 'Preguntas utiles',
    description: 'Aclaraciones practicas para dudas frecuentes y pasos de verificacion rapidos.',
  },
];

export const LEARNING_TUTORIALS: LearningTutorialDefinition[] = [
  {
    id: 'onboarding.basic',
    title: 'Recorrido inicial',
    summary: 'Una vista guiada del tablero, ventas, productos, gastos y ajustes basicos para empezar bien.',
    route: '/dashboard',
    tourId: 'onboarding.basic',
    categoryId: 'getting-started',
    estimatedTime: '3 min',
    whenToUse: 'Ideal en el primer ingreso o cuando quieres reubicarte en la app actual.',
    outcomes: [
      'Entender que significa el inicio',
      'Saber donde registrar ventas y gastos',
      'Reconocer donde ajustar negocio y membresia',
    ],
    audience: ['basic'],
    isOnboarding: true,
    spotlight: true,
  },
  {
    id: 'onboarding.pro',
    title: 'Recorrido inicial',
    summary: 'Introduce el inicio, ventas, cobros, reportes y configuracion para negocios que ya necesitan mas seguimiento.',
    route: '/dashboard',
    tourId: 'onboarding.pro',
    categoryId: 'getting-started',
    estimatedTime: '4 min',
    whenToUse: 'Ideal cuando el negocio ya necesita ver cobros y reportes desde el principio.',
    outcomes: [
      'Ubicar modulos clave del negocio actual',
      'Entender donde seguir cartera y reportes',
      'Saber como reabrir ayuda y ajustar el negocio',
    ],
    audience: ['pro'],
    isOnboarding: true,
    spotlight: true,
  },
  {
    id: 'onboarding.business',
    title: 'Recorrido inicial',
    summary: 'Resume inicio, ventas, cobros, reportes y bodega para operaciones con inventario de insumos y mas control.',
    route: '/dashboard',
    tourId: 'onboarding.business',
    categoryId: 'getting-started',
    estimatedTime: '5 min',
    whenToUse: 'Ideal cuando el negocio trabaja con insumos, compras o produccion y necesita una vista mas completa.',
    outcomes: [
      'Ver donde esta cada flujo esencial del negocio actual',
      'Identificar donde seguir cartera, reportes y bodega',
      'Saber como volver a ayuda cuando el equipo cambie',
    ],
    audience: ['business'],
    isOnboarding: true,
    spotlight: true,
  },
  {
    id: 'dashboard',
    title: 'Entender el inicio',
    summary: 'Aprende que significa cada zona del dashboard y como usarlo para decidir que atender primero.',
    route: '/dashboard',
    tourId: 'dashboard.expert',
    categoryId: 'getting-started',
    estimatedTime: '4 min',
    whenToUse: 'Cuando quieres leer el inicio con mas criterio en vez de solo mirar numeros.',
    outcomes: [
      'Distinguir resumen, caja, analisis y pendientes',
      'Saber cuando abrir alertas, cobros o reportes',
      'Entender que acciones rapidas usar cada dia',
    ],
    spotlight: true,
  },
  {
    id: 'sales',
    title: 'Registrar una venta',
    summary: 'Recorre el flujo real de venta, carrito, cliente, cobro y cierre para no perder pasos importantes.',
    route: '/sales',
    tourId: 'sales.expert',
    categoryId: 'daily-workflows',
    estimatedTime: '6 min',
    whenToUse: 'Cuando quieres registrar ventas con menos errores y entender fiado, descuentos y comprobantes.',
    outcomes: [
      'Agregar productos y revisar el carrito',
      'Entender contado, fiado y cliente casual',
      'Cerrar la venta con el metodo de pago correcto',
    ],
    visibility: {
      permission: 'sales.create',
    },
    spotlight: true,
  },
  {
    id: 'payments',
    title: 'Cobrar saldos pendientes',
    summary: 'Aprende a revisar clientes con saldo, registrar abonos y priorizar vencidos o por vencer.',
    route: '/payments',
    tourId: 'payments.expert',
    categoryId: 'daily-workflows',
    estimatedTime: '4 min',
    whenToUse: 'Cuando quieres convertir cartera en recaudo y no solo guardar pagos sueltos.',
    outcomes: [
      'Detectar primero lo vencido o urgente',
      'Registrar un abono desde el flujo correcto',
      'Entender donde revisar el historial de cobros',
    ],
    visibility: {
      moduleKey: 'accounts_receivable',
      permission: 'payments.create',
    },
    spotlight: true,
  },
  {
    id: 'expenses',
    title: 'Registrar un gasto',
    summary: 'Te muestra el flujo corto para registrar egresos y la vista donde revisar recurrentes y categorias.',
    route: '/expenses',
    tourId: 'expenses.expert',
    categoryId: 'daily-workflows',
    estimatedTime: '3 min',
    whenToUse: 'Cuando quieres que la caja y los reportes reflejen lo que realmente salio del negocio.',
    outcomes: [
      'Crear un gasto con descripcion y categoria',
      'Ubicar recurrentes y pendientes programados',
      'Entender donde se revisa el historial',
    ],
    visibility: {
      permission: 'expenses.create',
    },
  },
  {
    id: 'products',
    title: 'Productos e inventario comercial',
    summary: 'Repasa catalogo, stock, filtros y herramientas de precios para mantener ordenado lo que vendes.',
    route: '/products',
    tourId: 'products.expert',
    categoryId: 'inventory',
    estimatedTime: '5 min',
    whenToUse: 'Cuando necesitas crear productos, revisar stock o ajustar precios con criterio.',
    outcomes: [
      'Crear productos y servicios',
      'Revisar stock y ajustes rapidos',
      'Encontrar herramientas de precios',
    ],
    visibility: {
      moduleKey: 'products',
      permission: 'products.read',
    },
  },
  {
    id: 'invoices',
    title: 'Emitir facturas',
    summary: 'Ubica el listado de facturas, sus estados, configuracion del documento y accesos para compartir o cobrar.',
    route: '/invoices',
    tourId: 'invoices.expert',
    categoryId: 'money',
    estimatedTime: '4 min',
    whenToUse: 'Cuando el negocio ya factura y quieres entender la diferencia entre emitir, enviar y recaudar.',
    outcomes: [
      'Reconocer estados de factura y listado',
      'Abrir cartera, ajustes y sync desde la misma vista',
      'Saber donde crear una nueva factura',
    ],
    visibility: {
      moduleKey: 'sales',
      permission: 'invoices.view',
    },
  },
  {
    id: 'invoice-receivables',
    title: 'Seguimiento de cartera por facturas',
    summary: 'Aprende a filtrar facturas pendientes, revisar saldos y preparar recordatorios desde la vista de cartera.',
    route: '/invoices/receivables',
    tourId: 'invoice-receivables.expert',
    categoryId: 'money',
    estimatedTime: '4 min',
    whenToUse: 'Cuando ya emites facturas y quieres cobrar con prioridad segun saldo, vencimiento y cliente.',
    outcomes: [
      'Filtrar la cartera por estado o cliente',
      'Distinguir saldo pendiente y vencido',
      'Abrir recordatorios y estados de cuenta',
    ],
    visibility: {
      moduleKey: 'accounts_receivable',
      permission: 'receivables.view',
    },
  },
  {
    id: 'raw-inventory',
    title: 'Bodega, insumos y movimientos',
    summary: 'Recorre materias primas, filtros, movimientos y detalle para negocios con compras, recetas o produccion.',
    route: '/raw-inventory',
    tourId: 'raw-inventory.expert',
    categoryId: 'inventory',
    estimatedTime: '5 min',
    whenToUse: 'Cuando necesitas separar la bodega del catalogo comercial y controlar insumos con trazabilidad.',
    outcomes: [
      'Crear materias primas y definir minimos',
      'Registrar entradas, salidas y ajustes',
      'Entender el detalle y el historial de movimientos',
    ],
    visibility: {
      moduleKey: 'raw_inventory',
      permission: 'raw_inventory.read',
    },
    audience: ['business'],
  },
  {
    id: 'settings',
    title: 'Configuracion, personalizacion y membresia',
    summary: 'Te ubica en perfil, negocio, personalizacion, plantillas, equipo y membresia segun tu acceso.',
    route: '/settings',
    tourId: 'settings.expert',
    categoryId: 'settings',
    estimatedTime: '3 min',
    whenToUse: 'Cuando necesitas ajustar el negocio, entender tu plan o revisar donde cambia cada cosa.',
    outcomes: [
      'Saber que ajustar en perfil, negocio y personalizacion',
      'Ubicar plantillas y membresia',
      'Entender donde revisar permisos o historial del negocio',
    ],
    spotlight: true,
  },
  {
    id: 'personalization',
    title: 'Personalizar la experiencia del negocio',
    summary: 'Explica como adaptar la app al tipo de negocio, activar areas, ordenar el menu y revisar la vista final.',
    route: '/settings?tab=personalization',
    tourId: 'personalization.expert',
    categoryId: 'settings',
    estimatedTime: '5 min',
    whenToUse: 'Cuando quieres que la app refleje mejor tu operacion real sin tocar logica del negocio.',
    outcomes: [
      'Elegir la base que mejor describe tu negocio',
      'Activar o desactivar areas segun lo que realmente usas',
      'Ordenar el menu y revisar como quedara la experiencia final',
    ],
    visibility: {
      permission: 'business.update',
    },
    spotlight: true,
  },
  {
    id: 'invoice-sync',
    title: 'Trabajar offline y revisar sincronizacion',
    summary: 'Aprende a revisar la cola offline de facturas, reintentar cambios y resolver conflictos sin improvisar.',
    route: '/invoices/sync',
    tourId: 'invoice-sync.expert',
    categoryId: 'sync',
    estimatedTime: '3 min',
    whenToUse: 'Cuando trabajas sin internet o quieres entender que significa pendiente, conflicto o bloqueada.',
    outcomes: [
      'Leer la cola offline con contexto',
      'Reintentar o descartar cambios locales de forma segura',
      'Saber cuando una operacion esta esperando otra',
    ],
    visibility: {
      moduleKey: 'sales',
      permission: 'invoices.view',
    },
  },
];

export const LEARNING_GUIDE_CARDS: LearningGuideCard[] = [
  {
    id: 'first-setup',
    categoryId: 'getting-started',
    title: 'Antes de empezar a operar',
    body: 'Revisa el negocio activo, moneda, dias de credito y modulos habilitados. Si algo no encaja con tu operacion, ajustalo en Configuracion antes de cargar mas datos.',
    route: '/settings?tab=business',
  },
  {
    id: 'subscriptions',
    categoryId: 'settings',
    title: 'Tu plan cambia lo que enseña Ayuda',
    body: 'El centro de ayuda filtra tutoriales segun el plan y modulos activos del negocio. Si haces upgrade, aqui apareceran los recorridos nuevos del plan.',
    route: '/settings?tab=membership',
  },
  {
    id: 'personalization-basics',
    categoryId: 'settings',
    title: 'Personalizacion no cambia tus datos, cambia tu experiencia',
    body: 'Usa Personalizacion para definir la base del negocio, activar areas y ordenar el menu. Sirve para adaptar la app a tu flujo sin tocar ventas, clientes o movimientos ya registrados.',
    route: '/settings?tab=personalization',
  },
  {
    id: 'raw-inventory-ecosystem',
    categoryId: 'inventory',
    title: 'Bodega no reemplaza Productos',
    body: 'Productos sirve para vender. Bodega sirve para materias primas, compras, proveedores y recetas. Si tu negocio produce o transforma, usa ambos segun el flujo.',
    route: '/raw-inventory',
  },
  {
    id: 'offline-basics',
    categoryId: 'sync',
    title: 'Que pasa si te quedas sin internet',
    body: 'La app puede dejar cambios pendientes y luego enviarlos al servidor. Si algo queda bloqueado o en conflicto, revisa la pantalla de Sync de facturas para decidir si reintentas o descartas.',
    route: '/invoices/sync',
  },
];

export const LEARNING_FAQS: LearningFaqItem[] = [
  {
    id: 'faq-1',
    categoryId: 'troubleshooting',
    question: 'Por que Ayuda no me muestra todos los tutoriales?',
    answer: 'Ayuda filtra por plan, modulos activos y acceso del negocio actual. Si cambias de negocio o haces upgrade, la lista puede cambiar.',
  },
  {
    id: 'faq-2',
    categoryId: 'troubleshooting',
    question: 'Como vuelvo a abrir el recorrido inicial?',
    answer: 'En Primeros pasos encontraras el recorrido inicial de tu plan. Puedes repetirlo cuantas veces necesites desde el mismo centro de ayuda.',
    relatedTutorialId: 'dashboard',
  },
  {
    id: 'faq-3',
    categoryId: 'troubleshooting',
    question: 'Cuando uso Cobros y cuando uso Cartera de facturas?',
    answer: 'Cobros sigue saldos de clientes y abonos operativos. Cartera de facturas se enfoca en documentos emitidos, vencimientos y recaudo por factura.',
    relatedTutorialId: 'invoice-receivables',
  },
  {
    id: 'faq-4',
    categoryId: 'troubleshooting',
    question: 'Si un tutorial no apunta al lugar correcto, que hago?',
    answer: 'Puedes saltarlo, seguir con la operacion y abrir soporte desde esta misma pantalla. El sistema guarda tu progreso por negocio para no interrumpirte de nuevo.',
  },
  {
    id: 'faq-5',
    categoryId: 'troubleshooting',
    question: 'Que significa una operacion offline bloqueada?',
    answer: 'Normalmente significa que esa accion depende de otra pendiente, por ejemplo un pago esperando que primero se sincronice su factura o documento padre.',
    relatedTutorialId: 'invoice-sync',
  },
];

export const getOnboardingTutorialId = (plan: string | null | undefined, business?: Business | null): LearningTutorialId => {
  if (isBusinessModuleEnabled(business?.modules, 'raw_inventory')) {
    return 'onboarding.business';
  }

  if (isPlanAtLeast(plan, 'pro')) {
    return 'onboarding.pro';
  }

  return 'onboarding.basic';
};

export const isTutorialAccessible = (
  tutorial: LearningTutorialDefinition,
  access: LearningAccessSnapshot
) => {
  if (tutorial.isOnboarding && tutorial.id !== getOnboardingTutorialId(access.plan, access.business)) {
    return { visible: false, locked: false, reason: null as string | null };
  }

  const visibility = tutorial.visibility;

  if (!visibility) {
    return { visible: true, locked: false, reason: null as string | null };
  }

  if (visibility.minimumPlan && !isPlanAtLeast(access.plan, visibility.minimumPlan)) {
    if (visibility.showLocked) {
      return {
        visible: true,
        locked: true,
        reason: `Disponible desde ${getPlanName(visibility.minimumPlan)}`,
      };
    }

    return { visible: false, locked: false, reason: null as string | null };
  }

  if (visibility.moduleKey && !isBusinessModuleEnabled(access.business?.modules, visibility.moduleKey)) {
    if (visibility.showLocked) {
      return {
        visible: true,
        locked: true,
        reason: `${BUSINESS_MODULE_META[visibility.moduleKey].label} no esta activo en este negocio`,
      };
    }

    return { visible: false, locked: false, reason: null as string | null };
  }

  if (visibility.feature && !access.canAccessFeature(visibility.feature)) {
    if (visibility.showLocked) {
      return {
        visible: true,
        locked: true,
        reason: `Requiere acceso a ${visibility.feature}`,
      };
    }

    return { visible: false, locked: false, reason: null as string | null };
  }

  if (visibility.permission && !access.hasPermission(visibility.permission)) {
    if (visibility.showLocked) {
      return {
        visible: true,
        locked: true,
        reason: 'No tienes permisos suficientes para este recorrido',
      };
    }

    return { visible: false, locked: false, reason: null as string | null };
  }

  return { visible: true, locked: false, reason: null as string | null };
};

export const getVisibleLearningTutorials = (access: LearningAccessSnapshot) =>
  LEARNING_TUTORIALS
    .map((tutorial) => {
      const state = isTutorialAccessible(tutorial, access);
      return state.visible
        ? {
            ...tutorial,
            locked: state.locked,
            lockedReason: state.reason,
          }
        : null;
    })
    .filter((tutorial): tutorial is LearningTutorialDefinition & { locked: boolean; lockedReason: string | null } => !!tutorial);

export const getVisibleLearningCategories = (tutorials: Array<LearningTutorialDefinition & { locked: boolean }>) => {
  const visibleCategoryIds = new Set(tutorials.map((tutorial) => tutorial.categoryId));
  visibleCategoryIds.add('troubleshooting');
  return LEARNING_CATEGORIES.filter((category) => visibleCategoryIds.has(category.id));
};

export const isFeaturePotentiallyVisible = (tutorial: LearningTutorialDefinition, plan: string | null | undefined) => {
  if (!tutorial.visibility?.feature) return true;
  return canAccessFeatureInPlan(tutorial.visibility.feature, plan);
};
