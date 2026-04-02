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
  BusinessOnboardingProductionControl,
  BusinessOnboardingRawMaterialsMode,
  BusinessOnboardingRecipeMode,
  BusinessOnboardingRoleSetup,
  BusinessOnboardingSalesFlow,
  BusinessOnboardingSellingMode,
  BusinessOnboardingTeamMode,
  BusinessOnboardingTeamStructure,
  BusinessPersonalizationAnswers,
  BusinessTypeKey,
} from './businessPersonalization';
import {
  type BusinessOperationalModel,
  type BusinessOperationalProfile,
  normalizeBusinessOperationalProfile,
} from './businessOperationalProfile';

export const INITIAL_ONBOARDING_CHANGE_MESSAGE =
  'Esto es solo una configuracion inicial. Podras cambiarlo cuando quieras mas adelante.';

export type OnboardingFlow = 'basic' | 'pro' | 'business';
export type OnboardingVisualTone = 'sunrise' | 'ocean' | 'mint' | 'gold' | 'rose' | 'ink';

export type ProQuestionId =
  | 'operational_model'
  | 'raw_materials_mode'
  | 'recipe_mode'
  | 'selling_mode'
  | 'production_control'
  | 'sales_flow'
  | 'home_focus'
  | 'documents_mode'
  | 'guidance_mode';

export type BusinessQuestionId =
  | 'operational_model'
  | 'raw_materials_mode'
  | 'recipe_mode'
  | 'selling_mode'
  | 'production_control'
  | 'sales_flow'
  | 'home_focus'
  | 'documents_mode'
  | 'team_mode'
  | 'team_structure'
  | 'role_setup'
  | 'permission_control'
  | 'owner_focus';

export type OnboardingQuestionId = ProQuestionId | BusinessQuestionId;

export interface BusinessOnboardingWizardAnswers {
  name: string;
  currency: string;
  operationalModel: BusinessOperationalModel;
  rawMaterialsMode: BusinessOnboardingRawMaterialsMode;
  recipeMode: BusinessOnboardingRecipeMode;
  sellingMode: BusinessOnboardingSellingMode;
  productionControl: BusinessOnboardingProductionControl;
  salesFlow: BusinessOnboardingSalesFlow;
  homeFocus: BusinessOnboardingHomeFocus;
  teamMode: BusinessOnboardingTeamMode;
  documentsMode: BusinessOnboardingDocumentsMode;
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
  operationalProfile: BusinessOperationalProfile;
  personalizationAnswers: BusinessPersonalizationAnswers;
  focusLabel: string;
  flow: OnboardingFlow;
  operationalModelLabel: string;
}

type ProQuestion = OnboardingQuestionDefinition<
  | BusinessOperationalModel
  | BusinessOnboardingRawMaterialsMode
  | BusinessOnboardingRecipeMode
  | BusinessOnboardingSellingMode
  | BusinessOnboardingProductionControl
  | BusinessOnboardingSalesFlow
  | BusinessOnboardingHomeFocus
  | BusinessOnboardingDocumentsMode
  | BusinessOnboardingGuidanceMode,
  ProQuestionId
>;

type BusinessQuestion = OnboardingQuestionDefinition<
  | BusinessOperationalModel
  | BusinessOnboardingRawMaterialsMode
  | BusinessOnboardingRecipeMode
  | BusinessOnboardingSellingMode
  | BusinessOnboardingProductionControl
  | BusinessOnboardingSalesFlow
  | BusinessOnboardingHomeFocus
  | BusinessOnboardingDocumentsMode
  | BusinessOnboardingTeamMode
  | BusinessOnboardingTeamStructure
  | BusinessOnboardingRoleSetup
  | BusinessOnboardingPermissionControl
  | BusinessOnboardingOwnerFocus,
  BusinessQuestionId
>;

const unique = <T,>(values: T[]) => Array.from(new Set(values));
const moduleLabel = (moduleKey: BusinessModuleKey) => BUSINESS_MODULE_META[moduleKey].label;

const OPERATIONAL_MODEL_LABELS: Record<BusinessOperationalModel, string> = {
  production_fixed_stock: 'Producción con stock fijo',
  production_make_to_order: 'Producción por pedido o cotización',
  resale_fixed_stock: 'Reventa con stock fijo',
  service_no_stock: 'Servicios o sin stock',
  mixed: 'Operación mixta',
};

export const DEFAULT_BUSINESS_ONBOARDING_ANSWERS: BusinessOnboardingWizardAnswers = {
  name: '',
  currency: 'USD',
  operationalModel: 'resale_fixed_stock',
  rawMaterialsMode: 'no',
  recipeMode: 'none',
  sellingMode: 'stock',
  productionControl: 'no',
  salesFlow: 'immediate',
  homeFocus: 'summary',
  teamMode: 'solo',
  documentsMode: 'simple_receipts',
  guidanceMode: 'guided',
  teamStructure: 'solo_owner',
  roleSetup: 'owner_only',
  permissionControl: 'simple',
  ownerFocus: 'cash_and_sales',
};

export const PRO_ONBOARDING_QUESTIONS: ProQuestion[] = [
  {
    id: 'operational_model',
    eyebrow: 'Paso 2',
    title: 'Como funciona lo que vendes?',
    description: 'Esta respuesta define la base real de inventario, produccion, bodega, cotizaciones y ventas para tu negocio.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'production_fixed_stock', title: 'Produzco productos fijos y manejo stock de esos productos', description: 'Ideal para restaurantes, cafes, panaderias, reposteria o productos fijos que primero se producen y luego se venden.', activates: ['Producción', 'Productos terminados', 'Bodega y recetas'], benefit: 'La app separa claramente producir de vender: primero subes producto terminado y luego solo bajas ese stock al vender.', icon: 'factory', tone: 'gold' },
      { value: 'production_make_to_order', title: 'Trabajo por pedidos o cotizaciones personalizadas', description: 'Pensado para encargos, fabricacion a medida o productos que cambian segun cada cliente.', activates: ['Cotizaciones', 'Bodega', 'Consumo por cumplimiento'], benefit: 'La base queda lista para no depender de stock fijo de producto terminado cuando trabajas por encargo.', icon: 'clipboard-list', tone: 'ocean' },
      { value: 'resale_fixed_stock', title: 'Compro productos terminados y los revendo', description: 'Perfecto para retail, ropa, tiendas comerciales, cosmética o catálogo terminado.', activates: ['Productos', 'Stock', 'Ventas'], benefit: 'La operacion arranca enfocada en subir producto terminado y descontarlo al vender.', icon: 'package', tone: 'mint' },
      { value: 'service_no_stock', title: 'Vendo servicios o no manejo inventario', description: 'Para negocios donde el foco es vender, cotizar y cobrar sin inventario ni materias primas.', activates: ['Ventas', 'Clientes', 'Cotizaciones'], benefit: 'Mantiene la experiencia limpia y comercial sin forzarte a entrar por inventario.', icon: 'briefcase', tone: 'sunrise' },
      { value: 'mixed', title: 'Tengo una operación mixta', description: 'Combino stock, encargos o más de una forma real de cumplimiento en el mismo negocio.', activates: ['Operación híbrida', 'Ventas', 'Bodega flexible'], benefit: 'Te deja una base intermedia para crecer sin encasillarte en un solo flujo desde el inicio.', icon: 'layers', tone: 'ink' },
    ],
  },
  {
    id: 'raw_materials_mode',
    eyebrow: 'Paso 3',
    title: 'Necesitas manejar materias primas y bodega?',
    description: 'Con esto definimos si el negocio debe activar bodega de insumos desde el primer día.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'yes', title: 'Si, manejo materias primas o insumos', description: 'Necesito controlar entradas, salidas, stock minimo y consumo de materiales.', activates: ['Inventario bodega', 'Movimientos', 'Alertas de stock'], benefit: 'Activa una base real de bodega para que materias primas, recetas y consumos tengan donde vivir.', icon: 'boxes', tone: 'ocean' },
      { value: 'no', title: 'No, solo trabajo con producto terminado o sin inventario', description: 'No necesito una bodega de insumos como parte principal de la operación.', activates: ['Vista más simple', 'Menos carga operativa'], benefit: 'Evita mostrar una bodega que no aporta a tu forma de trabajar hoy.', icon: 'circle-off', tone: 'rose' },
    ],
  },
  {
    id: 'recipe_mode',
    eyebrow: 'Paso 4',
    title: 'Tus productos salen de una receta fija o cambian según el pedido?',
    description: 'Esto ayuda a distinguir entre producción repetible y consumo más variable o personalizado.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'fixed', title: 'Salen de una receta fija', description: 'Tengo preparaciones o fórmulas repetibles que conviene modelar como recetas.', activates: ['Recetas', 'Costos repetibles', 'Producción más clara'], benefit: 'Facilita enlazar productos con recetas y usar una lógica estable para producción y costo.', icon: 'chef-hat', tone: 'gold' },
      { value: 'variable', title: 'Cambian según el pedido', description: 'Los materiales o cantidades varían según lo que pida cada cliente.', activates: ['Operación por encargo', 'Consumo más flexible'], benefit: 'Deja preparada una base más compatible con trabajos personalizados y cumplimiento por pedido.', icon: 'wand', tone: 'sunrise' },
      { value: 'none', title: 'No necesito recetas', description: 'No trabajo con recetas ni fórmulas como parte del flujo inicial.', activates: ['Operación simple', 'Menos configuración'], benefit: 'Mantiene el onboarding enfocado cuando no necesitas producción guiada por recetas.', icon: 'circle', tone: 'ink' },
    ],
  },
  {
    id: 'selling_mode',
    eyebrow: 'Paso 5',
    title: 'Vendes productos en stock, por encargo o ambos?',
    description: 'Esto define si el cumplimiento principal nace desde stock, desde pedido o en un modelo híbrido.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'stock', title: 'Principalmente en stock', description: 'Normalmente vendo algo que ya tengo listo o disponible para entregar.', activates: ['Stock visible', 'Venta directa'], benefit: 'La app prioriza producto disponible y una salida rápida desde ventas.', icon: 'shopping-bag', tone: 'mint' },
      { value: 'by_order', title: 'Principalmente por encargo', description: 'Lo que vendo suele cumplirse después de confirmar el pedido o la cotización.', activates: ['Cotizaciones', 'Pedidos', 'Cumplimiento posterior'], benefit: 'Deja la base lista para trabajar más por flujo comercial y cumplimiento que por stock fijo.', icon: 'file-text', tone: 'ocean' },
      { value: 'both', title: 'Ambos', description: 'A veces vendo algo listo y otras veces trabajo por encargo o producción posterior.', activates: ['Operación híbrida', 'Más flexibilidad'], benefit: 'Te da una base más realista cuando combinas venta inmediata con trabajos por pedido.', icon: 'refresh-cw', tone: 'ink' },
    ],
  },
  {
    id: 'production_control',
    eyebrow: 'Paso 6',
    title: 'Quieres controlar producción desde el sistema?',
    description: 'Solo queremos saber si conviene dejar preparada una lógica explícita de producción desde el onboarding.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'yes', title: 'Si, quiero controlar producción desde el sistema', description: 'Necesito que la app me ayude a separar producir, consumir insumos y dejar trazabilidad.', activates: ['Producción', 'Trazabilidad', 'Control operativo'], benefit: 'Da una base mejor para negocios que necesitan producir con disciplina desde el primer día.', icon: 'factory', tone: 'gold' },
      { value: 'later', title: 'Más adelante', description: 'Quiero dejar la base preparada, pero sin volver más pesada la operación inicial.', activates: ['Base preparada', 'Menos fricción hoy'], benefit: 'Te deja la puerta abierta sin exigir un flujo más avanzado en este momento.', icon: 'sparkles', tone: 'mint' },
      { value: 'no', title: 'No por ahora', description: 'No necesito usar una capa de control de producción en la configuración inicial.', activates: ['Operación ligera', 'Menos pasos'], benefit: 'Evita activar una lógica que todavía no forma parte de tu trabajo diario.', icon: 'circle-off', tone: 'rose' },
    ],
  },
  {
    id: 'sales_flow',
    eyebrow: 'Paso 7',
    title: 'Como vendes y cobras normalmente?',
    description: 'Queremos saber si tu flujo es inmediato, con saldo pendiente o más documental.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'immediate', title: 'Vendo y cobro al momento', description: 'La mayoría de mis ventas se cierran en una sola interacción.', activates: ['Caja del día', 'Ventas rápidas', 'Resumen simple'], benefit: 'La app te recibe con un flujo directo y sin pasos extra.', icon: 'zap', tone: 'sunrise' },
      { value: 'pending', title: 'A veces queda saldo pendiente', description: 'Necesito seguir cobros, abonos o clientes con cartera.', activates: ['Cobros', 'Cuentas por cobrar', 'Seguimiento a cartera'], benefit: 'Tus pendientes quedan mucho más visibles para no dejar dinero en el aire.', icon: 'wallet', tone: 'ocean' },
      { value: 'orders', title: 'Trabajo por pedidos o encargos', description: 'Recibo pedidos o trabajos que cierro después.', activates: ['Pedidos', 'Clientes', 'Seguimiento comercial'], benefit: 'Te ayuda a ordenar mejor ventas que no se cierran en un solo momento.', icon: 'clipboard-list', tone: 'mint' },
      { value: 'quotes_invoices', title: 'Necesito cotizaciones o facturas', description: 'Antes de vender suelo cotizar o necesito soporte formal del proceso.', activates: ['Cotizaciones', 'Facturas', 'Flujo comercial guiado'], benefit: 'Dejas lista una operación más documentada sin sentirla técnica.', icon: 'receipt', tone: 'gold' },
    ],
  },
  {
    id: 'home_focus',
    eyebrow: 'Paso 8',
    title: 'Que quieres ver primero cuando entres?',
    description: 'Esto define tu foco inicial y qué quedará más a la mano en la navegación.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'cash', title: 'Caja', description: 'Quiero ver el dinero y el movimiento financiero del negocio.', activates: ['Vista de caja', 'Balance del día'], benefit: 'Llegas directo a lo financiero si eso manda tu operación diaria.', icon: 'landmark', tone: 'ocean' },
      { value: 'sales', title: 'Ventas', description: 'Quiero entrar listo para registrar y mover la operación comercial.', activates: ['Ventas', 'Acciones rápidas comerciales'], benefit: 'Entras con la parte comercial al frente, sin vueltas.', icon: 'shopping-bag', tone: 'sunrise' },
      { value: 'collections', title: 'Cobros', description: 'Lo más importante para mí es revisar quién me debe y cobrar.', activates: ['Cobros', 'Pendientes de clientes'], benefit: 'Si tu foco es cartera, la app te lleva allí más rápido.', icon: 'coins', tone: 'gold' },
      { value: 'products', title: 'Productos', description: 'Quiero entrar pensando en catálogo, referencias o inventario.', activates: ['Productos', 'Catálogo', 'Control del portafolio'], benefit: 'Tu portafolio queda más cerca si es parte central de tu trabajo.', icon: 'tags', tone: 'mint' },
      { value: 'summary', title: 'Resumen', description: 'Prefiero una vista general y luego decidir qué atender.', activates: ['Dashboard principal', 'Resumen general'], benefit: 'Te da una entrada más amplia y fácil para orientarte rápido.', icon: 'layout-dashboard', tone: 'ink' },
    ],
  },
  {
    id: 'documents_mode',
    eyebrow: 'Paso 9',
    title: 'Necesitas documentos comerciales formales?',
    description: 'Con esto definimos si conviene dejar visible un flujo documental o mantenerlo simple.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'formal', title: 'Si, necesito soporte formal', description: 'Quiero facturas, cotizaciones o soporte comercial más claro.', activates: ['Facturas', 'Cotizaciones', 'Seguimiento documental'], benefit: 'Tu configuración inicial queda lista para vender con más respaldo.', icon: 'receipt', tone: 'gold' },
      { value: 'simple_receipts', title: 'Solo comprobantes simples', description: 'Quiero vender y dejar soporte básico sin una experiencia pesada.', activates: ['Ventas', 'Comprobantes simples'], benefit: 'Mantiene una operación ligera sin esconder lo importante.', icon: 'ticket', tone: 'sunrise' },
      { value: 'none', title: 'No por ahora', description: 'Prefiero no mostrar ese flujo al inicio.', activates: ['Vista más limpia', 'Menos herramientas visibles'], benefit: 'La app queda enfocada en vender y operar sin pasos extra.', icon: 'circle-off', tone: 'rose' },
    ],
  },
  {
    id: 'guidance_mode',
    eyebrow: 'Paso 10',
    title: 'Cuanta ayuda inicial quieres?',
    description: 'Elegimos si prefieres una experiencia express, guiada o más acompañada al comienzo.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'express', title: 'Lo más simple posible', description: 'Quiero entrar rápido, con menos cosas visibles y una operación bien directa.', activates: ['Experiencia express', 'Menos ruido', 'Vista muy limpia'], benefit: 'Ideal si prefieres una herramienta ágil y sin pasos extra.', icon: 'zap', tone: 'ink' },
      { value: 'guided', title: 'Un balance entre claridad y ayuda', description: 'Quiero una base clara, con algunas guías y herramientas relevantes visibles.', activates: ['Experiencia guiada', 'Atajos útiles', 'Configuración equilibrada'], benefit: 'Es la mejor opción si quieres empezar cómodo sin sentirlo básico.', icon: 'sparkles', tone: 'ocean' },
      { value: 'companion', title: 'Quiero más contexto al principio', description: 'Prefiero ver más ayudas, herramientas recomendadas y seguimiento comercial visible.', activates: ['Más acompañamiento', 'Herramientas sugeridas', 'Mayor contexto inicial'], benefit: 'Te orienta mejor cuando quieres entender el sistema desde el inicio.', icon: 'wand', tone: 'gold' },
    ],
  },
];

export const BUSINESS_ONBOARDING_QUESTIONS: BusinessQuestion[] = [
  ...(PRO_ONBOARDING_QUESTIONS.filter((question) => question.id !== 'guidance_mode') as BusinessQuestion[]),
  {
    id: 'team_mode',
    eyebrow: 'Paso 10',
    title: 'Trabajas solo o con equipo?',
    description: 'Esto define si tu configuración inicial debe sentirse más personal o más pensada para coordinar personas.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'solo', title: 'Trabajo solo por ahora', description: 'Quiero una base clara, pero lista para crecer si más adelante invito personas.', activates: ['Vista simple', 'Base escalable'], benefit: 'Empiezas ligero, sin perder la posibilidad de crecer luego.', icon: 'user', tone: 'ink' },
      { value: 'small_team', title: 'Tengo un equipo pequeño', description: 'Somos pocas personas y necesitamos coordinarnos sin complicarnos.', activates: ['Organización comercial', 'Seguimiento del equipo'], benefit: 'Equilibra simplicidad con herramientas para coordinar mejor.', icon: 'users', tone: 'mint' },
      { value: 'roles', title: 'Hay funciones distintas en el equipo', description: 'Necesito una operación lista para personas con tareas y accesos diferentes.', activates: ['Vista avanzada', 'Equipo y roles más visibles'], benefit: 'Deja la base lista para crecer sin quedarse corta muy rápido.', icon: 'shield', tone: 'gold' },
    ],
  },
  {
    id: 'team_structure',
    eyebrow: 'Paso 11',
    title: 'Que tipo de personas usarán la app?',
    description: 'Con esto entendemos si debes organizar la operación por áreas o por tareas puntuales.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'solo_owner', title: 'Solo yo o una persona de apoyo', description: 'La cuenta principal seguirá llevando casi toda la operación.', activates: ['Supervisión central', 'Flujo simple de acceso'], benefit: 'Mantiene la estructura limpia cuando el dueño sigue controlando todo.', icon: 'user', tone: 'ink' },
      { value: 'small_operations_team', title: 'Caja, ventas o apoyo operativo', description: 'Hay personas ayudando en operación diaria, pero no demasiadas áreas distintas.', activates: ['Supervisión operativa', 'Organización por tareas'], benefit: 'Te deja una base útil para separar operación sin complejidad innecesaria.', icon: 'shopping-bag', tone: 'ocean' },
      { value: 'sales_and_admin', title: 'Ventas y administración', description: 'Necesito separar quién vende, quién cobra y quién revisa números.', activates: ['Separación comercial', 'Control administrativo'], benefit: 'La configuración refleja mejor negocios con más de un frente de trabajo.', icon: 'coins', tone: 'sunrise' },
      { value: 'multi_area_team', title: 'Varias áreas o responsables', description: 'Quiero ordenar acceso para personas con responsabilidades diferentes.', activates: ['Equipo multiarea', 'Accesos organizados'], benefit: 'Ideal si quieres una base más formal para coordinar mejor el negocio.', icon: 'briefcase', tone: 'gold' },
    ],
  },
  {
    id: 'role_setup',
    eyebrow: 'Paso 12',
    title: 'Necesitas roles distintos dentro del equipo?',
    description: 'Así definimos si conviene dejar más visible la parte de organización del equipo y administración.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'owner_only', title: 'No, con un control central me basta', description: 'Prefiero manejar los accesos de forma simple y centralizada.', activates: ['Administración simple', 'Menos complejidad inicial'], benefit: 'La configuración sigue clara si no quieres pensar aún en estructura formal.', icon: 'circle', tone: 'ink' },
      { value: 'shared_roles', title: 'Si, pero con pocos roles', description: 'Necesito separar algunas tareas sin volverlo un sistema pesado.', activates: ['Roles básicos', 'Equipo más ordenado'], benefit: 'Te ayuda a crecer con orden sin abrumar al equipo.', icon: 'users', tone: 'mint' },
      { value: 'specific_roles', title: 'Si, necesito roles bien definidos', description: 'Quiero distinguir mejor responsables, supervisión y operación.', activates: ['Roles definidos', 'Mayor control del equipo'], benefit: 'Muy útil si quieres una estructura más formal desde el inicio.', icon: 'shield', tone: 'gold' },
    ],
  },
  {
    id: 'permission_control',
    eyebrow: 'Paso 13',
    title: 'Como quieres organizar los permisos?',
    description: 'Esto nos dice si el acceso del equipo debe ser simple o más controlado por área o por persona.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'simple', title: 'Con acceso simple', description: 'Prefiero empezar rápido y ajustar los permisos después si hace falta.', activates: ['Permisos simples', 'Menos fricción al inicio'], benefit: 'Ideal si quieres lanzar rápido y ordenar el detalle más adelante.', icon: 'sparkles', tone: 'ink' },
      { value: 'by_area', title: 'Por áreas del negocio', description: 'Quiero separar mejor ventas, cobros, productos o administración.', activates: ['Accesos por área', 'Equipo mejor organizado'], benefit: 'Te ayuda a mantener cada parte del negocio más clara para el equipo.', icon: 'layers', tone: 'ocean' },
      { value: 'by_person', title: 'Por persona o responsabilidad', description: 'Necesito más control fino según quién usa la app y qué debe ver.', activates: ['Control fino', 'Mayor supervisión del acceso'], benefit: 'Es la opción más útil si tu equipo ya requiere una estructura más seria.', icon: 'shield', tone: 'gold' },
    ],
  },
  {
    id: 'owner_focus',
    eyebrow: 'Paso 14',
    title: 'Como dueño, que quieres supervisar más de cerca?',
    description: 'Usaremos esto para sugerirte el enfoque inicial y las herramientas más visibles para supervisión.',
    helper: INITIAL_ONBOARDING_CHANGE_MESSAGE,
    options: [
      { value: 'cash_and_sales', title: 'Caja y ventas', description: 'Quiero tener claro qué se está vendiendo y cómo se mueve el dinero.', activates: ['Caja', 'Ventas', 'Seguimiento comercial'], benefit: 'Te deja una entrada útil para controlar operación y movimiento diario.', icon: 'landmark', tone: 'ocean' },
      { value: 'team_followup', title: 'Seguimiento del equipo', description: 'Me importa coordinar personas y entender cómo va la operación del equipo.', activates: ['Supervisión del equipo', 'Organización visible'], benefit: 'La app te mostrará una operación más pensada para coordinar personas.', icon: 'users', tone: 'mint' },
      { value: 'approvals_and_control', title: 'Aprobaciones y control', description: 'Quiero una base más gerencial para revisar orden, accesos y decisiones.', activates: ['Control operativo', 'Mayor formalidad'], benefit: 'Refuerza la sensación de administración y control del negocio.', icon: 'shield', tone: 'gold' },
      { value: 'profitability_and_growth', title: 'Rentabilidad y crecimiento', description: 'Quiero enfocarme más en márgenes, números y visión de crecimiento.', activates: ['Reportes', 'Rentabilidad', 'Visión estratégica'], benefit: 'Lleva al frente lo necesario para supervisar el negocio como dueño.', icon: 'briefcase', tone: 'sunrise' },
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
  production: 'Producción',
};

const TUTORIAL_LABELS: Record<string, string> = {
  dashboard: 'Recorrido por el dashboard',
  sales: 'Tutorial de ventas',
  payments: 'Tutorial de cobros',
  products: 'Tutorial de productos',
  quotes: 'Tutorial de cotizaciones',
  invoices: 'Tutorial de facturas',
  'raw-inventory': 'Tutorial de bodega',
  settings: 'Tutorial de configuración',
  team: 'Tutorial de equipo',
};

const deriveLegacyBusinessCategory = (answers: BusinessOnboardingWizardAnswers): BusinessOnboardingBusinessCategory => {
  switch (answers.operationalModel) {
    case 'production_fixed_stock':
    case 'production_make_to_order':
      return 'production';
    case 'service_no_stock':
      return 'services';
    case 'mixed':
      return 'mixed';
    case 'resale_fixed_stock':
    default:
      return 'products';
  }
};

const deriveLegacyInventoryMode = (answers: BusinessOnboardingWizardAnswers): BusinessOnboardingInventoryMode => {
  if (answers.rawMaterialsMode === 'yes') return 'yes';
  if (answers.operationalModel === 'service_no_stock') return 'no';
  if (answers.sellingMode === 'stock' || answers.sellingMode === 'both' || answers.operationalModel === 'resale_fixed_stock') return 'basic';
  return 'no';
};

const deriveLegacyOperationsMode = (answers: BusinessOnboardingWizardAnswers): BusinessOnboardingOperationsMode => {
  if (answers.operationalModel === 'production_fixed_stock' || answers.operationalModel === 'production_make_to_order') return 'production';
  if (answers.operationalModel === 'resale_fixed_stock') return 'resale';
  if (answers.rawMaterialsMode === 'yes') return 'suppliers';
  return 'none';
};

const buildOperationalProfile = (answers: BusinessOnboardingWizardAnswers): BusinessOperationalProfile => {
  const managesRawMaterials =
    answers.rawMaterialsMode === 'yes'
    || answers.operationalModel === 'production_fixed_stock'
    || answers.operationalModel === 'production_make_to_order';
  const tracksFinishedGoodsStock =
    answers.operationalModel === 'production_fixed_stock'
    || answers.operationalModel === 'resale_fixed_stock'
    || (answers.operationalModel === 'mixed' && answers.sellingMode !== 'by_order');
  const supportsMakeToOrder =
    answers.operationalModel === 'production_make_to_order'
    || answers.operationalModel === 'mixed'
    || answers.sellingMode === 'by_order'
    || answers.sellingMode === 'both';
  const usesRecipes = managesRawMaterials && answers.recipeMode !== 'none' && answers.operationalModel !== 'resale_fixed_stock' && answers.operationalModel !== 'service_no_stock';
  const controlsProduction =
    answers.productionControl === 'yes'
    || answers.operationalModel === 'production_fixed_stock'
    || answers.operationalModel === 'production_make_to_order';

  return normalizeBusinessOperationalProfile({
    version: 1,
    operational_model: answers.operationalModel,
    inventory_model:
      answers.operationalModel === 'service_no_stock'
        ? 'none'
        : answers.operationalModel === 'resale_fixed_stock'
          ? 'resale_products'
          : answers.operationalModel === 'production_make_to_order'
            ? 'raw_materials_only'
            : answers.operationalModel === 'mixed'
              ? 'mixed'
              : 'finished_goods',
    fulfillment_mode:
      answers.operationalModel === 'service_no_stock'
        ? 'service'
        : answers.sellingMode === 'both'
          ? 'hybrid'
          : answers.sellingMode === 'by_order'
            ? 'make_to_order'
            : 'stock',
    production_mode:
      answers.operationalModel === 'production_fixed_stock'
        ? 'to_stock'
        : answers.operationalModel === 'production_make_to_order'
          ? 'to_order'
          : answers.operationalModel === 'mixed'
            ? 'mixed'
            : 'none',
    recipe_mode: answers.recipeMode,
    production_control_mode: answers.productionControl === 'yes' ? 'enabled' : answers.productionControl === 'later' ? 'later' : 'disabled',
    manages_raw_materials: managesRawMaterials,
    tracks_finished_goods_stock: tracksFinishedGoodsStock,
    uses_raw_inventory: managesRawMaterials,
    uses_recipes: usesRecipes,
    controls_production: controlsProduction,
    supports_quotes:
      answers.documentsMode === 'formal'
      || answers.salesFlow === 'quotes_invoices'
      || supportsMakeToOrder
      || answers.operationalModel === 'service_no_stock',
    supports_make_to_order: supportsMakeToOrder,
    consumes_raw_materials_on_production: managesRawMaterials && tracksFinishedGoodsStock && controlsProduction && usesRecipes,
    consumes_raw_materials_on_sale: managesRawMaterials && !tracksFinishedGoodsStock && usesRecipes,
    consumes_raw_materials_on_quote_conversion: managesRawMaterials && supportsMakeToOrder && usesRecipes,
  });
};

const mapBusinessType = (answers: BusinessOnboardingWizardAnswers, operationalProfile: BusinessOperationalProfile): BusinessTypeKey => {
  if (answers.operationalModel === 'production_fixed_stock' || answers.operationalModel === 'production_make_to_order') return 'production';
  if (answers.operationalModel === 'service_no_stock') return 'services';
  if (answers.operationalModel === 'resale_fixed_stock') return 'simple_store';
  if (answers.operationalModel === 'mixed') {
    return operationalProfile.manages_raw_materials ? 'production' : 'wholesale';
  }
  if (answers.salesFlow === 'pending' && (answers.teamMode !== 'solo' || answers.teamStructure !== 'solo_owner')) return 'wholesale';
  return 'simple_store';
};

const buildProfile = (answers: BusinessOnboardingWizardAnswers): BusinessInitialSetupProfile => ({
  business_category: deriveLegacyBusinessCategory(answers),
  inventory_mode: deriveLegacyInventoryMode(answers),
  sales_flow: answers.salesFlow,
  home_focus: answers.homeFocus,
  team_mode: answers.teamMode,
  documents_mode: answers.documentsMode,
  operations_mode: deriveLegacyOperationsMode(answers),
  operational_model: answers.operationalModel,
  raw_materials_mode: answers.rawMaterialsMode,
  recipe_mode: answers.recipeMode,
  selling_mode: answers.sellingMode,
  production_control: answers.productionControl,
  guidance_mode: answers.guidanceMode,
  team_structure: answers.teamStructure,
  role_setup: answers.roleSetup,
  permission_control: answers.permissionControl,
  owner_focus: answers.ownerFocus,
});

const buildPersonalizationAnswers = (
  answers: BusinessOnboardingWizardAnswers,
  businessType: BusinessTypeKey,
  operationalProfile: BusinessOperationalProfile
): BusinessPersonalizationAnswers => ({
  businessModel: businessType,
  operationalModel: answers.operationalModel,
  sellsFixedPriceProducts: answers.operationalModel !== 'service_no_stock',
  needsQuotes: operationalProfile.supports_quotes,
  managesRawMaterials: operationalProfile.manages_raw_materials,
  buysFromSuppliersOnCredit: answers.rawMaterialsMode === 'yes' && answers.operationalModel !== 'service_no_stock',
  needsProfitability:
    businessType === 'production'
    || answers.ownerFocus === 'profitability_and_growth'
    || answers.roleSetup === 'specific_roles'
    || operationalProfile.manages_raw_materials,
  businessCategory: deriveLegacyBusinessCategory(answers),
  inventoryMode: deriveLegacyInventoryMode(answers),
  salesFlow: answers.salesFlow,
  homeFocus: answers.homeFocus,
  teamMode: answers.teamMode,
  documentsMode: answers.documentsMode,
  operationsMode: deriveLegacyOperationsMode(answers),
  rawMaterialsMode: answers.rawMaterialsMode,
  recipeMode: answers.recipeMode,
  sellingMode: answers.sellingMode,
  productionControl: answers.productionControl,
  guidanceMode: answers.guidanceMode,
  teamStructure: answers.teamStructure,
  roleSetup: answers.roleSetup,
  permissionControl: answers.permissionControl,
  ownerFocus: answers.ownerFocus,
});

const buildCommercialSections = (
  answers: BusinessOnboardingWizardAnswers,
  flow: OnboardingFlow,
  operationalProfile: BusinessOperationalProfile
): BusinessCommercialSectionsState => ({
  orders: answers.salesFlow === 'orders' || operationalProfile.supports_make_to_order,
  invoices: answers.documentsMode === 'formal' || answers.salesFlow === 'quotes_invoices',
  sales_goals:
    flow === 'business'
    || answers.teamMode !== 'solo'
    || operationalProfile.manages_raw_materials
    || answers.ownerFocus === 'profitability_and_growth',
});

const buildActivatedModules = (
  answers: BusinessOnboardingWizardAnswers,
  businessType: BusinessTypeKey,
  flow: OnboardingFlow,
  operationalProfile: BusinessOperationalProfile
): BusinessModuleKey[] => {
  const modules = ['sales', 'customers', 'reports'] as BusinessModuleKey[];

  if (answers.operationalModel !== 'service_no_stock') {
    modules.push('products');
  }

  if (answers.salesFlow === 'pending' || answers.homeFocus === 'collections') {
    modules.push('accounts_receivable');
  }

  if (operationalProfile.supports_quotes) {
    modules.push('quotes');
  }

  if (operationalProfile.uses_raw_inventory) {
    modules.push('raw_inventory');
  }

  if (flow === 'business' || businessType === 'production') {
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
  flow: OnboardingFlow,
  operationalProfile: BusinessOperationalProfile
) => {
  const tools = ['Resumen del negocio', moduleLabel('sales')];

  if (answers.homeFocus === 'cash') tools.push('Caja');
  if (answers.homeFocus === 'collections') tools.push(TOOL_LABELS.accounts_receivable);
  if (activatedModules.includes('products')) tools.push(moduleLabel('products'));
  if (activatedModules.includes('quotes')) tools.push(TOOL_LABELS.quotes);
  if (activatedModules.includes('raw_inventory')) tools.push(TOOL_LABELS.raw_inventory);
  if (commercialSections.orders) tools.push(TOOL_LABELS.orders);
  if (operationalProfile.controls_production) tools.push(TOOL_LABELS.production);
  if (commercialSections.invoices) tools.push(TOOL_LABELS.invoices);
  if (flow === 'business') {
    tools.push('Equipo');
    if (answers.roleSetup !== 'owner_only') tools.push('Roles');
    if (answers.permissionControl !== 'simple') tools.push('Permisos');
  }

  return unique(tools);
};

const buildRecommendedTutorials = (
  _answers: BusinessOnboardingWizardAnswers,
  activatedModules: BusinessModuleKey[],
  commercialSections: BusinessCommercialSectionsState,
  flow: OnboardingFlow
) => {
  const tutorials = ['dashboard'];

  if (activatedModules.includes('sales')) tutorials.push('sales');
  if (activatedModules.includes('products')) tutorials.push('products');
  if (activatedModules.includes('accounts_receivable')) tutorials.push('payments');
  if (activatedModules.includes('quotes')) tutorials.push('quotes');
  if (commercialSections.invoices) tutorials.push('invoices');
  if (activatedModules.includes('raw_inventory')) tutorials.push('raw-inventory');
  if (flow === 'business') tutorials.push('settings', 'team');

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

const buildVisibilityMode = (
  answers: BusinessOnboardingWizardAnswers,
  flow: OnboardingFlow,
  operationalProfile: BusinessOperationalProfile
): 'basic' | 'advanced' => {
  if (
    flow === 'business'
    || answers.roleSetup === 'specific_roles'
    || answers.permissionControl !== 'simple'
    || operationalProfile.uses_raw_inventory
    || operationalProfile.supports_make_to_order
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

const buildHeadline = (
  businessType: BusinessTypeKey,
  operationalModelLabel: string,
  focusLabel: string,
  flow: OnboardingFlow
) => {
  if (flow === 'business') {
    return `Tu negocio quedara listo con una base ${operationalModelLabel.toLowerCase()} y foco en ${focusLabel.toLowerCase()}.`;
  }
  switch (businessType) {
    case 'services':
      return `Te dejaremos una operación centrada en ${focusLabel.toLowerCase()} y seguimiento comercial.`;
    case 'production':
      return `Tu negocio quedara listo para operar como ${operationalModelLabel.toLowerCase()} sin mezclar la lógica de inventario.`;
    case 'wholesale':
      return `Quedará una configuración equilibrada para vender, cobrar y ordenar mejor tu negocio.`;
    case 'simple_store':
    default:
      return `Te dejaremos una base clara para vender más fácil y tener ${focusLabel.toLowerCase()} cerca.`;
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
  const operationalProfile = buildOperationalProfile(answers);
  const businessType = flow === 'basic' ? 'simple_store' : mapBusinessType(answers, operationalProfile);
  const profile = buildProfile(answers);
  const activatedModules = buildActivatedModules(answers, businessType, flow, operationalProfile);
  const commercialSections = buildCommercialSections(answers, flow, operationalProfile);
  const recommendedTutorials = buildRecommendedTutorials(answers, activatedModules, commercialSections, flow);
  const { prioritizedPath, initialDashboardTab } = buildFocusTargets(answers, activatedModules, flow);
  const visibilityMode = buildVisibilityMode(answers, flow, operationalProfile);
  const simplicityLevel = buildSimplicityLevel(answers, visibilityMode, flow);
  const highlightedTools = buildHighlightedTools(answers, activatedModules, commercialSections, flow, operationalProfile);
  const hiddenTools = buildHiddenTools(answers, activatedModules, commercialSections, flow);
  const focusLabel = HOME_FOCUS_LABELS[answers.homeFocus];
  const operationalModelLabel = OPERATIONAL_MODEL_LABELS[answers.operationalModel];

  const summary =
    flow === 'business'
      ? `Vas a entrar con una base pensada para supervisar operación, equipo y una lógica clara de ${operationalModelLabel.toLowerCase()}.`
      : answers.operationalModel === 'production_make_to_order'
        ? 'Activaremos una base más operativa para que cotizaciones, cumplimiento y bodega convivan sin depender de stock fijo terminado.'
        : answers.operationalModel === 'production_fixed_stock'
          ? 'La app arrancará separando producción y venta para evitar descontar materias primas dos veces.'
          : answers.operationalModel === 'resale_fixed_stock'
            ? 'Verás una experiencia enfocada en catálogo, stock terminado y venta directa.'
            : 'La app arrancará con una experiencia limpia y herramientas acordes a tu forma real de trabajar.';

  return {
    headline: buildHeadline(businessType, operationalModelLabel, focusLabel, flow),
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
    operationalProfile,
    personalizationAnswers: buildPersonalizationAnswers(answers, businessType, operationalProfile),
    focusLabel,
    flow,
    operationalModelLabel,
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
