import type { FeatureKey } from '../auth/plan';
import type { BusinessCommercialSectionKey } from '../config/businessPersonalization';
import type { BackendCapability } from '../config/backendCapabilities';
import type { BusinessModuleKey } from '../types';
import { TOUR_TARGETS, tourSel } from './tourTargets';
import type { TourStep } from './tourRegistry';
import type { TutorialBehavior, TutorialEligibilityRules, TutorialPriority, TutorialTrigger } from './tutorialEligibility';
import type { TutorialRuntimeContext, TutorialSettingsSectionId } from './tutorialContext';

export type TutorialExperience = 'initial' | 'module' | 'deep';

export type TutorialGuard = TutorialEligibilityRules & {
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
  priority?: TutorialPriority;
  trigger?: TutorialTrigger;
  behavior?: TutorialBehavior;
  visibility?: TutorialGuard;
  eligibility?: TutorialEligibilityRules;
  buildSteps: (context: TutorialRuntimeContext) => TourStep[];
};

type RegistryDefinition = {
  id: string;
  title: string;
  experience: TutorialExperience;
  priority?: TutorialPriority;
  trigger?: TutorialTrigger;
  behavior?: TutorialBehavior;
  visibility?: TutorialGuard;
  eligibility?: TutorialEligibilityRules;
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
  const onboardingProfile = context.initialSetup.onboarding_profile;

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
    if (context.hasRoute('/raw-inventory') && (context.operationalProfile.manages_raw_materials || context.operationalProfile.uses_raw_inventory || context.operationalProfile.controls_production)) {
      steps.push(onboardingFragments.rawInventory());
    }
    if (context.hasSettingsSection('team') && onboardingProfile.role_setup !== 'owner_only') {
      steps.push(onboardingFragments.team());
    }
    if (context.hasSettingsSection('roles') && onboardingProfile.permission_control !== 'simple') {
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
    behavior: {
      repeatable: false,
      allowManualRestart: true,
      dismissStopsAutoStart: true,
    },
    buildSteps: (context) => buildDynamicOnboarding(context, 'basic'),
  },
  'onboarding.pro': {
    id: 'onboarding.pro',
    title: 'Primer recorrido',
    experience: 'initial',
    behavior: {
      repeatable: false,
      allowManualRestart: true,
      dismissStopsAutoStart: true,
    },
    buildSteps: (context) => buildDynamicOnboarding(context, 'pro'),
  },
  'onboarding.business': {
    id: 'onboarding.business',
    title: 'Primer recorrido',
    experience: 'initial',
    behavior: {
      repeatable: false,
      allowManualRestart: true,
      dismissStopsAutoStart: true,
    },
    buildSteps: (context) => buildDynamicOnboarding(context, 'business'),
  },
  'dashboard.expert': {
    id: 'dashboard.expert',
    title: 'Leer el inicio con criterio',
    experience: 'deep',
    priority: 'high',
    trigger: 'recommended',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/dashboard',
    },
    baseTourId: 'dashboard.expert',
    stepRules: {
      db3: {
        dashboardTabsAny: ['balance', 'analiticas', 'recordatorios'],
        selector: tourSel(TOUR_TARGETS.dashboard.tabs.balance),
        optional: true,
      },
      db5: {
        visibleRoutes: ['/alerts'],
        optional: true,
      },
    },
  },
  'sales.expert': {
    id: 'sales.expert',
    title: 'Registrar una venta con menos errores',
    experience: 'deep',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'sales.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/sales',
      permission: 'sales.view',
      moduleKey: 'sales',
    },
    visibility: {
      visibleRoute: '/sales',
      permission: 'sales.view',
      moduleKey: 'sales',
    },
    stepRules: {
      s2: {
        permissionsAny: ['sales.create'],
        optional: true,
      },
      s3: {
        permissionsAny: ['sales.create'],
        optional: true,
      },
      s4: {
        permissionsAny: ['sales.create'],
        optional: true,
      },
      s5: {
        permissionsAny: ['sales.create'],
        optional: true,
      },
      s6: {
        permissionsAny: ['sales.create'],
        optional: true,
      },
      s7: {
        permissionsAny: ['sales.create'],
        optional: true,
      },
      s8: {
        permissionsAny: ['sales.create'],
        optional: true,
      },
      s9: {
        permissionsAny: ['sales.create'],
        optional: true,
      },
      s10: {
        permissionsAny: ['sales.create'],
        optional: true,
      },
    },
  },
  'payments.expert': {
    id: 'payments.expert',
    title: 'Cobrar sin perder contexto',
    experience: 'deep',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'payments.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/payments',
      permission: 'receivables.view',
      moduleKey: 'accounts_receivable',
    },
    visibility: {
      visibleRoute: '/payments',
      permission: 'receivables.view',
      moduleKey: 'accounts_receivable',
    },
    stepRules: {
      p4: {
        permissionsAny: ['receivables.collect'],
        optional: true,
      },
      p5: {
        permissionsAny: ['receivables.collect'],
        optional: true,
      },
    },
  },
  'expenses.expert': {
    id: 'expenses.expert',
    title: 'Registrar un gasto completo',
    experience: 'module',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'expenses.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/expenses',
      permission: 'expenses.view',
    },
    visibility: {
      visibleRoute: '/expenses',
      permission: 'expenses.view',
    },
    stepRules: {
      e2: {
        permissionsAny: ['expenses.create'],
        optional: true,
      },
      e3: {
        permissionsAny: ['expenses.create'],
        optional: true,
      },
      e4: {
        capability: 'recurring_expenses',
        optional: true,
      },
    },
  },
  'products.expert': {
    id: 'products.expert',
    title: 'Ordenar catálogo y stock',
    experience: 'deep',
    baseTourId: 'products.expert',
    visibility: {
      visibleRoute: '/products',
      permission: 'products.view',
      moduleKey: 'products',
    },
  },
  'invoices.expert': {
    id: 'invoices.expert',
    title: 'Entender el módulo de facturas',
    experience: 'module',
    baseTourId: 'invoices.expert',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/invoices',
      permission: 'invoices.view',
      moduleKey: 'sales',
      capability: 'invoices',
      commercialSection: 'invoices',
    },
    visibility: {
      visibleRoute: '/invoices',
      permission: 'invoices.view',
      moduleKey: 'sales',
      capability: 'invoices',
      commercialSection: 'invoices',
    },
    stepRules: {
      i5: {
        visibleRoute: '/invoices/receivables',
        optional: true,
      },
    },
  },
  'invoice-receivables.expert': {
    id: 'invoice-receivables.expert',
    title: 'Cobrar desde la cartera de facturas',
    experience: 'deep',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'invoice-receivables.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/invoices/receivables',
      permission: 'receivables.view',
      moduleKey: 'accounts_receivable',
      capability: 'invoices',
      commercialSection: 'invoices',
    },
    visibility: {
      visibleRoute: '/invoices/receivables',
      permission: 'receivables.view',
      moduleKey: 'accounts_receivable',
      capability: 'invoices',
      commercialSection: 'invoices',
    },
  },
  'quotes.expert': {
    id: 'quotes.expert',
    title: 'Crear y convertir cotizaciones con contexto',
    experience: 'deep',
    priority: 'high',
    trigger: 'recommended',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'quotes.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/quotes',
      permission: 'quotes.view',
      moduleKey: 'quotes',
      requiresQuotesSupport: true,
    },
    visibility: {
      visibleRoute: '/quotes',
      permission: 'quotes.view',
      moduleKey: 'quotes',
      requiresQuotesSupport: true,
    },
    stepRules: {
      q3: {
        permissionsAny: ['quotes.create'],
        optional: true,
      },
      q4: {
        permissionsAny: ['quotes.create'],
        optional: true,
      },
      q5: {
        permissionsAny: ['quotes.create'],
        optional: true,
      },
      q6: {
        permissionsAny: ['quotes.create'],
        optional: true,
      },
    },
  },
  'suppliers.expert': {
    id: 'suppliers.expert',
    title: 'Ordenar proveedores sin perder contexto operativo',
    experience: 'deep',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'suppliers.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/suppliers',
      permission: 'suppliers.view',
      moduleKey: 'raw_inventory',
      capability: 'suppliers',
      requiresRawMaterials: true,
    },
    visibility: {
      visibleRoute: '/suppliers',
      permission: 'suppliers.view',
      moduleKey: 'raw_inventory',
      capability: 'suppliers',
      requiresRawMaterials: true,
    },
    stepRules: {
      sp4: {
        permissionsAny: ['suppliers.create'],
        optional: true,
      },
      sp5: {
        permissionsAny: ['suppliers.create'],
        optional: true,
      },
      sp6: {
        permissionsAny: ['suppliers.create'],
        optional: true,
      },
    },
  },
  'raw-purchases.expert': {
    id: 'raw-purchases.expert',
    title: 'Registrar compras de insumos con trazabilidad',
    experience: 'deep',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'raw-purchases.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/raw-purchases',
      permission: 'raw_purchases.view',
      moduleKey: 'raw_inventory',
      capability: 'raw_purchases',
      requiresRawMaterials: true,
    },
    visibility: {
      visibleRoute: '/raw-purchases',
      permission: 'raw_purchases.view',
      moduleKey: 'raw_inventory',
      capability: 'raw_purchases',
      requiresRawMaterials: true,
    },
    stepRules: {
      rp3: {
        permissionsAny: ['raw_purchases.create'],
        optional: true,
      },
      rp4: {
        permissionsAny: ['raw_purchases.create'],
        optional: true,
      },
      rp5: {
        permissionsAny: ['raw_purchases.create'],
        optional: true,
      },
      rp6: {
        permissionsAny: ['raw_purchases.create'],
        optional: true,
      },
    },
  },
  'recipes.expert': {
    id: 'recipes.expert',
    title: 'Definir recetas y consumos con trazabilidad',
    experience: 'deep',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'recipes.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/recipes',
      permission: 'recipes.view',
      moduleKey: 'raw_inventory',
      capability: 'recipes',
      requiresRawMaterials: true,
    },
    visibility: {
      visibleRoute: '/recipes',
      permission: 'recipes.view',
      moduleKey: 'raw_inventory',
      capability: 'recipes',
      requiresRawMaterials: true,
    },
    stepRules: {
      rc3: {
        permissionsAny: ['recipes.create'],
        optional: true,
      },
      rc4: {
        permissionsAny: ['recipes.create'],
        optional: true,
      },
      rc5: {
        permissionsAny: ['recipes.create'],
        optional: true,
      },
      rc6: {
        permissionsAny: ['recipes.create'],
        optional: true,
      },
    },
  },
  'cost-calculator.expert': {
    id: 'cost-calculator.expert',
    title: 'Simular costos antes de cambiar la operación',
    experience: 'deep',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'cost-calculator.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/cost-calculator',
      permission: 'recipes.view',
      moduleKey: 'raw_inventory',
      capability: 'recipes',
      requiresRawMaterials: true,
    },
    visibility: {
      visibleRoute: '/cost-calculator',
      permission: 'recipes.view',
      moduleKey: 'raw_inventory',
      capability: 'recipes',
      requiresRawMaterials: true,
    },
  },
  'raw-inventory.expert': {
    id: 'raw-inventory.expert',
    title: 'Mover y cuidar la bodega',
    experience: 'deep',
    priority: 'high',
    trigger: 'recommended',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'raw-inventory.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/raw-inventory',
      permission: 'raw_inventory.view',
      moduleKey: 'raw_inventory',
      capability: 'raw_inventory',
      inventoryModels: ['raw_materials_only', 'mixed'],
      fulfillmentModes: ['stock', 'make_to_order', 'hybrid'],
      requiresRawMaterials: true,
    },
    visibility: {
      visibleRoute: '/raw-inventory',
      permission: 'raw_inventory.view',
      moduleKey: 'raw_inventory',
      capability: 'raw_inventory',
    },
  },
  'treasury.expert': {
    id: 'treasury.expert',
    title: 'Leer caja y movimientos reales',
    experience: 'deep',
    priority: 'high',
    trigger: 'recommended',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/treasury',
      permission: 'treasury.view',
      capability: 'treasury',
    },
    visibility: {
      visibleRoute: '/treasury',
      permission: 'treasury.view',
      capability: 'treasury',
    },
    baseTourId: 'treasury.expert',
    stepRules: {
      ty4: {
        permissionsAny: ['treasury.manage_accounts', 'treasury.adjust'],
        optional: true,
      },
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
    priority: 'high',
    trigger: 'recommended',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/settings?tab=personalization',
      settingsSection: 'personalization',
      permissionsAny: ['settings.edit', 'business.update'],
    },
    baseTourId: 'personalization.expert',
    visibility: {
      visibleRoute: '/settings?tab=personalization',
      settingsSection: 'personalization',
      permissionsAny: ['settings.edit', 'business.update'],
    },
  },
  'team-roles.expert': {
    id: 'team-roles.expert',
    title: 'Organizar equipo y permisos',
    experience: 'deep',
    priority: 'high',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/settings',
      settingsSections: ['team', 'roles'],
      feature: 'team_management',
      permissionsAny: ['team.edit_roles', 'team.manage_team', 'team.manage', 'team.invite', 'team.remove'],
      onboardingRoleSetupNot: ['owner_only'],
      onboardingPermissionControlNot: ['simple'],
    },
    visibility: {
      visibleRoute: '/settings',
      settingsSections: ['team', 'roles'],
      feature: 'team_management',
      permissionsAny: ['team.edit_roles', 'team.manage_team', 'team.manage', 'team.invite', 'team.remove'],
    },
    baseTourId: 'team-roles.expert',
    stepRules: {
      tr3: {
        permissionsAny: ['team.manage_team', 'team.manage', 'team.invite'],
        optional: true,
      },
      tr4: {
        settingsSection: 'roles',
      },
      tr5: {
        settingsSection: 'roles',
      },
      tr6: {
        settingsSection: 'roles',
      },
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
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'customers.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/customers',
      permission: 'customers.view',
      moduleKey: 'customers',
    },
    visibility: {
      visibleRoute: '/customers',
      permission: 'customers.view',
      moduleKey: 'customers',
    },
  },
  'orders.expert': {
    id: 'orders.expert',
    title: 'Gestionar pedidos sin perder seguimiento',
    experience: 'deep',
    behavior: {
      repeatable: true,
      allowManualRestart: true,
    },
    baseTourId: 'orders.expert',
    eligibility: {
      requireBusinessContext: true,
      visibleRoute: '/orders',
      permission: 'orders.view',
      moduleKey: 'sales',
      commercialSection: 'orders',
      feature: 'orders',
    },
    visibility: {
      visibleRoute: '/orders',
      permission: 'orders.view',
      moduleKey: 'sales',
      commercialSection: 'orders',
      feature: 'orders',
    },
  },
};

