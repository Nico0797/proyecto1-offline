import type { FeatureKey } from '../auth/plan';
import type { BackendCapability } from '../config/backendCapabilities';
import type { BusinessCommercialSectionKey, BusinessTypeKey } from '../config/businessPersonalization';
import type { BusinessFulfillmentMode, BusinessOperationalInventoryModel, BusinessOperationalModel } from '../config/businessOperationalProfile';
import type { BusinessModuleKey } from '../types';
import type { TutorialRuntimeContext, TutorialSettingsSectionId } from './tutorialContext';

export type TutorialTrigger = 'catalog' | 'recommended' | 'manual' | 'auto';
export type TutorialPriority = 'low' | 'medium' | 'high';

export type TutorialEligibilityRules = {
  minimumPlan?: 'basic' | 'pro' | 'business';
  allowedPlans?: Array<'basic' | 'pro' | 'business'>;
  moduleKey?: BusinessModuleKey;
  moduleKeys?: BusinessModuleKey[];
  permission?: string;
  permissionsAny?: string[];
  permissionsAll?: string[];
  visibleRoute?: string;
  visibleRoutes?: string[];
  settingsSection?: TutorialSettingsSectionId;
  settingsSections?: TutorialSettingsSectionId[];
  feature?: FeatureKey;
  capability?: BackendCapability;
  capabilities?: BackendCapability[];
  commercialSection?: BusinessCommercialSectionKey;
  commercialSections?: BusinessCommercialSectionKey[];
  allowedRoles?: string[];
  businessTypes?: BusinessTypeKey[];
  operationalModels?: BusinessOperationalModel[];
  inventoryModels?: BusinessOperationalInventoryModel[];
  fulfillmentModes?: BusinessFulfillmentMode[];
  requireOwner?: boolean;
  requireAdmin?: boolean;
  requireBusinessContext?: boolean;
  requireIncomplete?: boolean;
  requireRecommended?: boolean;
  requiresRawMaterials?: boolean;
  requiresQuotesSupport?: boolean;
  requiresProductionControl?: boolean;
  requiresFinishedGoodsStock?: boolean;
  requiresMakeToOrder?: boolean;
  dashboardTab?: 'hoy' | 'balance' | 'analiticas' | 'recordatorios';
  dashboardTabsAny?: Array<'hoy' | 'balance' | 'analiticas' | 'recordatorios'>;
  onboardingRoleSetupNot?: Array<'owner_only' | 'shared_roles' | 'specific_roles'>;
  onboardingPermissionControlNot?: Array<'simple' | 'by_area' | 'by_person'>;
};

export type TutorialBehavior = {
  repeatable?: boolean;
  allowManualRestart?: boolean;
  dismissStopsAutoStart?: boolean;
};

export type TutorialAvailabilityResult = {
  eligible: boolean;
  reason: string | null;
};

const normalizeUpper = (value?: string | null) => String(value || '').trim().toUpperCase();

const checkContextRules = (
  rules: TutorialEligibilityRules | undefined,
  context: TutorialRuntimeContext,
  tutorialId?: string
): TutorialAvailabilityResult => {
  if (!rules) {
    return { eligible: true, reason: null };
  }

  if (rules.requireBusinessContext && !context.businessId) {
    return { eligible: false, reason: 'Requiere un negocio activo' };
  }

  if (rules.requireOwner && !context.isOwner) {
    return { eligible: false, reason: 'Disponible para propietarios del negocio' };
  }

  if (rules.requireAdmin && !context.isAdmin) {
    return { eligible: false, reason: 'Disponible para administradores' };
  }

  if (rules.minimumPlan && !context.isPlanAtLeast(rules.minimumPlan)) {
    return { eligible: false, reason: `Requiere plan ${rules.minimumPlan}` };
  }

  if (rules.allowedPlans?.length && !rules.allowedPlans.some((plan) => context.plan === plan)) {
    return { eligible: false, reason: 'No aplica para el plan actual' };
  }

  if (rules.moduleKey && !context.hasModule(rules.moduleKey)) {
    return { eligible: false, reason: `El módulo ${rules.moduleKey} no está activo` };
  }

  if (rules.moduleKeys?.length && !rules.moduleKeys.every((moduleKey) => context.hasModule(moduleKey))) {
    return { eligible: false, reason: 'Faltan módulos requeridos' };
  }

  if (rules.permission && !context.hasPermission(rules.permission)) {
    return { eligible: false, reason: 'No tienes permisos suficientes' };
  }

  if (rules.permissionsAny?.length && !rules.permissionsAny.some((permission) => context.hasPermission(permission))) {
    return { eligible: false, reason: 'No tienes permisos suficientes' };
  }

  if (rules.permissionsAll?.length && !rules.permissionsAll.every((permission) => context.hasPermission(permission))) {
    return { eligible: false, reason: 'No tienes todos los permisos requeridos' };
  }

  if (rules.visibleRoute && !context.hasRoute(rules.visibleRoute)) {
    return { eligible: false, reason: 'La ruta no está visible en este negocio' };
  }

  if (rules.visibleRoutes?.length && !rules.visibleRoutes.every((route) => context.hasRoute(route))) {
    return { eligible: false, reason: 'Faltan rutas visibles requeridas' };
  }

  if (rules.settingsSection && !context.hasSettingsSection(rules.settingsSection)) {
    return { eligible: false, reason: 'La sección requerida no está visible' };
  }

  if (rules.settingsSections?.length && !rules.settingsSections.every((section) => context.hasSettingsSection(section))) {
    return { eligible: false, reason: 'Faltan secciones visibles requeridas' };
  }

  if (rules.feature && !context.canAccessFeature(rules.feature)) {
    return { eligible: false, reason: 'La funcionalidad no está disponible para este plan' };
  }

  if (rules.capability && !context.hasCapability(rules.capability)) {
    return { eligible: false, reason: 'La capacidad backend requerida no está soportada' };
  }

  if (rules.capabilities?.length && !rules.capabilities.every((capability) => context.hasCapability(capability))) {
    return { eligible: false, reason: 'Faltan capacidades backend requeridas' };
  }

  if (rules.commercialSection && !context.hasCommercialSection(rules.commercialSection)) {
    return { eligible: false, reason: 'La sección comercial no está habilitada' };
  }

  if (rules.commercialSections?.length && !rules.commercialSections.every((section) => context.hasCommercialSection(section))) {
    return { eligible: false, reason: 'Faltan secciones comerciales requeridas' };
  }

  if (rules.allowedRoles?.length) {
    const currentRole = normalizeUpper(context.role);
    const allowedRoles = rules.allowedRoles.map((role) => normalizeUpper(role));
    if (!allowedRoles.includes(currentRole)) {
      return { eligible: false, reason: 'No aplica para el rol actual del negocio' };
    }
  }

  if (rules.businessTypes?.length && (!context.businessType || !rules.businessTypes.includes(context.businessType))) {
    return { eligible: false, reason: 'No aplica para el tipo de negocio actual' };
  }

  if (rules.operationalModels?.length) {
    const operationalModel = context.operationalProfile.operational_model;
    if (!operationalModel || !rules.operationalModels.includes(operationalModel)) {
      return { eligible: false, reason: 'No aplica para el perfil operativo actual' };
    }
  }

  if (rules.inventoryModels?.length) {
    const inventoryModel = context.operationalProfile.inventory_model;
    if (!inventoryModel || !rules.inventoryModels.includes(inventoryModel)) {
      return { eligible: false, reason: 'No aplica para el modelo de inventario actual' };
    }
  }

  if (rules.fulfillmentModes?.length) {
    const fulfillmentMode = context.operationalProfile.fulfillment_mode;
    if (!fulfillmentMode || !rules.fulfillmentModes.includes(fulfillmentMode)) {
      return { eligible: false, reason: 'No aplica para el fulfillment actual' };
    }
  }

  if (rules.requiresRawMaterials && !context.operationalProfile.manages_raw_materials && !context.operationalProfile.uses_raw_inventory) {
    return { eligible: false, reason: 'No aplica a negocios sin materias primas' };
  }

  if (rules.requiresQuotesSupport && !context.operationalProfile.supports_quotes) {
    return { eligible: false, reason: 'No aplica a negocios sin flujo de cotizaciones' };
  }

  if (rules.requiresProductionControl && !context.operationalProfile.controls_production) {
    return { eligible: false, reason: 'No aplica a negocios sin control de producción' };
  }

  if (rules.requiresFinishedGoodsStock && !context.operationalProfile.tracks_finished_goods_stock) {
    return { eligible: false, reason: 'No aplica a negocios sin stock de producto terminado' };
  }

  if (rules.requiresMakeToOrder && !context.operationalProfile.supports_make_to_order) {
    return { eligible: false, reason: 'No aplica a negocios sin trabajo por encargo' };
  }

  if (rules.dashboardTab && !context.dashboardVisibleTabs.has(rules.dashboardTab)) {
    return { eligible: false, reason: 'La pestaña requerida no está visible' };
  }

  if (rules.dashboardTabsAny?.length && !rules.dashboardTabsAny.some((tab) => context.dashboardVisibleTabs.has(tab))) {
    return { eligible: false, reason: 'No hay pestañas compatibles visibles' };
  }

  if (rules.onboardingRoleSetupNot?.length) {
    const roleSetup = context.initialSetup.onboarding_profile.role_setup;
    if (roleSetup && rules.onboardingRoleSetupNot.includes(roleSetup)) {
      return { eligible: false, reason: 'No aplica para la configuración actual de roles' };
    }
  }

  if (rules.onboardingPermissionControlNot?.length) {
    const permissionControl = context.initialSetup.onboarding_profile.permission_control;
    if (permissionControl && rules.onboardingPermissionControlNot.includes(permissionControl)) {
      return { eligible: false, reason: 'No aplica para el control de permisos configurado' };
    }
  }

  if (rules.requireRecommended && tutorialId && !context.isRecommendedTutorial(tutorialId)) {
    return { eligible: false, reason: 'No está recomendado para este negocio' };
  }

  return { eligible: true, reason: null };
};

export const resolveTutorialAvailability = ({
  tutorialId,
  rules,
  behavior,
  context,
  trigger,
}: {
  tutorialId?: string;
  rules?: TutorialEligibilityRules;
  behavior?: TutorialBehavior;
  context: TutorialRuntimeContext;
  trigger: TutorialTrigger;
}): TutorialAvailabilityResult => {
  const base = checkContextRules(rules, context, tutorialId);
  if (!base.eligible) {
    return base;
  }

  const status = tutorialId ? context.getTutorialStatus(tutorialId) : null;
  const repeatable = behavior?.repeatable !== false;
  const allowManualRestart = behavior?.allowManualRestart !== false;
  const dismissStopsAutoStart = behavior?.dismissStopsAutoStart !== false;

  if (rules?.requireIncomplete && tutorialId && context.hasCompletedTutorial(tutorialId)) {
    return { eligible: false, reason: 'Ya fue completado en este negocio' };
  }

  if (trigger === 'auto') {
    if (status === 'completed' && !repeatable) {
      return { eligible: false, reason: 'Ya fue completado' };
    }
    if (status === 'dismissed' && dismissStopsAutoStart) {
      return { eligible: false, reason: 'Fue descartado anteriormente' };
    }
  }

  if (trigger === 'recommended' && tutorialId && context.hasCompletedTutorial(tutorialId)) {
    return { eligible: false, reason: 'Ya fue completado' };
  }

  if (trigger === 'manual' && tutorialId && context.hasCompletedTutorial(tutorialId) && !allowManualRestart) {
    return { eligible: false, reason: 'No se puede repetir manualmente' };
  }

  return { eligible: true, reason: null };
};
