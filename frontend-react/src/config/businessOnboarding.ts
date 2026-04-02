import { BUSINESS_MODULE_META, type BusinessModuleKey } from '../types';
import type {
  BusinessCommercialSectionsState,
  BusinessInitialSetupProfile,
  BusinessInitialSetupSettings,
  BusinessOnboardingBusinessCategory,
  BusinessOnboardingDocumentsMode,
  BusinessOnboardingGuidanceMode,
  BusinessOnboardingHomeFocus,
  BusinessOnboardingInventoryMode,
  BusinessOnboardingOperationsMode,
  BusinessOnboardingOwnerFocus,
  BusinessOnboardingPermissionControl,
  BusinessOnboardingRoleSetup,
  BusinessOnboardingSalesFlow,
  BusinessOnboardingTeamMode,
  BusinessOnboardingTeamStructure,
  BusinessPersonalizationAnswers,
  BusinessTypeKey,
} from './businessPersonalization';

export const INITIAL_ONBOARDING_CHANGE_MESSAGE =
  'Esto es solo una configuracion inicial. Podras cambiarlo cuando quieras mas adelante.';

export type OnboardingFlow = 'basic' | 'pro' | 'business';
export type OnboardingVisualTone = 'sunrise' | 'ocean' | 'mint' | 'gold' | 'rose' | 'ink';

export type ProQuestionId =
  | 'business_category'
  | 'inventory_mode'
  | 'sales_flow'
  | 'home_focus'
  | 'documents_mode'
  | 'operations_mode'
  | 'guidance_mode';

export type BusinessQuestionId =
  | 'business_category'
  | 'inventory_mode'
  | 'sales_flow'
  | 'home_focus'
  | 'documents_mode'
  | 'operations_mode'
  | 'team_mode'
  | 'team_structure'
  | 'role_setup'
  | 'permission_control'
  | 'owner_focus';

export type OnboardingQuestionId = ProQuestionId | BusinessQuestionId;

export interface BusinessOnboardingWizardAnswers {
  name: string;
  currency: string;
  businessCategory: BusinessOnboardingBusinessCategory;
  inventoryMode: BusinessOnboardingInventoryMode;
  salesFlow: BusinessOnboardingSalesFlow;
  homeFocus: BusinessOnboardingHomeFocus;
  teamMode: BusinessOnboardingTeamMode;
  documentsMode: BusinessOnboardingDocumentsMode;
  operationsMode: BusinessOnboardingOperationsMode;
  guidanceMode: BusinessOnboardingGuidanceMode;
  teamStructure: BusinessOnboardingTeamStructure;
  roleSetup: BusinessOnboardingRoleSetup;
  permissionControl: BusinessOnboardingPermissionControl;
  ownerFocus: BusinessOnboardingOwnerFocus;
}

export interface OnboardingOptionDefinition<TValue extends string> {
  value: TValue;
  title: string;
  description: string;
  activates: string[];
  benefit: string;
  icon: string;
  tone: OnboardingVisualTone;
}

export interface OnboardingQuestionDefinition<TValue extends string, TId extends string = OnboardingQuestionId> {
  id: TId;
  eyebrow: string;
  title: string;
  description: string;
  helper: string;
  options: OnboardingOptionDefinition<TValue>[];
}

export interface BusinessOnboardingSummary {
  headline: string;
  summary: string;
  businessType: BusinessTypeKey;
  visibilityMode: 'basic' | 'advanced';
  prioritizedPath: string;
  initialDashboardTab: 'hoy' | 'balance' | 'analiticas' | 'recordatorios';
  activatedModules: BusinessModuleKey[];
  highlightedTools: string[];
  hiddenTools: string[];
  recommendedTutorials: string[];
  simplicityLevel: BusinessInitialSetupSettings['simplicity_level'];
  commercialSections: BusinessCommercialSectionsState;
  profile: BusinessInitialSetupProfile;
  personalizationAnswers: BusinessPersonalizationAnswers;
  focusLabel: string;
  flow: OnboardingFlow;
}

type ProQuestion = OnboardingQuestionDefinition<
  | BusinessOnboardingBusinessCategory
  | BusinessOnboardingInventoryMode
  | BusinessOnboardingSalesFlow
  | BusinessOnboardingHomeFocus
  | BusinessOnboardingDocumentsMode
  | BusinessOnboardingOperationsMode
  | BusinessOnboardingGuidanceMode,
  ProQuestionId
>;

type BusinessQuestion = OnboardingQuestionDefinition<
  | BusinessOnboardingBusinessCategory
  | BusinessOnboardingInventoryMode
  | BusinessOnboardingSalesFlow
  | BusinessOnboardingHomeFocus
  | BusinessOnboardingDocumentsMode
  | BusinessOnboardingOperationsMode
  | BusinessOnboardingTeamMode
  | BusinessOnboardingTeamStructure
  | BusinessOnboardingRoleSetup
  | BusinessOnboardingPermissionControl
  | BusinessOnboardingOwnerFocus,
  BusinessQuestionId
>;

const unique = <T,>(values: T[]) => Array.from(new Set(values));
const moduleLabel = (moduleKey: BusinessModuleKey) => BUSINESS_MODULE_META[moduleKey].label;

export const DEFAULT_BUSINESS_ONBOARDING_ANSWERS: BusinessOnboardingWizardAnswers = {
  name: '',
  currency: 'USD',
  businessCategory: 'products',
  inventoryMode: 'basic',
  salesFlow: 'immediate',
  homeFocus: 'summary',
  teamMode: 'solo',
  documentsMode: 'simple_receipts',
  operationsMode: 'none',
  guidanceMode: 'guided',
  teamStructure: 'solo_owner',
  roleSetup: 'owner_only',
  permissionControl: 'simple',
  ownerFocus: 'cash_and_sales',
};

export const PRO_ONBOARDING_QUESTIONS: ProQuestion[] = [
  {
    id: 'business_category',
    eyebrow: 'Paso 2',
    title: 'Que tipo de negocio quieres configurar?',
    description: 'Esto nos ayuda a dejar visible solo la parte operativa que de verdad te sirve para trabajar tu negocio de forma individual.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'products', title: 'Vendo productos', description: 'Perfecto para catalogos, ventas rapidas y control simple del dia a dia.', activates: ['Ventas', 'Productos', 'Resumen comercial'], benefit: 'Te deja una operacion ligera y lista para vender desde el primer minuto.', icon: 'package', tone: 'ocean' },
      { value: 'services', title: 'Ofrezco servicios', description: 'Pensado para trabajos, servicios, encargos o atencion a clientes por proyecto.', activates: ['Ventas', 'Clientes', 'Cotizaciones'], benefit: 'Te ayuda a pasar de propuesta a cobro con un flujo comercial claro.', icon: 'briefcase', tone: 'sunrise' },
      { value: 'mixed', title: 'Vendo productos y servicios', description: 'Una base equilibrada para combinar portafolio, ventas y seguimiento comercial.', activates: ['Ventas', 'Productos', 'Cobros', 'Clientes'], benefit: 'Mantiene a mano lo esencial cuando tu operacion mezcla varios tipos de venta.', icon: 'layers', tone: 'mint' },
      { value: 'production', title: 'Produzco o fabrico', description: 'Si compras insumos, transformas o produces antes de vender.', activates: ['Bodega', 'Compras', 'Costos y recetas'], benefit: 'Te deja una base mas util para controlar mejor costos, insumos y ventas.', icon: 'factory', tone: 'gold' },
    ],
  },
  {
    id: 'inventory_mode',
    eyebrow: 'Paso 3',
    title: 'Que tan visible necesitas el inventario?',
    description: 'Asi decidimos si la app debe sentirse mas comercial o mas operativa desde el inicio.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'yes', title: 'Quiero control completo', description: 'Necesito ver existencias, entradas, compras o insumos con mas detalle.', activates: ['Inventario bodega', 'Compras', 'Alertas de stock'], benefit: 'Tendras un flujo mas completo para controlar que entra, que sale y que hace falta.', icon: 'boxes', tone: 'ocean' },
      { value: 'basic', title: 'Solo algo basico', description: 'Me basta con catalogo y una referencia sencilla de lo que vendo.', activates: ['Catalogo', 'Productos destacados'], benefit: 'Mantiene la app ligera sin perder el control de lo esencial.', icon: 'sparkles', tone: 'mint' },
      { value: 'no', title: 'No por ahora', description: 'Prefiero enfocarme en vender y cobrar sin mostrar inventario al entrar.', activates: ['Vista comercial simple', 'Menos menus visibles'], benefit: 'Vas a ver una experiencia mas limpia y directa para operar sin ruido.', icon: 'wand', tone: 'rose' },
    ],
  },
  {
    id: 'sales_flow',
    eyebrow: 'Paso 4',
    title: 'Como vendes y cobras normalmente?',
    description: 'Queremos saber si tu operacion es inmediata, si sigues pendientes o si trabajas con documentos comerciales.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'immediate', title: 'Vendo y cobro al momento', description: 'La mayoria de mis ventas se cierran en una sola interaccion.', activates: ['Caja del dia', 'Ventas rapidas', 'Resumen simple'], benefit: 'La app te recibe con un flujo directo y sin pasos extra.', icon: 'zap', tone: 'sunrise' },
      { value: 'pending', title: 'A veces queda saldo pendiente', description: 'Necesito seguir cobros, abonos o clientes con cartera.', activates: ['Cobros', 'Cuentas por cobrar', 'Seguimiento a cartera'], benefit: 'Tus pendientes quedan mucho mas visibles para no dejar dinero en el aire.', icon: 'wallet', tone: 'ocean' },
      { value: 'orders', title: 'Trabajo por pedidos o encargos', description: 'Recibo pedidos, apartados o trabajos que cierro despues.', activates: ['Pedidos', 'Clientes', 'Seguimiento comercial'], benefit: 'Te ayuda a ordenar mejor ventas que no se cierran en un solo momento.', icon: 'clipboard-list', tone: 'mint' },
      { value: 'quotes_invoices', title: 'Necesito cotizaciones o facturas', description: 'Antes de vender suelo cotizar o necesito soporte formal del proceso.', activates: ['Cotizaciones', 'Facturas', 'Flujo comercial guiado'], benefit: 'Dejas lista una operacion mas documentada sin sentirla tecnica.', icon: 'file-text', tone: 'gold' },
    ],
  },
  {
    id: 'home_focus',
    eyebrow: 'Paso 5',
    title: 'Que quieres ver primero cuando entres?',
    description: 'Esto define tu foco inicial y que quedara mas a la mano en la navegacion.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'cash', title: 'Caja', description: 'Quiero ver el dinero y el movimiento financiero del negocio.', activates: ['Vista de caja', 'Balance del dia'], benefit: 'Llegas directo a lo financiero si eso manda tu operacion diaria.', icon: 'landmark', tone: 'ocean' },
      { value: 'sales', title: 'Ventas', description: 'Quiero entrar listo para registrar y mover la operacion comercial.', activates: ['Ventas', 'Acciones rapidas comerciales'], benefit: 'Entras con la parte comercial al frente, sin vueltas.', icon: 'shopping-bag', tone: 'sunrise' },
      { value: 'collections', title: 'Cobros', description: 'Lo mas importante para mi es revisar quien me debe y cobrar.', activates: ['Cobros', 'Pendientes de clientes'], benefit: 'Si tu foco es cartera, la app te lleva alli mas rapido.', icon: 'coins', tone: 'gold' },
      { value: 'products', title: 'Productos', description: 'Quiero entrar pensando en catalogo, referencias o inventario.', activates: ['Productos', 'Catalogo', 'Control del portafolio'], benefit: 'Tu portafolio queda mas cerca si es parte central de tu trabajo.', icon: 'tags', tone: 'mint' },
      { value: 'summary', title: 'Resumen', description: 'Prefiero una vista general y luego decidir que atender.', activates: ['Dashboard principal', 'Resumen general'], benefit: 'Te da una entrada mas amplia y facil para orientarte rapido.', icon: 'layout-dashboard', tone: 'ink' },
    ],
  },
  {
    id: 'documents_mode',
    eyebrow: 'Paso 6',
    title: 'Necesitas documentos comerciales formales?',
    description: 'Con esto definimos si conviene dejar visible un flujo documental o mantenerlo simple.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'formal', title: 'Si, necesito soporte formal', description: 'Quiero facturas, cotizaciones o soporte comercial mas claro.', activates: ['Facturas', 'Cotizaciones', 'Seguimiento documental'], benefit: 'Tu configuracion inicial queda lista para vender con mas respaldo.', icon: 'receipt', tone: 'gold' },
      { value: 'simple_receipts', title: 'Solo comprobantes simples', description: 'Quiero vender y dejar soporte basico sin una experiencia pesada.', activates: ['Ventas', 'Comprobantes simples'], benefit: 'Mantiene una operacion ligera sin esconder lo importante.', icon: 'ticket', tone: 'sunrise' },
      { value: 'none', title: 'No por ahora', description: 'Prefiero no mostrar ese flujo al inicio.', activates: ['Vista mas limpia', 'Menos herramientas visibles'], benefit: 'La app queda enfocada en vender y operar sin pasos extra.', icon: 'circle-off', tone: 'rose' },
    ],
  },
  {
    id: 'operations_mode',
    eyebrow: 'Paso 7',
    title: 'Tu operacion compra, transforma o produce?',
    description: 'Solo queremos saber si conviene dejar a mano compras, proveedores, insumos o costos.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'none', title: 'No', description: 'Mi operacion es simple y no necesita ese flujo por ahora.', activates: ['Operacion simple', 'Menus mas cortos'], benefit: 'Dejamos visible solo lo que realmente te aporta hoy.', icon: 'circle', tone: 'ink' },
      { value: 'resale', title: 'Compro para revender', description: 'Necesito apoyar la venta con productos, compras y catalogo.', activates: ['Productos', 'Compras simples', 'Control comercial'], benefit: 'La configuracion te acompana mejor cuando compras para luego vender.', icon: 'refresh-cw', tone: 'ocean' },
      { value: 'production', title: 'Produzco', description: 'Transformo insumos o fabrico antes de vender.', activates: ['Bodega', 'Recetas o costos', 'Compras e insumos'], benefit: 'Te deja listo un flujo mucho mas util para producir con claridad.', icon: 'chef-hat', tone: 'gold' },
      { value: 'suppliers', title: 'Manejo proveedores y pagos', description: 'Quiero mas visibilidad sobre abastecimiento y compromisos operativos.', activates: ['Compras', 'Proveedores', 'Control operativo'], benefit: 'Te muestra mejor la parte operativa para que no todo recaiga en ventas.', icon: 'truck', tone: 'mint' },
    ],
  },
  {
    id: 'guidance_mode',
    eyebrow: 'Paso 8',
    title: 'Cuanta ayuda inicial quieres?',
    description: 'Elegimos si prefieres una experiencia express, guiada o mas acompanada al comienzo.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'express', title: 'Lo mas simple posible', description: 'Quiero entrar rapido, con menos cosas visibles y una operacion bien directa.', activates: ['Experiencia express', 'Menos ruido', 'Vista muy limpia'], benefit: 'Ideal si prefieres una herramienta agil y sin pasos extra.', icon: 'zap', tone: 'ink' },
      { value: 'guided', title: 'Un balance entre claridad y ayuda', description: 'Quiero una base clara, con algunas guias y herramientas relevantes visibles.', activates: ['Experiencia guiada', 'Atajos utiles', 'Configuracion equilibrada'], benefit: 'Es la mejor opcion si quieres empezar comodo sin sentirlo basico.', icon: 'sparkles', tone: 'ocean' },
      { value: 'companion', title: 'Quiero mas contexto al principio', description: 'Prefiero ver mas ayudas, herramientas recomendadas y seguimiento comercial visible.', activates: ['Mas acompanamiento', 'Herramientas sugeridas', 'Mayor contexto inicial'], benefit: 'Te orienta mejor cuando quieres entender el sistema desde el inicio.', icon: 'wand', tone: 'gold' },
    ],
  },
];

export const BUSINESS_ONBOARDING_QUESTIONS: BusinessQuestion[] = [
  ...(PRO_ONBOARDING_QUESTIONS.filter((question) => question.id !== 'guidance_mode') as BusinessQuestion[]),
  {
    id: 'team_mode',
    eyebrow: 'Paso 8',
    title: 'Trabajas solo o con equipo?',
    description: 'Esto define si tu configuracion inicial debe sentirse mas personal o mas pensada para coordinar personas.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'solo', title: 'Trabajo solo por ahora', description: 'Quiero una base clara, pero lista para crecer si mas adelante invito personas.', activates: ['Vista simple', 'Base escalable'], benefit: 'Empiezas ligero, sin perder la posibilidad de crecer luego.', icon: 'user', tone: 'ink' },
      { value: 'small_team', title: 'Tengo un equipo pequeno', description: 'Somos pocas personas y necesitamos coordinarnos sin complicarnos.', activates: ['Organizacion comercial', 'Seguimiento del equipo'], benefit: 'Equilibra simplicidad con herramientas para coordinar mejor.', icon: 'users', tone: 'mint' },
      { value: 'roles', title: 'Hay funciones distintas en el equipo', description: 'Necesito una operacion lista para personas con tareas y accesos diferentes.', activates: ['Vista avanzada', 'Equipo y roles mas visibles'], benefit: 'Deja la base lista para crecer sin quedarse corta muy rapido.', icon: 'shield', tone: 'gold' },
    ],
  },
  {
    id: 'team_structure',
    eyebrow: 'Paso 9',
    title: 'Que tipo de personas usaran la app?',
    description: 'Con esto entendemos si debes organizar la operacion por areas o por tareas puntuales.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'solo_owner', title: 'Solo yo o una persona de apoyo', description: 'La cuenta principal seguira llevando casi toda la operacion.', activates: ['Supervision central', 'Flujo simple de acceso'], benefit: 'Mantiene la estructura limpia cuando el dueno sigue controlando todo.', icon: 'user', tone: 'ink' },
      { value: 'small_operations_team', title: 'Caja, ventas o apoyo operativo', description: 'Hay personas ayudando en operacion diaria, pero no demasiadas areas distintas.', activates: ['Supervision operativa', 'Organizacion por tareas'], benefit: 'Te deja una base util para separar operacion sin complejidad innecesaria.', icon: 'shopping-bag', tone: 'ocean' },
      { value: 'sales_and_admin', title: 'Ventas y administracion', description: 'Necesito separar quien vende, quien cobra y quien revisa numeros.', activates: ['Separacion comercial', 'Control administrativo'], benefit: 'La configuracion refleja mejor negocios con mas de un frente de trabajo.', icon: 'coins', tone: 'sunrise' },
      { value: 'multi_area_team', title: 'Varias areas o responsables', description: 'Quiero ordenar acceso para personas con responsabilidades diferentes.', activates: ['Equipo multiarea', 'Accesos organizados'], benefit: 'Ideal si quieres una base mas formal para coordinar mejor el negocio.', icon: 'briefcase', tone: 'gold' },
    ],
  },
  {
    id: 'role_setup',
    eyebrow: 'Paso 10',
    title: 'Necesitas roles distintos dentro del equipo?',
    description: 'Asi definimos si conviene dejar mas visible la parte de organizacion del equipo y administracion.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'owner_only', title: 'No, con un control central me basta', description: 'Prefiero manejar los accesos de forma simple y centralizada.', activates: ['Administracion simple', 'Menos complejidad inicial'], benefit: 'La configuracion sigue clara si no quieres pensar aun en estructura formal.', icon: 'circle', tone: 'ink' },
      { value: 'shared_roles', title: 'Si, pero con pocos roles', description: 'Necesito separar algunas tareas sin volverlo un sistema pesado.', activates: ['Roles basicos', 'Equipo mas ordenado'], benefit: 'Te ayuda a crecer con orden sin abrumar al equipo.', icon: 'users', tone: 'mint' },
      { value: 'specific_roles', title: 'Si, necesito roles bien definidos', description: 'Quiero distinguir mejor responsables, supervision y operacion.', activates: ['Roles definidos', 'Mayor control del equipo'], benefit: 'Muy util si quieres una estructura mas formal desde el inicio.', icon: 'shield', tone: 'gold' },
    ],
  },
  {
    id: 'permission_control',
    eyebrow: 'Paso 11',
    title: 'Como quieres organizar los permisos?',
    description: 'Esto nos dice si el acceso del equipo debe ser simple o mas controlado por area o por persona.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'simple', title: 'Con acceso simple', description: 'Prefiero empezar rapido y ajustar los permisos despues si hace falta.', activates: ['Permisos simples', 'Menos friccion al inicio'], benefit: 'Ideal si quieres lanzar rapido y ordenar el detalle mas adelante.', icon: 'sparkles', tone: 'ink' },
      { value: 'by_area', title: 'Por areas del negocio', description: 'Quiero separar mejor ventas, cobros, productos o administracion.', activates: ['Accesos por area', 'Equipo mejor organizado'], benefit: 'Te ayuda a mantener cada parte del negocio mas clara para el equipo.', icon: 'layers', tone: 'ocean' },
      { value: 'by_person', title: 'Por persona o responsabilidad', description: 'Necesito mas control fino segun quien usa la app y que debe ver.', activates: ['Control fino', 'Mayor supervision del acceso'], benefit: 'Es la opcion mas util si tu equipo ya requiere una estructura mas seria.', icon: 'shield', tone: 'gold' },
    ],
  },
  {
    id: 'owner_focus',
    eyebrow: 'Paso 12',
    title: 'Como dueno, que quieres supervisar mas de cerca?',
    description: 'Usaremos esto para sugerirte el enfoque inicial y las herramientas mas visibles para supervision.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'cash_and_sales', title: 'Caja y ventas', description: 'Quiero tener claro que se esta vendiendo y como se mueve el dinero.', activates: ['Caja', 'Ventas', 'Seguimiento comercial'], benefit: 'Te deja una entrada util para controlar operacion y movimiento diario.', icon: 'landmark', tone: 'ocean' },
      { value: 'team_followup', title: 'Seguimiento del equipo', description: 'Me importa coordinar personas y entender como va la operacion del equipo.', activates: ['Supervision del equipo', 'Organizacion visible'], benefit: 'La app te mostrara una operacion mas pensada para coordinar personas.', icon: 'users', tone: 'mint' },
      { value: 'approvals_and_control', title: 'Aprobaciones y control', description: 'Quiero una base mas gerencial para revisar orden, accesos y decisiones.', activates: ['Control operativo', 'Mayor formalidad'], benefit: 'Refuerza la sensacion de administracion y control del negocio.', icon: 'shield', tone: 'gold' },
      { value: 'profitability_and_growth', title: 'Rentabilidad y crecimiento', description: 'Quiero enfocarme mas en margenes, numeros y vision de crecimiento.', activates: ['Reportes', 'Rentabilidad', 'Vision estrategica'], benefit: 'Lleva al frente lo necesario para supervisar el negocio como dueno.', icon: 'briefcase', tone: 'sunrise' },
    ],
  },
];

const HOME_FOCUS_LABELS: Record<BusinessOnboardingHomeFocus, string> = {
  cash: 'Caja',
  sales: 'Ventas',
  collections: 'Cobros',
  products: 'Productos',
  summary: 'Resumen',
};

const TOOL_LABELS: Record<string, string> = {
  dashboard: 'Resumen del negocio',
  sales: 'Ventas',
  customers: 'Clientes',
  products: 'Productos',
  accounts_receivable: 'Cobros',
  reports: 'Reportes',
  quotes: 'Cotizaciones',
  raw_inventory: 'Inventario bodega',
  orders: 'Pedidos',
  invoices: 'Facturas',
  sales_goals: 'Metas comerciales',
  team: 'Equipo',
  roles: 'Roles',
  permissions: 'Permisos',
};

const TUTORIAL_LABELS: Record<string, string> = {
  dashboard: 'Recorrido por el dashboard',
  sales: 'Tutorial de ventas',
  payments: 'Tutorial de cobros',
  products: 'Tutorial de productos',
  invoices: 'Tutorial de facturas',
  'raw-inventory': 'Tutorial de bodega',
  settings: 'Tutorial de configuracion',
  team: 'Tutorial de equipo',
};

const mapBusinessType = (answers: BusinessOnboardingWizardAnswers): BusinessTypeKey => {
  if (answers.businessCategory === 'production' || answers.operationsMode === 'production') return 'production';
  if (answers.businessCategory === 'services') return 'services';
  if (answers.businessCategory === 'mixed') return 'wholesale';
  if (answers.salesFlow === 'pending' && (answers.teamMode !== 'solo' || answers.teamStructure !== 'solo_owner')) return 'wholesale';
  return 'simple_store';
};

const deriveOperationalModel = (
  answers: BusinessOnboardingWizardAnswers
): BusinessPersonalizationAnswers['operationalModel'] => {
  if (answers.businessCategory === 'production' || answers.operationsMode === 'production') {
    return answers.salesFlow === 'orders' ? 'production_make_to_order' : 'production_fixed_stock';
  }
  if (answers.businessCategory === 'services') {
    return 'service_no_stock';
  }
  if (answers.businessCategory === 'mixed') {
    return 'mixed';
  }
  return 'resale_fixed_stock';
};

const deriveRawMaterialsMode = (
  answers: BusinessOnboardingWizardAnswers
): BusinessPersonalizationAnswers['rawMaterialsMode'] => (
  answers.inventoryMode === 'yes' || answers.operationsMode === 'production' || answers.operationsMode === 'suppliers'
    ? 'yes'
    : 'no'
);

const deriveRecipeMode = (
  answers: BusinessOnboardingWizardAnswers
): BusinessPersonalizationAnswers['recipeMode'] => (
  answers.businessCategory === 'production' || answers.operationsMode === 'production'
    ? 'fixed'
    : 'none'
);

const deriveSellingMode = (
  answers: BusinessOnboardingWizardAnswers
): BusinessPersonalizationAnswers['sellingMode'] => {
  if (answers.businessCategory === 'services') return 'stock';
  if (answers.businessCategory === 'mixed') return 'both';
  if (answers.salesFlow === 'orders') return 'by_order';
  return 'stock';
};

const deriveProductionControl = (
  answers: BusinessOnboardingWizardAnswers
): BusinessPersonalizationAnswers['productionControl'] => (
  answers.businessCategory === 'production' || answers.operationsMode === 'production'
    ? 'yes'
    : 'no'
);

const buildProfile = (answers: BusinessOnboardingWizardAnswers): BusinessInitialSetupProfile => ({
  business_category: answers.businessCategory,
  inventory_mode: answers.inventoryMode,
  sales_flow: answers.salesFlow,
  home_focus: answers.homeFocus,
  team_mode: answers.teamMode,
  documents_mode: answers.documentsMode,
  operations_mode: answers.operationsMode,
  operational_model: deriveOperationalModel(answers),
  raw_materials_mode: deriveRawMaterialsMode(answers),
  recipe_mode: deriveRecipeMode(answers),
  selling_mode: deriveSellingMode(answers),
  production_control: deriveProductionControl(answers),
  guidance_mode: answers.guidanceMode,
  team_structure: answers.teamStructure,
  role_setup: answers.roleSetup,
  permission_control: answers.permissionControl,
  owner_focus: answers.ownerFocus,
});

const buildPersonalizationAnswers = (
  answers: BusinessOnboardingWizardAnswers,
  businessType: BusinessTypeKey
): BusinessPersonalizationAnswers => {
  const managesRawMaterials =
    answers.inventoryMode === 'yes' || answers.operationsMode === 'production' || answers.operationsMode === 'suppliers';
  const needsQuotes = answers.salesFlow === 'quotes_invoices' || answers.documentsMode === 'formal';
  const needsProfitability =
    businessType === 'production'
    || answers.operationsMode === 'suppliers'
    || answers.ownerFocus === 'profitability_and_growth'
    || answers.roleSetup === 'specific_roles';
  const operationalModel = deriveOperationalModel(answers);
  const rawMaterialsMode = deriveRawMaterialsMode(answers);
  const recipeMode = deriveRecipeMode(answers);
  const sellingMode = deriveSellingMode(answers);
  const productionControl = deriveProductionControl(answers);

  return {
    businessModel: businessType,
    sellsFixedPriceProducts: answers.businessCategory !== 'services',
    needsQuotes,
    managesRawMaterials,
    buysFromSuppliersOnCredit: answers.operationsMode === 'suppliers',
    needsProfitability,
    operationalModel,
    businessCategory: answers.businessCategory,
    inventoryMode: answers.inventoryMode,
    salesFlow: answers.salesFlow,
    homeFocus: answers.homeFocus,
    teamMode: answers.teamMode,
    documentsMode: answers.documentsMode,
    operationsMode: answers.operationsMode,
    rawMaterialsMode,
    recipeMode,
    sellingMode,
    productionControl,
    guidanceMode: answers.guidanceMode,
    teamStructure: answers.teamStructure,
    roleSetup: answers.roleSetup,
    permissionControl: answers.permissionControl,
    ownerFocus: answers.ownerFocus,
  };
};

const buildCommercialSections = (answers: BusinessOnboardingWizardAnswers, flow: OnboardingFlow): BusinessCommercialSectionsState => ({
  orders: answers.salesFlow === 'orders',
  invoices: answers.documentsMode === 'formal' || answers.salesFlow === 'quotes_invoices',
  sales_goals:
    flow === 'business'
    || answers.teamMode !== 'solo'
    || answers.businessCategory === 'production'
    || answers.ownerFocus === 'profitability_and_growth',
});

const buildActivatedModules = (
  answers: BusinessOnboardingWizardAnswers,
  businessType: BusinessTypeKey,
  flow: OnboardingFlow
): BusinessModuleKey[] => {
  const modules = ['sales', 'customers', 'products', 'reports'] as BusinessModuleKey[];

  if (answers.salesFlow === 'pending' || answers.homeFocus === 'collections' || answers.businessCategory === 'mixed') {
    modules.push('accounts_receivable');
  }

  if (answers.salesFlow === 'quotes_invoices' || answers.documentsMode === 'formal' || answers.businessCategory === 'services') {
    modules.push('quotes');
  }

  if (
    answers.inventoryMode === 'yes'
    || answers.operationsMode === 'production'
    || answers.operationsMode === 'suppliers'
    || businessType === 'production'
  ) {
    modules.push('raw_inventory');
  }

  if (flow === 'business') {
    modules.push('reports');
  }

  return unique(modules);
};

const buildHiddenTools = (
  answers: BusinessOnboardingWizardAnswers,
  activatedModules: BusinessModuleKey[],
  commercialSections: BusinessCommercialSectionsState,
  flow: OnboardingFlow
) => {
  const hidden: string[] = [];

  if (!activatedModules.includes('quotes')) hidden.push(TOOL_LABELS.quotes);
  if (!activatedModules.includes('accounts_receivable')) hidden.push(TOOL_LABELS.accounts_receivable);
  if (!activatedModules.includes('raw_inventory')) hidden.push(TOOL_LABELS.raw_inventory);
  if (!commercialSections.orders) hidden.push(TOOL_LABELS.orders);
  if (!commercialSections.invoices) hidden.push(TOOL_LABELS.invoices);
  if (!commercialSections.sales_goals) hidden.push(TOOL_LABELS.sales_goals);
  if (flow !== 'business') {
    hidden.push(TOOL_LABELS.team, TOOL_LABELS.roles, TOOL_LABELS.permissions);
  }
  if (flow === 'pro') {
    hidden.push('Equipo y accesos');
  }
  if (answers.guidanceMode === 'express') {
    hidden.push(TOOL_LABELS.reports);
  }

  return unique(hidden);
};

const buildHighlightedTools = (
  answers: BusinessOnboardingWizardAnswers,
  activatedModules: BusinessModuleKey[],
  commercialSections: BusinessCommercialSectionsState,
  flow: OnboardingFlow
) => {
  const tools = ['Resumen del negocio', moduleLabel('sales')];

  if (answers.homeFocus === 'cash') tools.push('Caja');
  if (answers.homeFocus === 'collections') tools.push(TOOL_LABELS.accounts_receivable);
  if (activatedModules.includes('products')) tools.push(moduleLabel('products'));
  if (activatedModules.includes('quotes')) tools.push(TOOL_LABELS.quotes);
  if (activatedModules.includes('raw_inventory')) tools.push(TOOL_LABELS.raw_inventory);
  if (commercialSections.orders) tools.push(TOOL_LABELS.orders);
  if (commercialSections.invoices) tools.push(TOOL_LABELS.invoices);
  if (flow === 'business') {
    tools.push('Equipo');
    if (answers.roleSetup !== 'owner_only') tools.push('Roles');
    if (answers.permissionControl !== 'simple') tools.push('Permisos');
  }

  return unique(tools);
};

const buildRecommendedTutorials = (
  answers: BusinessOnboardingWizardAnswers,
  activatedModules: BusinessModuleKey[],
  commercialSections: BusinessCommercialSectionsState,
  flow: OnboardingFlow
) => {
  const tutorials = ['dashboard'];

  if (activatedModules.includes('sales')) tutorials.push('sales');
  if (activatedModules.includes('products')) tutorials.push('products');
  if (activatedModules.includes('accounts_receivable')) tutorials.push('payments');
  if (commercialSections.invoices || activatedModules.includes('quotes')) tutorials.push('invoices');
  if (activatedModules.includes('raw_inventory')) tutorials.push('raw-inventory');
  if (flow === 'business' && (answers.roleSetup !== 'owner_only' || answers.permissionControl !== 'simple')) {
    tutorials.push('settings', 'team');
  }

  return unique(tutorials);
};

const buildFocusTargets = (
  answers: BusinessOnboardingWizardAnswers,
  activatedModules: BusinessModuleKey[],
  flow: OnboardingFlow
): {
  prioritizedPath: string;
  initialDashboardTab: 'hoy' | 'balance' | 'analiticas' | 'recordatorios';
} => {
  if (flow === 'business' && answers.ownerFocus === 'team_followup') {
    return { prioritizedPath: '/dashboard', initialDashboardTab: 'recordatorios' };
  }
  if (flow === 'business' && answers.ownerFocus === 'profitability_and_growth') {
    return { prioritizedPath: '/reports', initialDashboardTab: 'analiticas' };
  }

  switch (answers.homeFocus) {
    case 'cash':
      return { prioritizedPath: '/dashboard', initialDashboardTab: 'balance' };
    case 'sales':
      return { prioritizedPath: '/sales', initialDashboardTab: 'hoy' };
    case 'collections':
      return {
        prioritizedPath: activatedModules.includes('accounts_receivable') ? '/payments' : '/dashboard',
        initialDashboardTab: 'balance',
      };
    case 'products':
      return {
        prioritizedPath: activatedModules.includes('products') ? '/products' : '/sales',
        initialDashboardTab: 'hoy',
      };
    case 'summary':
    default:
      return { prioritizedPath: '/dashboard', initialDashboardTab: 'hoy' };
  }
};

const buildVisibilityMode = (answers: BusinessOnboardingWizardAnswers, flow: OnboardingFlow): 'basic' | 'advanced' => {
  if (
    flow === 'business'
    || answers.roleSetup === 'specific_roles'
    || answers.permissionControl !== 'simple'
    || answers.operationsMode === 'production'
    || answers.operationsMode === 'suppliers'
    || answers.inventoryMode === 'yes'
    || answers.documentsMode === 'formal'
  ) {
    return 'advanced';
  }
  return 'basic';
};

const buildSimplicityLevel = (
  answers: BusinessOnboardingWizardAnswers,
  visibilityMode: 'basic' | 'advanced',
  flow: OnboardingFlow
): BusinessInitialSetupSettings['simplicity_level'] => {
  if (flow === 'business' || visibilityMode === 'advanced') return 'advanced';
  if (answers.guidanceMode === 'express') return 'simple';
  if (answers.guidanceMode === 'companion' || answers.salesFlow === 'orders' || answers.salesFlow === 'pending') return 'guided';
  return 'guided';
};

const buildHeadline = (businessType: BusinessTypeKey, focusLabel: string, flow: OnboardingFlow) => {
  if (flow === 'business') {
    return `Tu negocio quedara listo para operar con mas orden, supervision y foco en ${focusLabel.toLowerCase()}.`;
  }
  switch (businessType) {
    case 'services':
      return `Te dejaremos una operacion centrada en ${focusLabel.toLowerCase()} y seguimiento comercial.`;
    case 'production':
      return `Tu negocio quedara listo para vender y controlar mejor la operacion productiva.`;
    case 'wholesale':
      return `Quedara una configuracion equilibrada para vender, cobrar y ordenar mejor tu negocio.`;
    case 'simple_store':
    default:
      return `Te dejaremos una base simple para vender mas facil y tener ${focusLabel.toLowerCase()} cerca.`;
  }
};

export const buildInitialSetupSettings = (
  _answers: BusinessOnboardingWizardAnswers,
  summary: BusinessOnboardingSummary,
  completedAt?: string | null
): BusinessInitialSetupSettings => ({
  version: 1,
  onboarding_profile: summary.profile,
  onboarding_completed: Boolean(completedAt),
  onboarding_completed_at: completedAt || null,
  initial_modules_applied: summary.activatedModules,
  initial_home_focus: summary.prioritizedPath,
  initial_dashboard_tab: summary.initialDashboardTab,
  recommended_tutorials: summary.recommendedTutorials,
  simplicity_level: summary.simplicityLevel,
  highlighted_tools: summary.highlightedTools,
  hidden_tools: summary.hiddenTools,
});

export const buildBusinessOnboardingSummary = (
  answers: BusinessOnboardingWizardAnswers,
  flow: OnboardingFlow = 'pro'
): BusinessOnboardingSummary => {
  const businessType = flow === 'basic' ? 'simple_store' : mapBusinessType(answers);
  const profile = buildProfile(answers);
  const activatedModules = buildActivatedModules(answers, businessType, flow);
  const commercialSections = buildCommercialSections(answers, flow);
  const recommendedTutorials = buildRecommendedTutorials(answers, activatedModules, commercialSections, flow);
  const { prioritizedPath, initialDashboardTab } = buildFocusTargets(answers, activatedModules, flow);
  const visibilityMode = buildVisibilityMode(answers, flow);
  const simplicityLevel = buildSimplicityLevel(answers, visibilityMode, flow);
  const highlightedTools = buildHighlightedTools(answers, activatedModules, commercialSections, flow);
  const hiddenTools = buildHiddenTools(answers, activatedModules, commercialSections, flow);
  const focusLabel = HOME_FOCUS_LABELS[answers.homeFocus];

  const summary =
    flow === 'business'
      ? 'Vas a entrar con una base pensada para supervisar operacion, equipo y accesos sin volver la experiencia pesada.'
      : answers.businessCategory === 'production'
        ? 'Activaremos una vista mas operativa para que compras, insumos y ventas convivan sin sobrecargarte.'
        : answers.salesFlow === 'pending'
          ? 'Veras una experiencia pensada para vender y no perder de vista cobros ni pendientes.'
          : 'La app arrancara con una experiencia limpia y herramientas acordes a tu forma real de trabajar.';

  return {
    headline: buildHeadline(businessType, focusLabel, flow),
    summary,
    businessType,
    visibilityMode,
    prioritizedPath,
    initialDashboardTab,
    activatedModules,
    highlightedTools,
    hiddenTools,
    recommendedTutorials,
    simplicityLevel,
    commercialSections,
    profile,
    personalizationAnswers: buildPersonalizationAnswers(answers, businessType),
    focusLabel,
    flow,
  };
};

export const BASIC_ONBOARDING_PRESET = buildBusinessOnboardingSummary(
  {
    ...DEFAULT_BUSINESS_ONBOARDING_ANSWERS,
    guidanceMode: 'express',
  },
  'basic'
);

export const getTutorialDisplayLabel = (tutorialId: string) => TUTORIAL_LABELS[tutorialId] || tutorialId;

export const getQuestionSetForFlow = (flow: OnboardingFlow) => {
  if (flow === 'business') return BUSINESS_ONBOARDING_QUESTIONS;
  if (flow === 'pro') return PRO_ONBOARDING_QUESTIONS;
  return [] as const;
};

export const resolveOnboardingFlow = (plan?: string | null): OnboardingFlow => {
  if (plan === 'business') return 'business';
  if (plan === 'pro') return 'pro';
  return 'basic';
};
