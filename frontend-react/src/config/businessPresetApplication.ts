import { BUSINESS_NAVIGATION_ITEMS, NavigationItemDefinition } from '../navigation/businessNavigation';
import { buildDefaultNavigationPreferences, NavigationPreferences } from '../store/navigationPreferences.store';
import { canAccessFeatureInPlan, canAccessModule } from '../auth/plan';
import {
  buildPersonalizationSettingsPatch,
  BusinessNavigationDefaults,
  BusinessCommercialSectionsState,
  BusinessInitialSetupSettings,
  BusinessPersonalizationAnswers,
  BusinessTypeKey,
  DEFAULT_PERSONALIZATION_ANSWERS,
  getBusinessInitialSetup,
  getBusinessNavigationDefaults,
  getBusinessPersonalizationSettings,
  getBusinessTypePreset,
  isBusinessCommercialSectionEnabled,
  resolveBusinessType,
} from './businessPersonalization';
import {
  areBusinessOperationalProfilesEqual,
  buildOperationalProfileSettingsPatch,
  getBusinessOperationalProfile,
  type BusinessOperationalProfile,
} from './businessOperationalProfile';
import {
  Business,
  BusinessModuleKey,
  BusinessModuleState,
  BUSINESS_MODULE_ORDER,
  isBusinessModuleEnabled,
} from '../types';

const normalizePaths = (paths?: string[]) => Array.from(new Set((paths || []).filter(Boolean)));
const DEFAULT_VISIBLE_COMMERCIAL_PATHS = ['/invoices', '/orders', '/sales-goals'];

const hasBusinessPermission = (permissions: string[] | undefined, permission?: string) => {
  if (!permission) return true;
  if (!permissions || permissions.length === 0) return true;
  const scope = permission.split('.')[0];
  return !!permissions.includes('*') || !!permissions.includes('admin.*') || !!permissions.includes(permission) || !!permissions.includes(`${scope}.*`);
};

const movePathToFront = (paths: string[], prioritizedPath?: string | null) => {
  if (!prioritizedPath || !paths.includes(prioritizedPath)) return paths;
  return [prioritizedPath, ...paths.filter((path) => path !== prioritizedPath)];
};

const areStringArraysEqual = (a?: string[], b?: string[]) => {
  const normalizedA = normalizePaths(a);
  const normalizedB = normalizePaths(b);
  if (normalizedA.length !== normalizedB.length) return false;
  return normalizedA.every((value, index) => value === normalizedB[index]);
};

const areModuleArraysEqual = (a?: BusinessModuleKey[], b?: BusinessModuleKey[]) => {
  const normalizedA = Array.from(new Set(a || []));
  const normalizedB = Array.from(new Set(b || []));
  if (normalizedA.length !== normalizedB.length) return false;
  return normalizedA.every((value, index) => value === normalizedB[index]);
};

const areAnswersEqual = (a: BusinessPersonalizationAnswers, b: BusinessPersonalizationAnswers) => {
  return (
    a.sellsFixedPriceProducts === b.sellsFixedPriceProducts &&
    a.needsQuotes === b.needsQuotes &&
    a.managesRawMaterials === b.managesRawMaterials &&
    a.buysFromSuppliersOnCredit === b.buysFromSuppliersOnCredit &&
    a.needsProfitability === b.needsProfitability &&
    a.businessModel === b.businessModel &&
    a.operationalModel === b.operationalModel &&
    a.businessCategory === b.businessCategory &&
    a.inventoryMode === b.inventoryMode &&
    a.salesFlow === b.salesFlow &&
    a.homeFocus === b.homeFocus &&
    a.teamMode === b.teamMode &&
    a.documentsMode === b.documentsMode &&
    a.operationsMode === b.operationsMode &&
    a.rawMaterialsMode === b.rawMaterialsMode &&
    a.recipeMode === b.recipeMode &&
    a.sellingMode === b.sellingMode &&
    a.productionControl === b.productionControl &&
    a.guidanceMode === b.guidanceMode &&
    a.teamStructure === b.teamStructure &&
    a.roleSetup === b.roleSetup &&
    a.permissionControl === b.permissionControl &&
    a.ownerFocus === b.ownerFocus
  );
};

const areCommercialSectionsEqual = (
  left?: BusinessCommercialSectionsState | null,
  right?: BusinessCommercialSectionsState | null
) => {
  return (
    !!left &&
    !!right &&
    left.invoices === right.invoices &&
    left.orders === right.orders &&
    left.sales_goals === right.sales_goals
  );
};

const areInitialSetupEqual = (
  left?: BusinessInitialSetupSettings | null,
  right?: BusinessInitialSetupSettings | null
) => JSON.stringify(left || null) === JSON.stringify(right || null);

export const areNavigationPreferencesEqual = (
  left?: NavigationPreferences | null,
  right?: NavigationPreferences | null
) => {
  return (
    areStringArraysEqual(left?.favoritePaths, right?.favoritePaths) &&
    areStringArraysEqual(left?.hiddenPaths, right?.hiddenPaths)
  );
};

export const areNavigationDefaultsEqual = (
  left?: BusinessNavigationDefaults | null,
  right?: BusinessNavigationDefaults | null
) => {
  return (
    (left?.business_type || null) === (right?.business_type || null) &&
    (left?.prioritized_path || null) === (right?.prioritized_path || null) &&
    areStringArraysEqual(left?.favorite_paths, right?.favorite_paths) &&
    areStringArraysEqual(left?.hidden_paths, right?.hidden_paths)
  );
};

export const buildModulesPayload = (recommendedModules: BusinessModuleKey[]) => {
  return BUSINESS_MODULE_ORDER.reduce((acc, moduleKey) => {
    acc[moduleKey] = recommendedModules.includes(moduleKey);
    return acc;
  }, {} as Record<BusinessModuleKey, boolean>);
};

const buildModuleStatesFromPayload = (
  modulesPayload: Record<BusinessModuleKey, boolean>,
  currentModules?: BusinessModuleState[] | null
): BusinessModuleState[] => {
  return BUSINESS_MODULE_ORDER.map((moduleKey) => {
    const existing = currentModules?.find((item) => item.module_key === moduleKey);
    return {
      module_key: moduleKey,
      enabled: modulesPayload[moduleKey],
      config: existing?.config ?? null,
      updated_at: existing?.updated_at ?? null,
    };
  });
};

const haveModulesChanged = (
  modulesPayload: Record<BusinessModuleKey, boolean>,
  currentModules?: BusinessModuleState[] | null
) => {
  return BUSINESS_MODULE_ORDER.some((moduleKey) => isBusinessModuleEnabled(currentModules, moduleKey) !== modulesPayload[moduleKey]);
};

export const getAvailableNavigationItemsForBusiness = ({
  business,
  permissions,
  modules,
  plan,
}: {
  business?: Business | null;
  permissions?: string[];
  modules?: BusinessModuleState[] | null;
  plan?: string | null;
}): NavigationItemDefinition[] => {
  return BUSINESS_NAVIGATION_ITEMS.filter((item) => {
    if (item.path === '/help') return false;
    if (!hasBusinessPermission(permissions, item.permission)) return false;
    if (item.moduleKey && (!isBusinessModuleEnabled(modules, item.moduleKey) || !canAccessModule(plan, item.moduleKey))) return false;
    if (item.feature && !canAccessFeatureInPlan(item.feature, plan)) return false;
    if (item.commercialSectionKey && !isBusinessCommercialSectionEnabled(business, item.commercialSectionKey)) return false;
    return true;
  });
};

export const reconcileNavigationPreferences = ({
  preferences,
  availableItems,
}: {
  preferences?: NavigationPreferences | null;
  availableItems?: NavigationItemDefinition[];
}): NavigationPreferences => {
  const availablePaths = new Set((availableItems || []).map((item) => item.path));
  const hideablePaths = new Set((availableItems || []).filter((item) => item.allowHide !== false).map((item) => item.path));

  return {
    favoritePaths: normalizePaths(preferences?.favoritePaths).filter((path) => availablePaths.size === 0 || availablePaths.has(path)),
    hiddenPaths: normalizePaths(preferences?.hiddenPaths).filter((path) => hideablePaths.size === 0 || hideablePaths.has(path)),
  };
};

export const toNavigationPreferences = (defaults?: BusinessNavigationDefaults | null): NavigationPreferences => {
  return {
    favoritePaths: normalizePaths(defaults?.favorite_paths),
    hiddenPaths: normalizePaths(defaults?.hidden_paths),
  };
};

export const buildPresetNavigationPreferences = ({
  businessType,
  availableItems,
  prioritizedPath,
}: {
  businessType: BusinessTypeKey;
  availableItems?: NavigationItemDefinition[];
  prioritizedPath?: string | null;
}): NavigationPreferences => {
  const preset = getBusinessTypePreset(businessType);
  const availablePaths = availableItems?.map((item) => item.path) || [];
  const favoritePaths = movePathToFront(
    (preset?.recommendedMenuPaths || []).filter((path) => availablePaths.length === 0 || availablePaths.includes(path)),
    prioritizedPath
  );
  const defaults = buildDefaultNavigationPreferences(favoritePaths);

  if (!availableItems) {
    return defaults;
  }

  const hiddenPaths = availableItems
    .filter((item) => item.allowHide !== false)
    .map((item) => item.path)
    .filter((path) => !favoritePaths.includes(path) && !DEFAULT_VISIBLE_COMMERCIAL_PATHS.includes(path));

  return {
    ...defaults,
    hiddenPaths,
  };
};

export const buildNavigationDefaultsForPreset = ({
  businessType,
  availableItems,
  prioritizedPath,
  lastAppliedAt,
}: {
  businessType: BusinessTypeKey;
  availableItems?: NavigationItemDefinition[];
  prioritizedPath?: string | null;
  lastAppliedAt?: string | null;
}): BusinessNavigationDefaults => {
  const preferences = buildPresetNavigationPreferences({
    businessType,
    availableItems,
    prioritizedPath,
  });
  const effectivePrioritizedPath = prioritizedPath && preferences.favoritePaths.includes(prioritizedPath)
    ? prioritizedPath
    : preferences.favoritePaths[0] || null;

  return {
    business_type: businessType,
    favorite_paths: preferences.favoritePaths,
    hidden_paths: preferences.hiddenPaths,
    prioritized_path: effectivePrioritizedPath,
    last_applied_at: lastAppliedAt || null,
  };
};

export const hasManualNavigationCustomization = ({
  storedPreferences,
  navigationDefaults,
  availableItems,
}: {
  storedPreferences?: NavigationPreferences | null;
  navigationDefaults?: NavigationPreferences | null;
  availableItems?: NavigationItemDefinition[];
}) => {
  if (!storedPreferences) return false;
  const reconciledStored = reconcileNavigationPreferences({ preferences: storedPreferences, availableItems });
  const reconciledDefaults = reconcileNavigationPreferences({ preferences: navigationDefaults, availableItems });
  return !areNavigationPreferencesEqual(reconciledStored, reconciledDefaults);
};

export type NavigationApplicationMode = 'initialize' | 'preserve_manual' | 'replace';
export type NavigationDecision = 'applied_defaults' | 'preserved_manual';

export const resolveNavigationPreferencesAfterPresetApplication = ({
  mode,
  currentNavigationPreferences,
  currentNavigationDefaults,
  nextNavigationDefaults,
  availableItems,
}: {
  mode: NavigationApplicationMode;
  currentNavigationPreferences?: NavigationPreferences | null;
  currentNavigationDefaults?: NavigationPreferences | null;
  nextNavigationDefaults: NavigationPreferences;
  availableItems?: NavigationItemDefinition[];
}): { decision: NavigationDecision; preferences: NavigationPreferences } => {
  const reconciledNextDefaults = reconcileNavigationPreferences({
    preferences: nextNavigationDefaults,
    availableItems,
  });

  if (mode === 'initialize' || mode === 'replace') {
    return {
      decision: 'applied_defaults',
      preferences: reconciledNextDefaults,
    };
  }

  const hasManualCustomization = hasManualNavigationCustomization({
    storedPreferences: currentNavigationPreferences,
    navigationDefaults: currentNavigationDefaults,
    availableItems,
  });

  if (!hasManualCustomization) {
    return {
      decision: 'applied_defaults',
      preferences: reconciledNextDefaults,
    };
  }

  return {
    decision: 'preserved_manual',
    preferences: reconcileNavigationPreferences({
      preferences: currentNavigationPreferences,
      availableItems,
    }),
  };
};

export const getPresetFocusItems = (businessType: BusinessTypeKey) => {
  const preset = getBusinessTypePreset(businessType);
  if (!preset) return [];

  return preset.recommendedMenuPaths
    .filter((path) => !['/dashboard', '/alerts', '/reports', '/help', '/settings'].includes(path))
    .map((path) => BUSINESS_NAVIGATION_ITEMS.find((item) => item.path === path))
    .filter((item): item is NavigationItemDefinition => !!item);
};

interface ApplyBusinessTypeConfigurationParams {
  answers?: Partial<BusinessPersonalizationAnswers>;
  business: Business;
  businessType: BusinessTypeKey;
  commercialSections?: BusinessCommercialSectionsState;
  currentNavigationPreferences?: NavigationPreferences | null;
  initialSetup?: BusinessInitialSetupSettings | null;
  navigationMode?: NavigationApplicationMode;
  operationalProfile?: BusinessOperationalProfile | null;
  recommendedModules?: BusinessModuleKey[];
  plan?: string | null;
  prioritizedPath?: string | null;
  setNavigationPreferences?: (preferences: NavigationPreferences) => void;
  updateBusiness: (id: number, data: Partial<Business>) => Promise<any>;
  updateBusinessModules: (businessId: number, modules: Record<BusinessModuleKey, boolean>) => Promise<BusinessModuleState[]>;
  visibilityMode?: 'basic' | 'advanced' | null;
}

export const applyBusinessTypeConfiguration = async ({
  answers,
  business,
  businessType,
  commercialSections,
  currentNavigationPreferences,
  initialSetup,
  navigationMode = 'replace',
  operationalProfile,
  recommendedModules,
  plan,
  prioritizedPath,
  setNavigationPreferences,
  updateBusiness,
  updateBusinessModules,
  visibilityMode,
}: ApplyBusinessTypeConfigurationParams) => {
  const preset = getBusinessTypePreset(businessType);

  if (!preset) {
    throw new Error('No fue posible resolver la configuración del negocio.');
  }

  const personalization = getBusinessPersonalizationSettings(business);
  const currentInitialSetup = getBusinessInitialSetup(business);
  const currentNavigationDefaults = getBusinessNavigationDefaults(business);
  const currentOperationalProfile = getBusinessOperationalProfile(business);
  const nextAnswers: BusinessPersonalizationAnswers = {
    ...DEFAULT_PERSONALIZATION_ANSWERS,
    ...personalization.onboarding.answers,
    ...(answers || {}),
    businessModel: businessType,
  };
  const nextCommercialSections: BusinessCommercialSectionsState =
    commercialSections || personalization.commercial_sections;
  const nextVisibilityMode = visibilityMode ?? personalization.visibility_mode ?? null;
  const nextOperationalProfile = operationalProfile || currentOperationalProfile;
  const effectivePlan = plan ?? business.plan ?? null;
  const resolvedRecommendedModules = Array.from(new Set(recommendedModules?.length ? recommendedModules : preset.recommendedModules));
  const allowedRecommendedModules = resolvedRecommendedModules.filter((moduleKey) =>
    canAccessModule(effectivePlan, moduleKey)
  );
  const modulesPayload = buildModulesPayload(allowedRecommendedModules);
  const shouldUpdateModules = haveModulesChanged(modulesPayload, business.modules);
  const updatedModules = shouldUpdateModules
    ? await updateBusinessModules(business.id, modulesPayload)
    : buildModuleStatesFromPayload(modulesPayload, business.modules);
  const settingsWithOperationalProfile = buildOperationalProfileSettingsPatch(business.settings, nextOperationalProfile);
  const previewSettings = {
    ...buildPersonalizationSettingsPatch(settingsWithOperationalProfile, {
      ...personalization,
      business_type: businessType,
      visibility_mode: nextVisibilityMode,
      commercial_sections: nextCommercialSections,
      onboarding: {
        ...personalization.onboarding,
        answers: nextAnswers,
      },
    }),
    ...(initialSetup ? { initial_setup: initialSetup } : {}),
  };
  const availableItems = getAvailableNavigationItemsForBusiness({
    business: {
      ...business,
      modules: updatedModules,
      settings: previewSettings,
    },
    permissions: business.permissions,
    modules: updatedModules,
    plan: effectivePlan,
  });
  const nextNavigationDefaultsBase = buildNavigationDefaultsForPreset({
    businessType,
    availableItems,
    prioritizedPath,
  });
  const currentDefaultPreferences = currentNavigationDefaults
    ? toNavigationPreferences(currentNavigationDefaults)
    : buildPresetNavigationPreferences({
        businessType: resolveBusinessType(business),
        availableItems: getAvailableNavigationItemsForBusiness({
          business,
          permissions: business.permissions,
          modules: business.modules,
          plan: effectivePlan,
        }),
        prioritizedPath: null,
      });
  const navigationResolution = resolveNavigationPreferencesAfterPresetApplication({
    mode: navigationMode,
    currentNavigationPreferences,
    currentNavigationDefaults: currentDefaultPreferences,
    nextNavigationDefaults: toNavigationPreferences(nextNavigationDefaultsBase),
    availableItems,
  });
  const settingsNeedUpdate =
    personalization.business_type !== businessType ||
    personalization.visibility_mode !== nextVisibilityMode ||
    personalization.onboarding.completed !== true ||
    personalization.onboarding.skipped !== false ||
    personalization.onboarding.suggested_business_type !== businessType ||
    !areModuleArraysEqual(personalization.onboarding.suggested_modules, allowedRecommendedModules) ||
    personalization.onboarding.applied_modules_once !== true ||
    !areAnswersEqual(personalization.onboarding.answers, nextAnswers) ||
    !areCommercialSectionsEqual(personalization.commercial_sections, nextCommercialSections) ||
    !areBusinessOperationalProfilesEqual(currentOperationalProfile, nextOperationalProfile) ||
    !areInitialSetupEqual(currentInitialSetup, initialSetup || currentInitialSetup) ||
    !areNavigationDefaultsEqual(currentNavigationDefaults, nextNavigationDefaultsBase);

  const timestamp = settingsNeedUpdate ? new Date().toISOString() : personalization.onboarding.last_updated_at || null;
  const nextNavigationDefaults: BusinessNavigationDefaults = {
    ...nextNavigationDefaultsBase,
    last_applied_at: settingsNeedUpdate ? timestamp : currentNavigationDefaults?.last_applied_at || null,
  };

  if (settingsNeedUpdate) {
    const nextSettings = {
      ...buildPersonalizationSettingsPatch(settingsWithOperationalProfile, {
        ...personalization,
        business_type: businessType,
        visibility_mode: nextVisibilityMode,
        commercial_sections: nextCommercialSections,
        navigation_defaults: nextNavigationDefaults,
        onboarding: {
          ...personalization.onboarding,
          completed: true,
          skipped: false,
          answers: nextAnswers,
          suggested_business_type: businessType,
          suggested_modules: allowedRecommendedModules,
          applied_modules_once: true,
          last_updated_at: timestamp,
        },
      }),
      ...(initialSetup ? { initial_setup: initialSetup } : {}),
    };

    await updateBusiness(business.id, {
      settings: nextSettings,
    });
  }

  if (setNavigationPreferences) {
    const nextStoredPreferences = navigationResolution.preferences;
    const hasNavigationUpdate = !areNavigationPreferencesEqual(currentNavigationPreferences, nextStoredPreferences);
    if (hasNavigationUpdate) {
      setNavigationPreferences(nextStoredPreferences);
    }
  }

  return {
    preset,
    updatedModules,
    navigationDecision: navigationResolution.decision,
    navigationDefaults: nextNavigationDefaults,
    settingsUpdated: settingsNeedUpdate,
    modulesUpdated: shouldUpdateModules,
  };
};
