import type { FeatureKey } from '../auth/plan';
import type { BusinessCommercialSectionKey } from '../config/businessPersonalization';
import type { BackendCapability } from '../config/backendCapabilities';
import type { BusinessModuleKey } from '../types';
import { TOUR_TARGETS, tourSel } from './tourTargets';
import type { TourStep } from './tourRegistry';
import type { TutorialRuntimeContext, TutorialSettingsSectionId } from './tutorialContext';

export type TutorialExperience = 'initial' | 'module' | 'deep';

export type TutorialGuard = {
  minimumPlan?: 'basic' | 'pro' | 'business';
  moduleKey?: BusinessModuleKey;
  permission?: string;
  visibleRoute?: string;
  settingsSection?: TutorialSettingsSectionId;
  feature?: FeatureKey;
  capability?: BackendCapability;
  commercialSection?: BusinessCommercialSectionKey;
};

export type TutorialStepRule = TutorialGuard & {
  selector?: string;
  optional?: boolean;
};

export type ResolvedTutorialSession = {
  id: string;
  title: string;
  experience: TutorialExperience;
  steps: TourStep[];
};

type BuilderDefinition = {
  id: string;
  title: string;
  experience: TutorialExperience;
  visibility?: TutorialGuard;
  buildSteps: (context: TutorialRuntimeContext) => TourStep[];
};

type RegistryDefinition = {
  id: string;
  title: string;
  experience: TutorialExperience;
  visibility?: TutorialGuard;
  baseTourId: string;
  stepRules?: Record<string, TutorialStepRule>;
};

export type TutorialCatalogEntry = BuilderDefinition | RegistryDefinition;

const buildWelcomeStep = (context: TutorialRuntimeContext): TourStep => ({
  id: 'init.welcome',
  route: '/dashboard',
  title: context.isFirstVisit ? 'Te voy a mostrar solo lo que sí te aplica' : 'Recorrido rearmado para tu negocio actual',
  body: [
    'Este recorrido se arma con tu plan, permisos, módulos activos y vistas realmente visibles.',
    'Si algo no existe en este negocio, el tutorial lo omite sin romper el flujo.',
  ],
});

const onboardingFragments = {
  dashboard: (): TourStep => ({
    id: 'init.dashboard',
    title: 'Empieza por el tablero',
    body: [
      'Aquí lees el estado del negocio antes de abrir otros módulos.',
      'Úsalo para decidir si hoy toca vender, cobrar, revisar caja o entrar a reportes.',
    ],
    route: '/dashboard',
    selector: tourSel(TOUR_TARGETS.dashboard.panel),
    placement: 'bottom',
  }),
  sales: (): TourStep => ({
    id: 'init.sales',
    title: 'Ventas como flujo principal',
    body: [
      'Este acceso es la puerta al flujo operativo diario.',
      'Desde aquí nace lo que luego impacta caja, cartera y reportes.',
    ],
    route: '/sales',
    selector: tourSel(TOUR_TARGETS.sales.panel),
    placement: 'bottom',
  }),
  products: (): TourStep => ({
    id: 'init.products',
    title: 'Productos cuando manejas catálogo',
    body: [
      'Aquí ordenas productos, servicios, stock comercial y precios.',
      'Si el negocio vende desde catálogo, esta pantalla es parte del flujo base.',
    ],
    route: '/products',
    selector: tourSel(TOUR_TARGETS.products.panel),
    placement: 'bottom',
  }),
  expenses: (): TourStep => ({
    id: 'init.expenses',
    title: 'Gastos para que la caja sea real',
    body: [
      'Registrar egresos a tiempo evita reportes maquillados y decisiones con ruido.',
      'Úsalo cuando quieras que el flujo de dinero quede bien contado.',
    ],
    route: '/expenses',
    selector: tourSel(TOUR_TARGETS.expenses.panel),
    placement: 'bottom',
  }),
  payments: (): TourStep => ({
    id: 'init.payments',
    title: 'Cobros si tienes cartera activa',
    body: [
      'Este módulo aparece solo cuando el negocio realmente trabaja saldos pendientes.',
      'Sirve para priorizar vencidos, registrar abonos y convertir cartera en recaudo.',
    ],
    route: '/payments',
    selector: tourSel(TOUR_TARGETS.payments.panel),
    placement: 'bottom',
  }),
  reports: (): TourStep => ({
    id: 'init.reports',
    title: 'Reportes cuando necesitas leer tendencias',
    body: [
      'No es para abrir a cada rato, sino para entender resultados, comparativos y exportaciones.',
      'Si esta vista no está activa en tu negocio, el recorrido la omite.',
    ],
    route: '/reports',
    selector: tourSel(TOUR_TARGETS.reports.panel),
    placement: 'bottom',
  }),
  rawInventory: (): TourStep => ({
    id: 'init.raw-inventory',
    title: 'Bodega si trabajas con insumos',
    body: [
      'Aquí controlas materias primas, movimientos y mínimos de inventario.',
      'Se muestra solo en negocios donde producción o compras hacen parte del flujo real.',
    ],
    route: '/raw-inventory',
    selector: tourSel(TOUR_TARGETS.rawInventory.panel),
    placement: 'bottom',
  }),
  settings: (): TourStep => ({
    id: 'init.settings',
    title: 'Configuración central',
    body: [
      'Desde aquí ajustas negocio, experiencia, equipo y plan.',
      'Si cambian módulos o permisos, el sistema de ayuda también se recompone desde esta base.',
    ],
    route: '/settings',
    selector: tourSel(TOUR_TARGETS.settings.panel),
    placement: 'right',
  }),
  team: (): TourStep => ({
    id: 'init.team',
    title: 'Equipo cuando operas con más personas',
    body: [
      'Esta sección organiza miembros, invitaciones y trabajo compartido.',
      'Solo aparece si tu configuración actual realmente la hace visible.',
    ],
    route: '/settings',
    selector: tourSel(TOUR_TARGETS.settings.team),
    placement: 'right',
    optional: true,
  }),
  roles: (): TourStep => ({
    id: 'init.roles',
    title: 'Roles y permisos cuando hay control por acceso',
    body: [
      'Aquí defines quién puede ver o hacer cada cosa.',
      'El recorrido solo lo incluye si el negocio actual tiene este nivel de control habilitado.',
    ],
    route: '/settings',
    selector: tourSel(TOUR_TARGETS.settings.roles),
    placement: 'right',
    optional: true,
  }),
};

const includeIfVisible = (context: TutorialRuntimeContext, route: string, stepFactory: () => TourStep) => {
  return context.hasRoute(route) ? [stepFactory()] : [];
};

const buildDynamicOnboarding = (context: TutorialRuntimeContext, audience: 'basic' | 'pro' | 'business') => {
  const steps: TourStep[] = [buildWelcomeStep(context), onboardingFragments.dashboard(), onboardingFragments.sales()];

  if (audience === 'basic') {
    steps.push(...includeIfVisible(context, '/products', onboardingFragments.products));
    steps.push(...includeIfVisible(context, '/expenses', onboardingFragments.expenses));
    steps.push(onboardingFragments.settings());
    return steps;
  }

  if (context.hasRoute('/products') && (context.businessType === 'simple_store' || context.businessType === 'wholesale')) {
    steps.push(onboardingFragments.products());
  }

  steps.push(...includeIfVisible(context, '/payments', onboardingFragments.payments));
  steps.push(...includeIfVisible(context, '/reports', onboardingFragments.reports));

  if (audience === 'business') {
    steps.push(...includeIfVisible(context, '/raw-inventory', onboardingFragments.rawInventory));
    if (context.hasSettingsSection('team')) {
      steps.push(onboardingFragments.team());
    }
    if (context.hasSettingsSection('roles')) {
      steps.push(onboardingFragments.roles());
    }
  }

  steps.push(onboardingFragments.settings());
  return steps;
};

export const tutorialCatalog: Record<string, TutorialCatalogEntry> = {
  'onboarding.basic': {
    id: 'onboarding.basic',
    title: 'Primer recorrido',
    experience: 'initial',
    buildSteps: (context) => buildDynamicOnboarding(context, 'basic'),
  },
  'onboarding.pro': {
    id: 'onboarding.pro',
    title: 'Primer recorrido',
    experience: 'initial',
    buildSteps: (context) => buildDynamicOnboarding(context, 'pro'),
  },
  'onboarding.business': {
    id: 'onboarding.business',
    title: 'Primer recorrido',
    experience: 'initial',
    buildSteps: (context) => buildDynamicOnboarding(context, 'business'),
  },
  'dashboard.expert': {
    id: 'dashboard.expert',
    title: 'Leer el inicio con criterio',
    experience: 'deep',
    baseTourId: 'dashboard.expert',
    stepRules: {
      db3: {
        selector: tourSel(TOUR_TARGETS.dashboard.tabs.balance),
        optional: true,
      },
    },
  },
  'sales.expert': {
    id: 'sales.expert',
    title: 'Registrar una venta con menos errores',
    experience: 'deep',
    baseTourId: 'sales.expert',
    visibility: {
      visibleRoute: '/sales',
      permission: 'sales.read',
      moduleKey: 'sales',
    },
  },
  'payments.expert': {
    id: 'payments.expert',
    title: 'Cobrar sin perder contexto',
    experience: 'deep',
    baseTourId: 'payments.expert',
    visibility: {
      visibleRoute: '/payments',
      permission: 'payments.read',
      moduleKey: 'accounts_receivable',
    },
  },
  'expenses.expert': {
    id: 'expenses.expert',
    title: 'Registrar un gasto completo',
    experience: 'module',
    baseTourId: 'expenses.expert',
    visibility: {
      visibleRoute: '/expenses',
      permission: 'expenses.read',
    },
  },
  'products.expert': {
    id: 'products.expert',
    title: 'Ordenar catálogo y stock',
    experience: 'deep',
    baseTourId: 'products.expert',
    visibility: {
      visibleRoute: '/products',
      permission: 'products.read',
      moduleKey: 'products',
    },
  },
  'invoices.expert': {
    id: 'invoices.expert',
    title: 'Entender el módulo de facturas',
    experience: 'module',
    baseTourId: 'invoices.expert',
    visibility: {
      visibleRoute: '/invoices',
      permission: 'invoices.view',
      moduleKey: 'sales',
      capability: 'invoices',
      commercialSection: 'invoices',
    },
  },
  'invoice-receivables.expert': {
    id: 'invoice-receivables.expert',
    title: 'Cobrar desde la cartera de facturas',
    experience: 'deep',
    baseTourId: 'invoice-receivables.expert',
    visibility: {
      visibleRoute: '/invoices/receivables',
      permission: 'receivables.view',
      moduleKey: 'accounts_receivable',
      capability: 'invoices',
      commercialSection: 'invoices',
    },
  },
  'raw-inventory.expert': {
    id: 'raw-inventory.expert',
    title: 'Mover y cuidar la bodega',
    experience: 'deep',
    baseTourId: 'raw-inventory.expert',
    visibility: {
      visibleRoute: '/raw-inventory',
      permission: 'raw_inventory.read',
      moduleKey: 'raw_inventory',
      capability: 'raw_inventory',
    },
  },
  'settings.expert': {
    id: 'settings.expert',
    title: 'Configurar sin perderse',
    experience: 'module',
    baseTourId: 'settings.expert',
    visibility: {
      visibleRoute: '/settings',
    },
    stepRules: {
      st2: {
        selector: tourSel(TOUR_TARGETS.settings.business),
        optional: true,
      },
      st3: {
        selector: tourSel(TOUR_TARGETS.settings.personalization),
        settingsSection: 'personalization',
        optional: true,
      },
      st4: {
        selector: tourSel(TOUR_TARGETS.settings.membership),
        optional: true,
      },
    },
  },
  'personalization.expert': {
    id: 'personalization.expert',
    title: 'Ajustar la experiencia del negocio',
    experience: 'deep',
    baseTourId: 'personalization.expert',
    visibility: {
      visibleRoute: '/settings?tab=personalization',
      settingsSection: 'personalization',
      permission: 'business.update',
    },
  },
  'invoice-sync.expert': {
    id: 'invoice-sync.expert',
    title: 'Leer la cola de sincronización',
    experience: 'deep',
    baseTourId: 'invoice-sync.expert',
    visibility: {
      visibleRoute: '/invoices/sync',
      permission: 'invoices.view',
      moduleKey: 'sales',
      capability: 'invoices',
      commercialSection: 'invoices',
    },
  },
  'customers.expert': {
    id: 'customers.expert',
    title: 'Leer mejor tu base de clientes',
    experience: 'module',
    baseTourId: 'customers.expert',
    visibility: {
      visibleRoute: '/customers',
      permission: 'customers.read',
      moduleKey: 'customers',
    },
  },
  'orders.expert': {
    id: 'orders.expert',
    title: 'Gestionar pedidos sin perder seguimiento',
    experience: 'deep',
    baseTourId: 'orders.expert',
    visibility: {
      visibleRoute: '/orders',
      permission: 'orders.view',
      moduleKey: 'sales',
      commercialSection: 'orders',
    },
  },
};

