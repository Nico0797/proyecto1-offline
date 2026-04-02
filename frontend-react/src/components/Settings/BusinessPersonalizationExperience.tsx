import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  EyeOff,
  LayoutPanelTop,
  RotateCcw,
  Star,
  Store,
  MonitorSmartphone,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { canAccessModule } from '../../auth/plan';
import { isBackendPathSupported } from '../../config/backendCapabilities';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import { useAccess } from '../../hooks/useAccess';
import { Button } from '../ui/Button';
import {
  buildPersonalizationSettingsPatch,
  type BusinessCommercialSectionKey,
  BUSINESS_TYPE_PRESETS,
  BusinessTypeKey,
  getBusinessBaseState,
  getBusinessCommercialSections,
  getBusinessNavigationDefaults,
  getBusinessPersonalizationSettings,
  getEnabledBusinessModules,
  getMissingRecommendedModules,
  isBusinessCommercialSectionEnabled,
} from '../../config/businessPersonalization';
import { BUSINESS_NAVIGATION_ITEMS, type NavigationItemDefinition } from '../../navigation/businessNavigation';
import { resolveBusinessNavigationState } from '../../navigation/navigationPersonalization';
import { useNavigationPreferences } from '../../store/navigationPreferences.store';
import { cn } from '../../utils/cn';
import {
  applyBusinessTypeConfiguration,
  buildPresetNavigationPreferences,
  hasManualNavigationCustomization,
  type NavigationApplicationMode,
  toNavigationPreferences,
} from '../../config/businessPresetApplication';
import {
  BUSINESS_MODULE_META,
  BUSINESS_MODULE_ORDER,
  type BusinessModuleKey,
  type BusinessModuleState,
  isBusinessModuleEnabled,
} from '../../types';

const buildModulesFormState = (modules?: BusinessModuleState[] | null): Record<BusinessModuleKey, boolean> => {
  return BUSINESS_MODULE_ORDER.reduce((acc, moduleKey) => {
    acc[moduleKey] = isBusinessModuleEnabled(modules, moduleKey);
    return acc;
  }, {} as Record<BusinessModuleKey, boolean>);
};

const buildCommercialSectionsFormState = (business?: { settings?: Record<string, any> | null } | null) => {
  return getBusinessCommercialSections(business || null);
};

const PRIMARY_COMMERCIAL_PATHS = ['/invoices', '/orders', '/sales-goals'];

const TOOL_GROUPS: Array<{
  id: string;
  title: string;
  description: string;
  moduleKeys: BusinessModuleKey[];
}> = [
  {
    id: 'commercial',
    title: 'Ventas y clientes',
    description: 'Vender, atender clientes y tener tu catálogo listo.',
    moduleKeys: ['sales', 'customers', 'products', 'quotes'],
  },
  {
    id: 'collections',
    title: 'Cartera y cobros',
    description: 'Seguir saldos pendientes y registrar cobros.',
    moduleKeys: ['accounts_receivable'],
  },
  {
    id: 'operations',
    title: 'Compras, inventario y producción',
    description: 'Compras, insumos, proveedores y control de producción.',
    moduleKeys: ['raw_inventory'],
  },
  {
    id: 'analysis',
    title: 'Reportes y análisis',
    description: 'Entender cómo va tu negocio y tomar mejores decisiones.',
    moduleKeys: ['reports'],
  },
];

const StepShell = ({
  step,
  title,
  description,
  actions,
  tourId,
  children,
}: {
  step: string;
  title: string;
  description: string;
  actions?: ReactNode;
  tourId?: string;
  children: ReactNode;
}) => {
  return (
    <section
      className="app-surface overflow-hidden rounded-[28px] shadow-[0_24px_70px_-36px_rgba(15,23,42,0.18)] dark:shadow-[0_24px_70px_-36px_rgba(15,23,42,0.9)]"
      data-tour={tourId}
    >
      <div className="app-page-header border-b app-divider bg-gradient-to-r from-white/80 via-white/50 to-transparent px-5 py-5 sm:px-6 dark:from-white/[0.04] dark:via-white/[0.02]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-600/80 dark:text-blue-200/75">{step}</div>
            <h3 className="mt-2 text-xl font-semibold app-text sm:text-2xl">{title}</h3>
            <p className="mt-2 text-sm leading-6 app-text-muted">{description}</p>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      </div>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
};

const ModuleCard = ({
  title,
  description,
  enabled,
  locked,
  pending,
  action,
}: {
  title: string;
  description: string;
  enabled: boolean;
  locked: boolean;
  pending: boolean;
  action: ReactNode;
}) => {
  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3 transition-all',
        enabled ? 'border-blue-500/25 bg-blue-500/[0.06]' : 'theme-surface-muted'
      )}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h4 className="text-base font-semibold app-text">{title}</h4>
          <p className="mt-1 text-sm leading-6 app-text-muted">{description}</p>
          {locked ? <div className="mt-2 text-xs text-amber-200">Disponible con un plan superior.</div> : null}
          {!locked && pending ? <div className="mt-2 text-xs text-amber-200">Tienes un cambio pendiente en esta herramienta.</div> : null}
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  );
};

const MenuColumn = ({
  title,
  description,
  icon: Icon,
  items,
  emptyMessage,
  renderActions,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  items: NavigationItemDefinition[];
  emptyMessage: string;
  renderActions: (item: NavigationItemDefinition, index: number) => ReactNode;
}) => {
  return (
    <div className="theme-surface-soft rounded-3xl border p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="app-tone-icon-blue">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-base font-semibold app-text">{title}</h4>
          <p className="mt-1 text-sm leading-6 app-text-muted">{description}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="app-empty-state rounded-2xl px-4 py-5 text-sm app-text-muted">
            {emptyMessage}
          </div>
        ) : (
          items.map((item, index) => (
            <div key={item.path} className="theme-surface-muted rounded-2xl border p-3">
              <div className="flex flex-col gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <item.icon className="h-4 w-4 app-text-muted" />
                    <div className="font-medium app-text">{item.label}</div>
                  </div>
                  <p className="mt-1 text-sm app-text-muted">{item.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">{renderActions(item, index)}</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const BusinessPersonalizationExperience = () => {
  const { user } = useAuthStore();
  const { activeBusiness, updateBusiness, updateBusinessModules } = useBusinessStore();
  const { isOwner, hasPermission, hasModule, canAccess, subscriptionPlan } = useAccess();
  const canManageBusiness = !!activeBusiness && (isOwner || hasPermission('business.update'));
  const baseState = useMemo(() => getBusinessBaseState(activeBusiness), [activeBusiness]);
  const appliedBusinessType = baseState.effectiveBusinessType;
  const currentNavigationDefaults = useMemo(() => getBusinessNavigationDefaults(activeBusiness), [activeBusiness]);

  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessTypeKey>(appliedBusinessType);
  const [savingPreset, setSavingPreset] = useState(false);
  const [savingSections, setSavingSections] = useState(false);
  const [showMenuEditor, setShowMenuEditor] = useState(false);
  const [expandedToolGroupId, setExpandedToolGroupId] = useState<string | null>(null);
  const [modulesForm, setModulesForm] = useState<Record<BusinessModuleKey, boolean>>(
    () => buildModulesFormState(activeBusiness?.modules)
  );
  const [commercialSectionsForm, setCommercialSectionsForm] = useState<Record<BusinessCommercialSectionKey, boolean>>(
    () => buildCommercialSectionsFormState(activeBusiness)
  );

  const getScopeKey = useNavigationPreferences((state) => state.getScopeKey);
  const getPreferences = useNavigationPreferences((state) => state.getPreferences);
  const setPreferences = useNavigationPreferences((state) => state.setPreferences);
  const preferencesByScope = useNavigationPreferences((state) => state.preferencesByScope);

  const scopeKey = useMemo(
    () => getScopeKey(user?.id, activeBusiness?.id),
    [activeBusiness?.id, getScopeKey, user?.id]
  );
  const storedNavigationPreferences = preferencesByScope[scopeKey];

  useEffect(() => {
    setSelectedBusinessType(appliedBusinessType);
  }, [activeBusiness?.id, appliedBusinessType]);

  useEffect(() => {
    setModulesForm(buildModulesFormState(activeBusiness?.modules));
  }, [activeBusiness?.id, activeBusiness?.modules]);

  useEffect(() => {
    setCommercialSectionsForm(buildCommercialSectionsFormState(activeBusiness));
  }, [activeBusiness]);

  const selectedPreset = BUSINESS_TYPE_PRESETS[selectedBusinessType];
  const currentModules = useMemo(() => getEnabledBusinessModules(activeBusiness), [activeBusiness]);
  const currentModulesInPlan = useMemo(
    () => currentModules.filter((moduleKey) => canAccessModule(subscriptionPlan, moduleKey)),
    [currentModules, subscriptionPlan]
  );
  const currentModuleState = useMemo(() => buildModulesFormState(activeBusiness?.modules), [activeBusiness?.modules]);
  const currentCommercialSectionState = useMemo(
    () => buildCommercialSectionsFormState(activeBusiness),
    [activeBusiness]
  );
  const selectedRecommendedModules = useMemo(
    () => selectedPreset.recommendedModules.filter((moduleKey) => canAccessModule(subscriptionPlan, moduleKey)),
    [selectedPreset.recommendedModules, subscriptionPlan]
  );
  const selectedBlockedRecommendedCount = useMemo(
    () => selectedPreset.recommendedModules.filter((moduleKey) => !canAccessModule(subscriptionPlan, moduleKey)).length,
    [selectedPreset.recommendedModules, subscriptionPlan]
  );
  const missingRecommendedModules = useMemo(
    () => getMissingRecommendedModules(currentModulesInPlan, selectedRecommendedModules),
    [currentModulesInPlan, selectedRecommendedModules]
  );

  const customizableNavigationItems = useMemo(() => {
    return BUSINESS_NAVIGATION_ITEMS.filter((item) => {
      if (!hasPermission(item.permission)) return false;
      if (!hasModule(item.moduleKey)) return false;
      if (item.feature && !canAccess(item.feature)) return false;
      if (item.commercialSectionKey && !isBusinessCommercialSectionEnabled(activeBusiness, item.commercialSectionKey)) return false;
      return item.path !== '/help';
    });
  }, [activeBusiness, canAccess, hasModule, hasPermission]);

  const currentDefaultMenuPrefs = useMemo(() => {
    if (currentNavigationDefaults) {
      return toNavigationPreferences(currentNavigationDefaults);
    }

    return buildPresetNavigationPreferences({
      businessType: appliedBusinessType,
      availableItems: customizableNavigationItems,
    });
  }, [appliedBusinessType, currentNavigationDefaults, customizableNavigationItems]);

  const currentMenuPrefs = useMemo(() => {
    return getPreferences(scopeKey, currentDefaultMenuPrefs);
  }, [currentDefaultMenuPrefs, getPreferences, preferencesByScope, scopeKey]);

  const favoriteMenuItems = useMemo(() => {
    return currentMenuPrefs.favoritePaths
      .filter((path) => !currentMenuPrefs.hiddenPaths.includes(path))
      .map((path) => customizableNavigationItems.find((item) => item.path === path))
      .filter((item): item is NavigationItemDefinition => !!item);
  }, [currentMenuPrefs.favoritePaths, currentMenuPrefs.hiddenPaths, customizableNavigationItems]);

  const hideableNavigationItems = useMemo(
    () => customizableNavigationItems.filter((item) => item.allowHide !== false),
    [customizableNavigationItems]
  );

  const visibleSecondaryMenuItems = useMemo(() => {
    return customizableNavigationItems.filter(
      (item) => !currentMenuPrefs.favoritePaths.includes(item.path) && !currentMenuPrefs.hiddenPaths.includes(item.path)
    );
  }, [currentMenuPrefs.favoritePaths, currentMenuPrefs.hiddenPaths, customizableNavigationItems]);

  const hiddenMenuItems = useMemo(() => {
    return hideableNavigationItems.filter((item) => currentMenuPrefs.hiddenPaths.includes(item.path));
  }, [currentMenuPrefs.hiddenPaths, hideableNavigationItems]);

  const hasManualMenuCustomization = useMemo(
    () =>
      hasManualNavigationCustomization({
        storedPreferences: storedNavigationPreferences,
        navigationDefaults: currentDefaultMenuPrefs,
        availableItems: customizableNavigationItems,
      }),
    [currentDefaultMenuPrefs, customizableNavigationItems, storedNavigationPreferences]
  );

  const accessManagedItems = useMemo(() => {
    return BUSINESS_NAVIGATION_ITEMS.filter((item) => {
      if (item.path === '/help' || item.path === '/settings') return false;
      if (item.moduleKey) return false;
      if (!hasPermission(item.permission)) return false;
      if (item.feature && !canAccess(item.feature)) return false;
      return true;
    });
  }, [canAccess, hasPermission]);

  const moduleCards = useMemo(() => {
    return BUSINESS_MODULE_ORDER.map((moduleKey) => {
      const meta = BUSINESS_MODULE_META[moduleKey];
      const enabled = modulesForm[moduleKey];
      const availableInPlan = canAccessModule(subscriptionPlan, moduleKey);
      const isRecommended = selectedRecommendedModules.includes(moduleKey);
      const relatedItems = BUSINESS_NAVIGATION_ITEMS.filter((item) => {
        if (item.moduleKey !== moduleKey) return false;
        if (!hasPermission(item.permission)) return false;
        if (item.moduleKey && !canAccessModule(subscriptionPlan, item.moduleKey)) return false;
        if (item.feature && !canAccess(item.feature)) return false;
        return true;
      });

      return {
        moduleKey,
        meta,
        enabled,
        availableInPlan,
        isRecommended,
        hasPendingChange: enabled !== currentModuleState[moduleKey],
        relatedItems,
      };
    });
  }, [canAccess, currentModuleState, hasPermission, modulesForm, selectedRecommendedModules, subscriptionPlan]);
  const commercialSectionCards = useMemo(() => {
    return PRIMARY_COMMERCIAL_PATHS
      .map((path) => BUSINESS_NAVIGATION_ITEMS.find((item) => item.path === path))
      .filter((item): item is NavigationItemDefinition => !!item && !!item.commercialSectionKey)
      .filter((item) => isBackendPathSupported(item.path))
      .map((item) => {
        const sectionKey = item.commercialSectionKey as BusinessCommercialSectionKey;
        const availableInPlan = !item.feature || canAccess(item.feature);
        const availableInBusiness = modulesForm.sales;
        const enabled = !!commercialSectionsForm[sectionKey];
        return {
          sectionKey,
          title: item.label,
          description: item.description,
          enabled,
          availableInPlan,
          availableInBusiness,
          hasPendingChange: enabled !== currentCommercialSectionState[sectionKey],
        };
      });
  }, [canAccess, commercialSectionsForm, currentCommercialSectionState, modulesForm.sales]);
  const toolGroups = useMemo(() => {
    return TOOL_GROUPS.map((group) => ({
      ...group,
      cards: group.moduleKeys
        .map((moduleKey) => moduleCards.find((card) => card.moduleKey === moduleKey))
        .filter((card): card is (typeof moduleCards)[number] => !!card),
    })).filter((group) => group.cards.length > 0);
  }, [moduleCards]);

  const hasModuleChanges = useMemo(
    () => BUSINESS_MODULE_ORDER.some((moduleKey) => currentModuleState[moduleKey] !== modulesForm[moduleKey]),
    [currentModuleState, modulesForm]
  );
  const hasCommercialSectionChanges = useMemo(
    () => commercialSectionCards.some((card) => card.hasPendingChange),
    [commercialSectionCards]
  );

  const pendingEnabledModules = useMemo(
    () => BUSINESS_MODULE_ORDER.filter((moduleKey) => !currentModuleState[moduleKey] && modulesForm[moduleKey]),
    [currentModuleState, modulesForm]
  );

  const pendingDisabledModules = useMemo(
    () => BUSINESS_MODULE_ORDER.filter((moduleKey) => currentModuleState[moduleKey] && !modulesForm[moduleKey]),
    [currentModuleState, modulesForm]
  );
  const pendingEnabledCommercialSections = useMemo(
    () => commercialSectionCards.filter((card) => !currentCommercialSectionState[card.sectionKey] && card.enabled),
    [commercialSectionCards, currentCommercialSectionState]
  );
  const pendingDisabledCommercialSections = useMemo(
    () => commercialSectionCards.filter((card) => currentCommercialSectionState[card.sectionKey] && !card.enabled),
    [commercialSectionCards, currentCommercialSectionState]
  );

  const resolvedMenuPreview = useMemo(() => {
    return resolveBusinessNavigationState({
      business: activeBusiness,
      storedPreferences: currentMenuPrefs,
      hasPermission,
      hasModule,
      canAccessFeature: canAccess,
    });
  }, [activeBusiness, canAccess, currentMenuPrefs, hasModule, hasPermission]);
  const primaryMenuCandidates = useMemo(
    () => customizableNavigationItems.filter((item) => !currentMenuPrefs.hiddenPaths.includes(item.path)),
    [currentMenuPrefs.hiddenPaths, customizableNavigationItems]
  );
  const primaryMenuItem = useMemo(
    () => favoriteMenuItems[0] || primaryMenuCandidates[0] || resolvedMenuPreview.prioritizedItems[0] || null,
    [favoriteMenuItems, primaryMenuCandidates, resolvedMenuPreview.prioritizedItems]
  );
  const recommendedQuickItems = useMemo(() => {
    return currentDefaultMenuPrefs.favoritePaths
      .map((path) => customizableNavigationItems.find((item) => item.path === path))
      .filter(
        (item): item is NavigationItemDefinition => !!item && !currentMenuPrefs.hiddenPaths.includes(item.path)
      );
  }, [currentDefaultMenuPrefs.favoritePaths, currentMenuPrefs.hiddenPaths, customizableNavigationItems]);
  const quickAccessChoices = useMemo(() => {
    const seen = new Set<string>();
    return [...favoriteMenuItems, ...recommendedQuickItems, ...primaryMenuCandidates]
      .filter((item) => {
        if (currentMenuPrefs.hiddenPaths.includes(item.path)) return false;
        if (seen.has(item.path)) return false;
        seen.add(item.path);
        return true;
      })
      .slice(0, 8);
  }, [currentMenuPrefs.hiddenPaths, favoriteMenuItems, primaryMenuCandidates, recommendedQuickItems]);
  const quickAccessLimit = 5;
  const visibleFavoriteCount = useMemo(
    () => currentMenuPrefs.favoritePaths.filter((path) => !currentMenuPrefs.hiddenPaths.includes(path)).length,
    [currentMenuPrefs.favoritePaths, currentMenuPrefs.hiddenPaths]
  );
  const toolGroupSummaries = useMemo(() => {
    return toolGroups.map((group) => ({
      ...group,
      enabledCount: group.cards.filter((card) => card.enabled).length,
      pendingCount: group.cards.filter((card) => card.hasPendingChange).length,
    }));
  }, [toolGroups]);

  const resetMenuToCurrentBase = () => {
    setPreferences(scopeKey, currentDefaultMenuPrefs);
  };

  const resetSectionDraft = () => {
    setModulesForm(currentModuleState);
    setCommercialSectionsForm(currentCommercialSectionState);
  };

  const handleToggleModule = (moduleKey: BusinessModuleKey) => {
    if (!canAccessModule(subscriptionPlan, moduleKey)) return;
    setModulesForm((current) => ({
      ...current,
      [moduleKey]: !current[moduleKey],
    }));
  };

  const handleSaveSections = async () => {
    if (!activeBusiness || (!hasModuleChanges && !hasCommercialSectionChanges)) return;

    try {
      setSavingSections(true);
      if (hasModuleChanges) {
        await updateBusinessModules(activeBusiness.id, modulesForm);
      }
      if (hasCommercialSectionChanges) {
        const personalization = getBusinessPersonalizationSettings(activeBusiness);
        await updateBusiness(activeBusiness.id, {
          settings: buildPersonalizationSettingsPatch(activeBusiness.settings, {
            ...personalization,
            commercial_sections: commercialSectionsForm,
          }),
        });
      }
      toast.success('Las áreas del negocio quedaron actualizadas.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible guardar las áreas del negocio.');
    } finally {
      setSavingSections(false);
    }
  };

  const handleToggleCommercialSection = (sectionKey: BusinessCommercialSectionKey) => {
    setCommercialSectionsForm((current) => ({
      ...current,
      [sectionKey]: !current[sectionKey],
    }));
  };

  const handleApplyPreset = async (
    businessType: BusinessTypeKey,
    navigationMode: NavigationApplicationMode = 'preserve_manual'
  ) => {
    if (!activeBusiness) return;

    const preset = BUSINESS_TYPE_PRESETS[businessType];
    const allowedPresetModules = preset.recommendedModules.filter((moduleKey) => canAccessModule(subscriptionPlan, moduleKey));
    const enableCount = allowedPresetModules.filter((moduleKey) => !currentModules.includes(moduleKey)).length;
    const disableCount = currentModules.filter((moduleKey) => !allowedPresetModules.includes(moduleKey)).length;
    const blockedRecommendedCount = preset.recommendedModules.filter((moduleKey) => !canAccessModule(subscriptionPlan, moduleKey)).length;
    const navigationCopy =
      navigationMode === 'replace'
        ? 'También vamos a restaurar el menú recomendado para esta base.'
        : 'Si ya ajustaste tu menú manualmente, intentaremos conservar esa vista.';
    const confirmed = window.confirm(
      `Vas a usar la base ${preset.label}.\n\n` +
        `Se activarán ${enableCount} área(s) y se desactivarán ${disableCount} área(s).\n\n` +
        `${blockedRecommendedCount > 0 ? `Algunas áreas de esta base requieren un plan superior y no se activarán ahora.\n\n` : ''}` +
        `${navigationCopy}\n\n` +
        'Luego podrás ajustar áreas y orden del menú desde esta misma pantalla.'
    );

    if (!confirmed) return;

    try {
      setSavingPreset(true);
      const result = await applyBusinessTypeConfiguration({
        business: activeBusiness,
        businessType,
        currentNavigationPreferences: storedNavigationPreferences,
        navigationMode,
        plan: subscriptionPlan,
        setNavigationPreferences: (preferences) => setPreferences(scopeKey, preferences),
        updateBusiness,
        updateBusinessModules,
      });
      setSelectedBusinessType(businessType);
      if (navigationMode === 'replace') {
        toast.success('La base quedó aplicada y el menú volvió a la vista recomendada.');
      } else if (result.navigationDecision === 'preserved_manual') {
        toast.success('La base quedó aplicada y conservamos tu menú personalizado.');
      } else {
        toast.success('La base quedó aplicada y actualizamos la vista recomendada del negocio.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible aplicar la base recomendada.');
    } finally {
      setSavingPreset(false);
    }
  };

  const setMenuPreferences = (favoritePaths: string[], hiddenPaths: string[]) => {
    setPreferences(scopeKey, {
      favoritePaths,
      hiddenPaths,
    });
  };

  const handleToggleFavorite = (path: string) => {
    const isFavorite = currentMenuPrefs.favoritePaths.includes(path);
    const nextFavoritePaths = isFavorite
      ? currentMenuPrefs.favoritePaths.filter((item) => item !== path)
      : [...currentMenuPrefs.favoritePaths, path];

    setMenuPreferences(nextFavoritePaths, currentMenuPrefs.hiddenPaths.filter((item) => item !== path));
  };

  const handleToggleHidden = (path: string) => {
    const isHidden = currentMenuPrefs.hiddenPaths.includes(path);
    setMenuPreferences(
      currentMenuPrefs.favoritePaths.filter((item) => item !== path),
      isHidden ? currentMenuPrefs.hiddenPaths.filter((item) => item !== path) : [...currentMenuPrefs.hiddenPaths, path]
    );
  };

  const moveFavoriteItem = (path: string, direction: 'up' | 'down') => {
    const currentIndex = currentMenuPrefs.favoritePaths.indexOf(path);
    if (currentIndex === -1) return;
    const nextIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (nextIndex < 0 || nextIndex >= currentMenuPrefs.favoritePaths.length) return;
    const nextFavoritePaths = [...currentMenuPrefs.favoritePaths];
    const [item] = nextFavoritePaths.splice(currentIndex, 1);
    nextFavoritePaths.splice(nextIndex, 0, item);
    setMenuPreferences(nextFavoritePaths, currentMenuPrefs.hiddenPaths.filter((hiddenPath) => !nextFavoritePaths.includes(hiddenPath)));
  };

  const moveFavoriteToTop = (path: string) => {
    if (!currentMenuPrefs.favoritePaths.includes(path)) return;
    const nextFavoritePaths = [path, ...currentMenuPrefs.favoritePaths.filter((item) => item !== path)];
    setMenuPreferences(nextFavoritePaths, currentMenuPrefs.hiddenPaths.filter((hiddenPath) => !nextFavoritePaths.includes(hiddenPath)));
  };

  const setAsPrimary = (path: string) => {
    const nextFavoritePaths = [path, ...currentMenuPrefs.favoritePaths.filter((item) => item !== path)];
    setMenuPreferences(nextFavoritePaths, currentMenuPrefs.hiddenPaths.filter((item) => item !== path));
  };

  const handleToggleQuickAccess = (path: string) => {
    const isFavorite = currentMenuPrefs.favoritePaths.includes(path);
    if (!isFavorite && visibleFavoriteCount >= quickAccessLimit) {
      toast('Puedes dejar hasta 5 accesos principales en esta vista rápida.');
      return;
    }

    if (isFavorite) {
      setMenuPreferences(
        currentMenuPrefs.favoritePaths.filter((item) => item !== path),
        currentMenuPrefs.hiddenPaths.filter((item) => item !== path)
      );
      return;
    }

    setMenuPreferences(
      [...currentMenuPrefs.favoritePaths.filter((item) => item !== path), path],
      currentMenuPrefs.hiddenPaths.filter((item) => item !== path)
    );
  };

  if (!activeBusiness) {
    return (
      <div className="app-surface max-w-5xl rounded-[28px] p-6">
        <h3 className="text-xl font-semibold app-text">Personalización del negocio</h3>
        <p className="mt-2 text-sm app-text-muted">Selecciona un negocio para ajustar cómo se ve y qué incluye tu app.</p>
      </div>
    );
  }

  if (!canManageBusiness) {
    return (
      <div className="app-surface max-w-5xl rounded-[28px] p-6">
        <h3 className="text-xl font-semibold app-text">Personalización del negocio</h3>
        <p className="mt-2 text-sm app-text-muted">No tienes permisos para cambiar esta configuración.</p>
      </div>
    );
  }

  return (
    <div className="app-personalization-shell max-w-4xl space-y-4 animate-in fade-in duration-300" data-tour="settings.personalization.panel">
      <div className="px-1 pb-1">
        <h2 className="text-2xl font-semibold app-text sm:text-3xl">Personaliza tu negocio</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 app-text-muted sm:text-base">
          Déjala lista en pocos pasos. Lo importante va arriba y lo técnico queda guardado en opciones avanzadas.
        </p>
      </div>

      <StepShell
        step="1"
        tourId="settings.personalization.base"
        title="Cuéntanos de tu negocio"
        description="Elige la opción que más se parece a cómo trabajas hoy. Nosotros dejamos una base recomendada y luego tú ajustas lo mínimo necesario."
        actions={
          <>
            <Button onClick={() => handleApplyPreset(selectedBusinessType, 'preserve_manual')} isLoading={savingPreset}>
              {selectedBusinessType === appliedBusinessType ? 'Usar esta base' : 'Aplicar esta base'}
            </Button>
            <Button variant="secondary" onClick={() => handleApplyPreset(selectedBusinessType, 'replace')} disabled={savingPreset}>
              Aplicar y dejar lo recomendado
            </Button>
          </>
        }
      >
        {baseState.needsReview ? (
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            {baseState.source === 'suggested'
              ? 'Hay una opción sugerida para tu negocio. Si te representa, puedes dejarla aplicada desde aquí.'
              : 'Detectamos una opción probable según lo que ya usas. Puedes confirmarla sin perder tu configuración actual.'}
          </div>
        ) : null}

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="space-y-3">
            {Object.values(BUSINESS_TYPE_PRESETS).map((preset) => {
              const selected = selectedBusinessType === preset.key;
              const applied = appliedBusinessType === preset.key;
              return (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => setSelectedBusinessType(preset.key)}
                  className={cn(
                    'w-full rounded-3xl border p-4 text-left transition-all',
                    selected
                      ? 'border-blue-500/35 bg-blue-500/[0.08] shadow-[0_18px_40px_-32px_rgba(59,130,246,0.7)]'
                      : 'theme-surface-soft hover:border-[color:var(--app-primary-soft-border)]'
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <div className={cn('flex h-5 w-5 items-center justify-center rounded-full border', selected ? 'border-blue-400 bg-blue-500/20' : 'border-white/15')}>
                          {selected ? <Check className="h-3.5 w-3.5 text-blue-100" /> : null}
                        </div>
                        <div className="text-base font-semibold app-text">{preset.label}</div>
                      </div>
                      <p className="mt-2 text-sm leading-6 app-text-muted">{preset.shortDescription}</p>
                    </div>
                    {applied ? <span className="text-xs font-medium text-emerald-200">Actual</span> : null}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="theme-surface-soft rounded-3xl border p-5">
            <div className="flex items-center gap-2 text-sm font-semibold app-text">
              <Store className="h-4 w-4 text-blue-200" />
              {selectedBusinessType === appliedBusinessType ? 'Así está hoy tu negocio' : 'Así quedaría esta opción'}
            </div>
            <h4 className="mt-3 text-lg font-semibold app-text">{selectedPreset.label}</h4>
            <p className="mt-2 text-sm leading-6 app-text-muted">{selectedPreset.longDescription}</p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm app-text-muted">
              Te dejaremos una base recomendada para empezar. Después podrás elegir qué dejar más a mano y qué herramientas usar.
            </div>

            {selectedBlockedRecommendedCount > 0 ? (
              <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                Algunas herramientas recomendadas para esta opción dependen de tu plan actual.
              </div>
            ) : null}
          </div>
        </div>
      </StepShell>

      <StepShell
        step="2"
        tourId="settings.personalization.menu"
        title="Deja a la mano lo más importante"
        description="Elige qué quieres abrir primero y deja solo unos pocos accesos importantes. Todo esto se guarda al instante."
        actions={
          <Button variant="secondary" onClick={resetMenuToCurrentBase}>
            <RotateCcw className="h-4 w-4" />
            Volver a lo recomendado
          </Button>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="theme-surface-soft rounded-3xl border p-5">
            <div className="text-sm font-semibold app-text">Pantalla principal</div>
            <p className="mt-1 text-sm app-text-muted">Esto es lo primero que verás al entrar.</p>

            <div className="mt-4 space-y-2">
              {primaryMenuCandidates.slice(0, 5).map((item) => {
                const selected = primaryMenuItem?.path === item.path;
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => setAsPrimary(item.path)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors',
                      selected ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    )}
                  >
                    <div>
                      <div className="font-medium app-text">{item.label}</div>
                      <div className="mt-0.5 text-sm app-text-muted">{item.description}</div>
                    </div>
                    <div className={cn('flex h-5 w-5 items-center justify-center rounded-full border', selected ? 'border-blue-400 bg-blue-500/20' : 'border-white/15')}>
                      {selected ? <Check className="h-3.5 w-3.5 text-blue-100" /> : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="theme-surface-soft rounded-3xl border p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold app-text">Accesos importantes</div>
                <p className="mt-1 text-sm app-text-muted">Elige hasta {quickAccessLimit} para dejar más a la mano.</p>
              </div>
              <div className="text-xs app-text-muted">{visibleFavoriteCount}/{quickAccessLimit}</div>
            </div>

            <div className="mt-4 space-y-2">
              {quickAccessChoices.slice(0, 5).map((item) => {
                const selected = currentMenuPrefs.favoritePaths.includes(item.path) && !currentMenuPrefs.hiddenPaths.includes(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleToggleQuickAccess(item.path)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors',
                      selected ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    )}
                  >
                    <div>
                      <div className="font-medium app-text">{item.label}</div>
                      <div className="mt-0.5 text-sm app-text-muted">{item.description}</div>
                    </div>
                    <div className={cn('text-sm font-medium', selected ? 'text-blue-100' : 'app-text-muted')}>
                      {selected ? 'Listo' : 'Agregar'}
                    </div>
                  </button>
                );
              })}
            </div>

            {hasManualMenuCustomization ? <p className="mt-4 text-xs app-text-muted">Tienes una selección personalizada. Si quieres, más abajo puedes volver a lo recomendado.</p> : null}
          </div>
        </div>
      </StepShell>

      <StepShell
        step="3"
        tourId="settings.personalization.modules"
        title="Herramientas que quieres usar"
        description="Activa solo lo que realmente vas a manejar. Si necesitas afinar algo, abres esa categoría y listo."
        actions={
          <>
            <Button variant="secondary" onClick={resetSectionDraft} disabled={(!hasModuleChanges && !hasCommercialSectionChanges) || savingSections || savingPreset}>
              Descartar cambios
            </Button>
            <Button onClick={handleSaveSections} isLoading={savingSections} disabled={(!hasModuleChanges && !hasCommercialSectionChanges) || savingPreset}>
              Guardar herramientas
            </Button>
          </>
        }
      >
        {hasModuleChanges || hasCommercialSectionChanges ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Tienes cambios pendientes:
            {pendingEnabledModules.length > 0 ? ` activar ${pendingEnabledModules.length}` : ''}
            {pendingEnabledModules.length > 0 && pendingDisabledModules.length > 0 ? ' y' : ''}
            {pendingDisabledModules.length > 0 ? ` desactivar ${pendingDisabledModules.length}` : ''}.
            {pendingEnabledCommercialSections.length > 0 || pendingDisabledCommercialSections.length > 0
              ? ` También ${pendingEnabledCommercialSections.length > 0 ? `activar ${pendingEnabledCommercialSections.length} vista(s) comerciales` : ''}${pendingEnabledCommercialSections.length > 0 && pendingDisabledCommercialSections.length > 0 ? ' y ' : ''}${pendingDisabledCommercialSections.length > 0 ? `desactivar ${pendingDisabledCommercialSections.length} vista(s) comerciales` : ''}.`
              : ''}
          </div>
        ) : null}

        <div className={cn('space-y-3', hasModuleChanges || hasCommercialSectionChanges ? 'mt-4' : 'mt-1')}>
          {commercialSectionCards.length > 0 ? (
            <div className="theme-surface-soft rounded-3xl border p-4 sm:p-5">
              <div>
                <h4 className="text-base font-semibold app-text">Vistas comerciales del negocio</h4>
                <p className="mt-1 text-sm app-text-muted">Estas vistas quedan activas para todo el negocio. Si las apagas, desaparecen del menú y también se bloquea su acceso directo.</p>
              </div>
              <div className="mt-4 space-y-3">
                {commercialSectionCards.map((card) => (
                  <ModuleCard
                    key={card.sectionKey}
                    title={card.title}
                    description={card.description}
                    enabled={card.enabled}
                    locked={!card.availableInPlan || !card.availableInBusiness}
                    pending={card.hasPendingChange}
                    action={
                      <Button
                        variant={card.enabled ? 'secondary' : 'outline'}
                        onClick={() => handleToggleCommercialSection(card.sectionKey)}
                        disabled={savingSections || savingPreset || !card.availableInPlan || !card.availableInBusiness}
                      >
                        {!card.availableInBusiness ? 'Activa Ventas' : !card.availableInPlan ? 'Plan superior' : card.enabled ? 'Usando' : 'Usar'}
                      </Button>
                    }
                  />
                ))}
              </div>
            </div>
          ) : null}

          {toolGroupSummaries.map((group) => {
            const expanded = expandedToolGroupId === group.id;
            return (
              <div key={group.id} className="theme-surface-soft rounded-3xl border">
                <button
                  type="button"
                  onClick={() => setExpandedToolGroupId((current) => (current === group.id ? null : group.id))}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
                >
                  <div>
                    <h4 className="text-base font-semibold app-text">{group.title}</h4>
                    <p className="mt-1 text-sm app-text-muted">{group.description}</p>
                    <div className="mt-2 text-xs app-text-muted">
                      {group.enabledCount} de {group.cards.length} activa(s)
                      {group.pendingCount > 0 ? ` · ${group.pendingCount} cambio(s) pendiente(s)` : ''}
                    </div>
                  </div>
                  {expanded ? <ChevronUp className="h-5 w-5 app-text-muted" /> : <ChevronDown className="h-5 w-5 app-text-muted" />}
                </button>

                {expanded ? (
                  <div className="border-t border-white/10 px-4 py-4 sm:px-5">
                    <div className="space-y-3">
                      {group.cards.map((card) => (
                        <ModuleCard
                          key={card.moduleKey}
                          title={card.meta.label}
                          description={card.meta.description}
                          enabled={card.enabled}
                          locked={!card.availableInPlan}
                          pending={card.hasPendingChange}
                          action={
                            <Button
                              variant={card.enabled ? 'secondary' : 'outline'}
                              onClick={() => handleToggleModule(card.moduleKey)}
                              disabled={savingSections || savingPreset || !card.availableInPlan}
                            >
                              {!card.availableInPlan ? 'Plan superior' : card.enabled ? 'Usando' : 'Usar'}
                            </Button>
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </StepShell>

      <StepShell
        step="4"
        tourId="settings.personalization.preview"
        title="Configuración avanzada"
        description="Aquí queda el detalle fino. Si no necesitas ajustar algo específico, puedes dejar esta parte cerrada."
      >
        <div className="rounded-3xl border border-white/10 bg-white/[0.03]">
          <button
            type="button"
            onClick={() => setShowMenuEditor((current) => !current)}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-5"
          >
            <div>
              <div className="text-base font-semibold text-white">Abrir opciones avanzadas</div>
              <div className="mt-1 text-sm text-gray-400">Orden del menú, accesos ocultos y vista detallada.</div>
            </div>
            {showMenuEditor ? <ChevronUp className="h-5 w-5 text-gray-400" /> : <ChevronDown className="h-5 w-5 text-gray-400" />}
          </button>

          {showMenuEditor ? (
            <div className="border-t border-white/10 px-4 py-4 sm:px-5 sm:py-5">
              {accessManagedItems.length > 0 ? (
                <div className="mb-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm app-text-muted">
                  Algunas vistas dependen de tus permisos o de tu plan, como {accessManagedItems.map((item) => item.label).join(', ')}.
                </div>
              ) : null}

              <div className="theme-surface-soft rounded-2xl border px-4 py-3 text-sm app-text-muted">
                Estos cambios del menú se guardan al instante para este usuario y este negocio. No apagan herramientas del negocio; solo ordenan lo que ves.
              </div>

              <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
                <MenuColumn
                  title="Principales"
                  description="Aparecen primero y también tienen prioridad en móvil."
                  icon={Star}
                  items={favoriteMenuItems}
                  emptyMessage="Todavía no marcaste accesos principales. Puedes hacerlo desde el bloque anterior o desde “Visibles”."
                  renderActions={(item, index) => (
                    <>
                      <Button variant="ghost" size="sm" onClick={() => moveFavoriteToTop(item.path)} disabled={index === 0}>
                        Primero
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => moveFavoriteItem(item.path, 'up')} disabled={index === 0}>
                        <ArrowUp className="h-4 w-4" />
                        Subir
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => moveFavoriteItem(item.path, 'down')} disabled={index === favoriteMenuItems.length - 1}>
                        <ArrowDown className="h-4 w-4" />
                        Bajar
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => handleToggleFavorite(item.path)}>
                        Quitar principal
                      </Button>
                    </>
                  )}
                />

                <MenuColumn
                  title="Visibles"
                  description="Se siguen viendo en el menú, pero después de tus principales."
                  icon={LayoutPanelTop}
                  items={visibleSecondaryMenuItems}
                  emptyMessage="No quedan accesos visibles fuera de tus principales."
                  renderActions={(item) => (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => handleToggleFavorite(item.path)}>
                        <Star className="h-4 w-4" />
                        Marcar principal
                      </Button>
                      {item.allowHide !== false ? (
                        <Button variant="ghost" size="sm" onClick={() => handleToggleHidden(item.path)}>
                          <EyeOff className="h-4 w-4" />
                          Ocultar
                        </Button>
                      ) : null}
                    </>
                  )}
                />

                <MenuColumn
                  title="Ocultos"
                  description="Se quitan del menú, pero no cambian permisos ni herramientas activas."
                  icon={EyeOff}
                  items={hiddenMenuItems}
                  emptyMessage="No tienes accesos ocultos."
                  renderActions={(item) => (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => handleToggleHidden(item.path)}>
                        Mostrar de nuevo
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleToggleFavorite(item.path)}>
                        <Star className="h-4 w-4" />
                        Mostrar y priorizar
                      </Button>
                    </>
                  )}
                />
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_0.9fr]">
                <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5">
                      <LayoutPanelTop className="h-5 w-5 text-blue-200" />
                    </div>
                    <div>
                      <h4 className="text-base font-semibold text-white">Vista del menú en desktop</h4>
                      <p className="mt-1 text-sm text-gray-400">Tus principales aparecen primero dentro de las secciones visibles.</p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-4">
                    {resolvedMenuPreview.visibleSections.map((section) => (
                      <div key={section.id} className="rounded-2xl border border-white/10 bg-gray-950/40 p-4">
                        <div className="text-sm font-semibold text-white">{section.title}</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {section.items.map((item) => (
                            <span
                              key={item.path}
                              className={cn(
                                'rounded-full border px-2.5 py-1 text-xs',
                                currentMenuPrefs.favoritePaths.includes(item.path) && !currentMenuPrefs.hiddenPaths.includes(item.path)
                                  ? 'border-blue-500/25 bg-blue-500/10 text-blue-100'
                                  : 'border-white/10 bg-white/[0.04] text-gray-300'
                              )}
                            >
                              {item.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-5">
                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                    <div className="flex items-center gap-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-2.5">
                        <MonitorSmartphone className="h-5 w-5 text-blue-200" />
                      </div>
                      <div>
                        <h4 className="text-base font-semibold text-white">Accesos destacados en móvil</h4>
                        <p className="mt-1 text-sm text-gray-400">La lógica móvil usa los mismos principales y el mismo orden base.</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {resolvedMenuPreview.mobileItems.map((item, index) => (
                        <div key={item.path} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-gray-950/40 px-4 py-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-sm font-semibold text-blue-100">
                            {index + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-white">{item.label}</div>
                            <div className="text-sm text-gray-400">{item.description}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                    <h4 className="text-base font-semibold text-white">Resumen rápido</h4>
                    <div className="mt-4 space-y-3">
                      <div className="rounded-2xl border border-white/10 bg-gray-950/40 px-4 py-3 text-sm text-gray-300">
                        <span className="font-semibold text-white">Base:</span> {selectedPreset.label}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-gray-950/40 px-4 py-3 text-sm text-gray-300">
                        <span className="font-semibold text-white">Herramientas recomendadas faltantes:</span> {missingRecommendedModules.length}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-gray-950/40 px-4 py-3 text-sm text-gray-300">
                        <span className="font-semibold text-white">Principales:</span> {favoriteMenuItems.length}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-gray-950/40 px-4 py-3 text-sm text-gray-300">
                        <span className="font-semibold text-white">Ocultos:</span> {hiddenMenuItems.length}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </StepShell>
    </div>
  );
};
