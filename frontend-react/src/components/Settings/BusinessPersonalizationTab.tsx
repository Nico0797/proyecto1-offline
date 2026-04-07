import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Sparkles, Store } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { canAccessModule } from '../../auth/plan';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import { useAccess } from '../../hooks/useAccess';
import { Button } from '../ui/Button';
import {
  BUSINESS_TYPE_PRESETS,
  BusinessTypeKey,
  getBusinessBaseState,
  getBusinessNavigationDefaults,
  getEnabledBusinessModules,
  getMissingRecommendedModules,
} from '../../config/businessPersonalization';
import { applyPresetToBusinessSettings } from '../../config/businessPresets';
import { BUSINESS_NAVIGATION_ITEMS } from '../../navigation/businessNavigation';
import { useNavigationPreferences } from '../../store/navigationPreferences.store';
import { cn } from '../../utils/cn';
import {
  applyBusinessTypeConfiguration,
  buildPresetNavigationPreferences,
  hasManualNavigationCustomization,
  NavigationApplicationMode,
  toNavigationPreferences,
} from '../../config/businessPresetApplication';
import {
  BUSINESS_MODULE_META,
  BUSINESS_MODULE_ORDER,
  BusinessModuleKey,
  BusinessModuleState,
  isBusinessModuleEnabled,
} from '../../types';

const buildModulesFormState = (modules?: BusinessModuleState[] | null): Record<BusinessModuleKey, boolean> => {
  return BUSINESS_MODULE_ORDER.reduce((acc, moduleKey) => {
    acc[moduleKey] = isBusinessModuleEnabled(modules, moduleKey);
    return acc;
  }, {} as Record<BusinessModuleKey, boolean>);
};

export const BusinessPersonalizationTab = () => {
  const { user } = useAuthStore();
  const { activeBusiness, updateBusiness, updateBusinessModules } = useBusinessStore();
  const { hasPermission, hasModule, canAccess, subscriptionPlan, canManageBusinessExperience: canManageBusiness } = useAccess();
  const baseState = useMemo(() => getBusinessBaseState(activeBusiness), [activeBusiness]);
  const appliedBusinessType = baseState.effectiveBusinessType;
  const appliedPreset = BUSINESS_TYPE_PRESETS[appliedBusinessType];
  const currentNavigationDefaults = useMemo(() => getBusinessNavigationDefaults(activeBusiness), [activeBusiness]);

  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessTypeKey>(appliedBusinessType);
  const [savingPreset, setSavingPreset] = useState(false);
  const [savingSections, setSavingSections] = useState(false);
  const [showAdvancedMenuOptions, setShowAdvancedMenuOptions] = useState(false);
  const [modulesForm, setModulesForm] = useState<Record<BusinessModuleKey, boolean>>(
    () => buildModulesFormState(activeBusiness?.modules)
  );

  const getScopeKey = useNavigationPreferences((state) => state.getScopeKey);
  const getPreferences = useNavigationPreferences((state) => state.getPreferences);
  const setPreferences = useNavigationPreferences((state) => state.setPreferences);
  const toggleFavorite = useNavigationPreferences((state) => state.toggleFavorite);
  const toggleHidden = useNavigationPreferences((state) => state.toggleHidden);
  const moveFavorite = useNavigationPreferences((state) => state.moveFavorite);
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

  const selectedPreset = BUSINESS_TYPE_PRESETS[selectedBusinessType];
  const currentModules = useMemo(() => getEnabledBusinessModules(activeBusiness), [activeBusiness]);
  const currentModulesInPlan = useMemo(
    () => currentModules.filter((moduleKey) => canAccessModule(subscriptionPlan, moduleKey)),
    [currentModules, subscriptionPlan]
  );
  const currentModuleState = useMemo(() => buildModulesFormState(activeBusiness?.modules), [activeBusiness?.modules]);
  const selectedRecommendedModules = useMemo(
    () => selectedPreset.recommendedModules.filter((moduleKey) => canAccessModule(subscriptionPlan, moduleKey)),
    [selectedPreset.recommendedModules, subscriptionPlan]
  );
  const appliedRecommendedModules = useMemo(
    () => appliedPreset.recommendedModules.filter((moduleKey) => canAccessModule(subscriptionPlan, moduleKey)),
    [appliedPreset.recommendedModules, subscriptionPlan]
  );
  const blockedEnabledModulesCount = useMemo(
    () => currentModules.filter((moduleKey) => !canAccessModule(subscriptionPlan, moduleKey)).length,
    [currentModules, subscriptionPlan]
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
      return item.path !== '/help';
    });
  }, [canAccess, hasModule, hasPermission]);

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

  const previewNavigationItems = useMemo(() => {
    return selectedPreset.recommendedMenuPaths
      .map((path) => BUSINESS_NAVIGATION_ITEMS.find((item) => item.path === path))
      .filter(
        (item): item is (typeof BUSINESS_NAVIGATION_ITEMS)[number] =>
          !!item &&
          hasPermission(item.permission) &&
          (!item.moduleKey || canAccessModule(subscriptionPlan, item.moduleKey)) &&
          (!item.feature || canAccess(item.feature))
      );
  }, [canAccess, hasPermission, selectedPreset.recommendedMenuPaths, subscriptionPlan]);

  const favoriteMenuItems = useMemo(() => {
    return currentMenuPrefs.favoritePaths
      .map((path) => customizableNavigationItems.find((item) => item.path === path))
      .filter((item): item is (typeof customizableNavigationItems)[number] => !!item);
  }, [currentMenuPrefs.favoritePaths, customizableNavigationItems]);

  const hideableNavigationItems = useMemo(
    () => customizableNavigationItems.filter((item) => item.allowHide !== false),
    [customizableNavigationItems]
  );

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
      const isRecommended = appliedRecommendedModules.includes(moduleKey);
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
  }, [appliedRecommendedModules, canAccess, currentModuleState, hasPermission, modulesForm, subscriptionPlan]);

  const recommendedModuleCards = useMemo(
    () => moduleCards.filter((card) => card.isRecommended),
    [moduleCards]
  );

  const optionalModuleCards = useMemo(
    () => moduleCards.filter((card) => !card.isRecommended),
    [moduleCards]
  );

  const hasModuleChanges = useMemo(
    () => BUSINESS_MODULE_ORDER.some((moduleKey) => currentModuleState[moduleKey] !== modulesForm[moduleKey]),
    [currentModuleState, modulesForm]
  );

  const pendingEnabledModules = useMemo(
    () => BUSINESS_MODULE_ORDER.filter((moduleKey) => !currentModuleState[moduleKey] && modulesForm[moduleKey]),
    [currentModuleState, modulesForm]
  );

  const pendingDisabledModules = useMemo(
    () => BUSINESS_MODULE_ORDER.filter((moduleKey) => currentModuleState[moduleKey] && !modulesForm[moduleKey]),
    [currentModuleState, modulesForm]
  );

  const resetMenuToCurrentBase = () => {
    setPreferences(scopeKey, currentDefaultMenuPrefs);
  };

  const resetSectionDraft = () => {
    setModulesForm(currentModuleState);
  };

  const handleToggleModule = (moduleKey: BusinessModuleKey) => {
    if (!canAccessModule(subscriptionPlan, moduleKey)) return;
    setModulesForm((current) => ({
      ...current,
      [moduleKey]: !current[moduleKey],
    }));
  };

  const handleSaveSections = async () => {
    if (!activeBusiness || !hasModuleChanges) return;

    try {
      setSavingSections(true);
      await updateBusinessModules(activeBusiness.id, modulesForm);
      toast.success('Las secciones del negocio quedaron actualizadas.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible guardar las secciones del negocio.');
    } finally {
      setSavingSections(false);
    }
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
    const navigationCopy =
      navigationMode === 'replace'
        ? 'También restableceremos el menú recomendado para esta base.'
        : 'Si ya ajustaste el menú a mano, intentaremos conservar esa vista.';
    const confirmed = window.confirm(
      `Vas a aplicar la configuración recomendada para ${preset.label}.\n\n` +
        `Se activarán ${enableCount} sección(es) y se desactivarán ${disableCount} sección(es).\n\n` +
        `${selectedBlockedRecommendedCount > 0 ? `Algunas secciones de esta base necesitan un plan superior y no se activarán ahora.\n\n` : ''}` +
        `${navigationCopy}\n\n` +
        'Luego podrás ajustar detalles puntuales desde Configuración > Personalización.'
    );

    if (!confirmed) return;

    try {
      setSavingPreset(true);
      
      // Apply new preset-based configuration
      const presetBasedSettings = applyPresetToBusinessSettings(
        activeBusiness.settings || {},
        businessType,
        {
          applyModules: true,
          applyOnboarding: true,
        }
      );
      
      // Update business with new preset settings
      await updateBusiness(activeBusiness.id, {
        settings: presetBasedSettings,
      });
      
      // Apply navigation preferences
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
        toast.success('La experiencia recomendada quedó aplicada y el menú volvió a su orden sugerido.');
      } else if (result.navigationDecision === 'preserved_manual') {
        toast.success('La experiencia recomendada quedó aplicada y conservamos tu menú personalizado.');
      } else {
        toast.success('La experiencia recomendada quedó aplicada y actualizamos la vista sugerida del negocio.');
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible aplicar la configuración recomendada.');
    } finally {
      setSavingPreset(false);
    }
  };

  if (!activeBusiness) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-4xl">
        <h3 className="text-xl font-bold text-white mb-2">Personalización del negocio</h3>
        <p className="text-sm text-gray-400">Selecciona un negocio para ajustar cómo se ve y qué incluye tu app.</p>
      </div>
    );
  }

  if (!canManageBusiness) {
    return (
      <div className="bg-gray-800 border border-gray-700 rounded-2xl p-6 max-w-4xl">
        <h3 className="text-xl font-bold text-white mb-2">Personalización del negocio</h3>
        <p className="text-sm text-gray-400">No tienes permisos para cambiar esta configuración.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl animate-in fade-in duration-300" data-tour="settings.personalizationPanel">
      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6">
        <h3 className="flex items-center gap-2 text-xl font-bold text-white">
          <Sparkles className="w-5 h-5 text-amber-400" />
          Cómo se adapta la app a tu negocio
        </h3>
        <p className="mt-1 max-w-2xl text-sm text-gray-400">
          Desde aquí decides qué base usa tu negocio, qué secciones están activas y qué aparece primero en el menú.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-gray-700 bg-gray-900/50 px-3 py-1 text-xs text-gray-300">
            Base actual: {appliedPreset.label}
          </span>
          <span className="rounded-full border border-gray-700 bg-gray-900/50 px-3 py-1 text-xs text-gray-300">
            {currentModulesInPlan.length} secciones activas en este plan
          </span>
          <span className="rounded-full border border-gray-700 bg-gray-900/50 px-3 py-1 text-xs text-gray-300">
            {hasManualMenuCustomization
              ? 'Menú adaptado manualmente'
              : favoriteMenuItems.length > 0
                ? `${favoriteMenuItems.length} accesos priorizados`
                : 'Vista guiada activa'}
          </span>
          <span className="rounded-full border border-gray-700 bg-gray-900/50 px-3 py-1 text-xs text-gray-300">
            Desktop y móvil usan la misma lógica
          </span>
          {baseState.needsReview && (
            <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs text-blue-100">
              Revisión pendiente
            </span>
          )}
          {blockedEnabledModulesCount > 0 && (
            <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
              {blockedEnabledModulesCount} sección(es) dependen de un plan superior
            </span>
          )}
        </div>
      </div>

      {baseState.needsReview && (
        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-sm font-semibold text-blue-100">
                {baseState.source === 'suggested' ? 'Te dejamos una base sugerida pendiente de confirmar' : 'Detectamos una base probable para este negocio'}
              </div>
              <div className="mt-1 text-sm text-blue-100/80">
                {baseState.source === 'suggested'
                  ? 'Ya hay una recomendación guardada, pero todavía no quedó confirmada como configuración principal del negocio.'
                  : 'Tomamos como referencia las secciones que ya usa este negocio. Si quieres dejar esa base fija o cambiarla, puedes hacerlo aquí sin perder el menú que ya ajustaste.'}
              </div>
            </div>
            <Button onClick={() => handleApplyPreset(appliedBusinessType, 'preserve_manual')} isLoading={savingPreset}>
              Confirmar esta base
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6" data-tour="settings.personalizationBase">
        <div className="flex items-center gap-2">
          <Store className="w-5 h-5 text-blue-400" />
          <h4 className="text-lg font-semibold text-white">Configuración recomendada por tipo de negocio</h4>
        </div>
        <p className="mt-1 text-sm text-gray-400">
          Si tu operación cambió, puedes aplicar otra base sin rehacer la creación inicial del negocio.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
          {Object.values(BUSINESS_TYPE_PRESETS).map((preset) => {
            const selected = selectedBusinessType === preset.key;
            const applied = appliedBusinessType === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => setSelectedBusinessType(preset.key)}
                className={cn(
                  'rounded-2xl border p-5 text-left transition-all',
                  selected
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-900/10'
                    : 'border-gray-700 bg-gray-900/40 hover:border-gray-500'
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{preset.label}</div>
                    <div className="mt-1 text-sm text-gray-400">{preset.shortDescription}</div>
                  </div>
                  {applied && (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                      En uso
                    </span>
                  )}
                </div>
                {selected && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {preset.coveredExperiences.map((experience) => (
                      <span key={experience} className="rounded-full border border-gray-600 bg-gray-800 px-2.5 py-1 text-xs text-gray-300">
                        {experience}
                      </span>
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm font-semibold text-blue-100">
              {selectedBusinessType === appliedBusinessType ? 'Esta es la configuración que hoy usa tu negocio' : 'Vista previa de otra configuración'}
            </div>
            <div className="mt-1 text-xl font-semibold text-white">{selectedPreset.label}</div>
            <p className="mt-1 max-w-2xl text-sm text-blue-100/80">
              {selectedBusinessType === appliedBusinessType
                ? 'Aquí ves la recomendación principal que organiza secciones, menú sugerido y enfoque de trabajo del negocio.'
                : 'Si aplicas esta base, actualizaremos la recomendación principal del negocio. Por defecto tu menú manual se conserva.'}
            </p>
            <p className="mt-2 text-xs text-blue-100/70">
              Usa esta opción cuando la operación del negocio cambie de verdad. Para ajustes finos, cambia secciones puntuales más abajo.
            </p>
            {selectedBlockedRecommendedCount > 0 && (
              <p className="mt-2 text-xs text-blue-100/70">
                Esta base incluye {selectedBlockedRecommendedCount} sección(es) que requieren un plan superior, así que no se activarán ahora.
              </p>
            )}
          </div>
          <div className="flex w-full flex-col gap-2 lg:w-auto">
            <Button
              onClick={() => handleApplyPreset(selectedBusinessType, 'preserve_manual')}
              isLoading={savingPreset}
              className="w-full lg:w-auto"
            >
              {selectedBusinessType === appliedBusinessType ? 'Reaplicar y conservar menú' : 'Aplicar y conservar menú'}
            </Button>
            <Button
              variant="secondary"
              onClick={() => handleApplyPreset(selectedBusinessType, 'replace')}
              disabled={savingPreset}
              className="w-full lg:w-auto"
            >
              Aplicar y volver al menú sugerido
            </Button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-blue-400/10 bg-gray-900/40 p-4">
            <div className="text-xs uppercase tracking-wide text-blue-100/70">Qué deja listo</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedPreset.coveredExperiences.map((experience) => (
                <span key={experience} className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-100">
                  {experience}
                </span>
              ))}
            </div>
            {missingRecommendedModules.length > 0 && (
              <div className="mt-3 text-xs text-blue-100/70">
                Hoy faltan {missingRecommendedModules.length} sección(es) por activar para coincidir por completo con esta recomendación.
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-blue-400/10 bg-gray-900/40 p-4" data-tour="settings.personalizationPreview">
            <div className="text-xs uppercase tracking-wide text-blue-100/70">Lo primero que verás</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {previewNavigationItems.map((item) => (
                <span key={item.path} className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-1 text-xs text-blue-100">
                  {item.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6" data-tour="settings.personalizationModules">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h4 className="text-lg font-semibold text-white">Secciones que usa tu negocio</h4>
            <p className="mt-1 max-w-3xl text-sm text-gray-400">
              Empieza con lo necesario y suma más cuando tu operación lo pida. Esto controla qué áreas del negocio quedan disponibles en la app.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full border border-gray-700 bg-gray-900/50 px-3 py-1 text-xs text-gray-300">
                Recomendadas para {appliedPreset.label}
              </span>
              <span className="rounded-full border border-gray-700 bg-gray-900/50 px-3 py-1 text-xs text-gray-300">
                Puedes ampliar sin cambiar la base
              </span>
            </div>
            {accessManagedItems.length > 0 && (
              <p className="mt-3 max-w-3xl rounded-xl border border-gray-700 bg-gray-900/40 px-4 py-3 text-xs text-gray-300">
                Esta lista no controla todo. Secciones como {accessManagedItems.map((item) => item.label).join(', ')} dependen de permisos o plan, no de esta activación.
              </p>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={resetSectionDraft} disabled={!hasModuleChanges || savingSections || savingPreset}>
              Descartar cambios
            </Button>
            <Button onClick={handleSaveSections} isLoading={savingSections} disabled={!hasModuleChanges || savingPreset}>
              Guardar secciones
            </Button>
          </div>
        </div>

        {hasModuleChanges && (
          <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100">
            Tienes cambios pendientes:
            {pendingEnabledModules.length > 0 && ` activar ${pendingEnabledModules.length}`}
            {pendingEnabledModules.length > 0 && pendingDisabledModules.length > 0 && ' y'}
            {pendingDisabledModules.length > 0 && ` desactivar ${pendingDisabledModules.length}`}
            . Guarda para que la navegación y las vistas se actualicen.
          </div>
        )}

        <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div>
            <div className="mb-3 text-sm font-semibold text-white">Lo recomendado para tu operación actual</div>
            <div className="space-y-4">
              {recommendedModuleCards.map((card) => (
                <div
                  key={card.moduleKey}
                  className={cn(
                    'rounded-2xl border p-4',
                    card.enabled ? 'border-emerald-500/20 bg-emerald-500/5' : 'border-gray-700 bg-gray-900/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-white">{card.meta.label}</div>
                        <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-medium text-blue-100">
                          Recomendada
                        </span>
                        {card.hasPendingChange && (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100">
                            Cambio pendiente
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-400">{card.meta.description}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold',
                        card.enabled && card.availableInPlan
                          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                          : card.enabled
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                          : 'border-gray-600 bg-gray-700 text-gray-300'
                      )}
                    >
                      {card.enabled ? (card.availableInPlan ? 'Activa' : 'Bloqueada por plan') : 'Inactiva'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {card.relatedItems.map((item) => (
                      <span key={item.path} className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-300">
                        {item.label}
                      </span>
                    ))}
                    {card.relatedItems.length === 0 && !card.availableInPlan && (
                      <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-xs text-amber-100">
                        Requiere un plan superior
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-400">
                      {card.availableInPlan
                        ? 'Mantenerla activa ayuda a que la app arranque con lo esencial para este tipo de negocio.'
                        : 'Esta sección forma parte de experiencias más avanzadas y solo aparecerá al subir de plan.'}
                    </p>
                    <Button
                      variant={card.enabled ? 'secondary' : 'outline'}
                      onClick={() => handleToggleModule(card.moduleKey)}
                      disabled={savingSections || savingPreset || !card.availableInPlan}
                    >
                      {!card.availableInPlan ? 'Requiere plan superior' : card.enabled ? 'Ocultar por ahora' : 'Activar sección'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-3 text-sm font-semibold text-white">Secciones opcionales para ampliar después</div>
            <div className="space-y-4">
              {optionalModuleCards.map((card) => (
                <div
                  key={card.moduleKey}
                  className={cn(
                    'rounded-2xl border p-4',
                    card.enabled ? 'border-blue-500/20 bg-blue-500/5' : 'border-gray-700 bg-gray-900/40'
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-white">{card.meta.label}</div>
                        <span className="rounded-full border border-gray-600 bg-gray-800 px-2.5 py-1 text-[11px] font-medium text-gray-300">
                          Opcional
                        </span>
                        {card.hasPendingChange && (
                          <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-100">
                            Cambio pendiente
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm text-gray-400">{card.meta.description}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold',
                        card.enabled && card.availableInPlan
                          ? 'border-blue-500/30 bg-blue-500/10 text-blue-200'
                          : card.enabled
                            ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                          : 'border-gray-600 bg-gray-700 text-gray-300'
                      )}
                    >
                      {card.enabled ? (card.availableInPlan ? 'Activa' : 'Bloqueada por plan') : 'Inactiva'}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {card.relatedItems.map((item) => (
                      <span key={item.path} className="rounded-full border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs text-gray-300">
                        {item.label}
                      </span>
                    ))}
                    {card.relatedItems.length === 0 && (
                      <span className={cn(
                        'rounded-full border px-2.5 py-1 text-xs',
                        card.availableInPlan
                          ? 'border-gray-700 bg-gray-800 text-gray-300'
                          : 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                      )}>
                        {card.availableInPlan ? 'Disponible según tus permisos' : 'Requiere un plan superior'}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-gray-400">
                      {card.availableInPlan
                        ? 'Úsala solo cuando realmente necesites ampliar el flujo del negocio.'
                        : 'Podrás usarla cuando tu plan incluya esta experiencia.'}
                    </p>
                    <Button
                      variant={card.enabled ? 'secondary' : 'outline'}
                      onClick={() => handleToggleModule(card.moduleKey)}
                      disabled={savingSections || savingPreset || !card.availableInPlan}
                    >
                      {!card.availableInPlan ? 'Requiere plan superior' : card.enabled ? 'Ocultar por ahora' : 'Activar sección'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-700 bg-gray-800 p-4" data-tour="settings.personalizationMenu">
        <button
          type="button"
          onClick={() => setShowAdvancedMenuOptions((current) => !current)}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <div>
            <div className="font-medium text-white">Orden del menú</div>
            <div className="mt-1 text-sm text-gray-400">
              Decide qué ves primero y qué prefieres ocultar, sin apagar secciones del negocio.
            </div>
          </div>
          {showAdvancedMenuOptions ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>

        {showAdvancedMenuOptions && (
          <div className="mt-5 space-y-5 border-t border-gray-700 pt-5">
            <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-4">
              <div className="text-sm font-semibold text-white">Mostrar primero</div>
              <div className="mt-1 text-sm text-gray-400">
                Marca solo lo que usas más seguido. Esto también ayuda a simplificar la vista móvil.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {customizableNavigationItems.map((item) => {
                  const isFavorite = currentMenuPrefs.favoritePaths.includes(item.path);
                  const isHidden = currentMenuPrefs.hiddenPaths.includes(item.path);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => toggleFavorite(scopeKey, item.path)}
                      disabled={isHidden}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm transition-colors',
                        isFavorite
                          ? 'border-blue-500/30 bg-blue-500/10 text-blue-100'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500',
                        isHidden && 'cursor-not-allowed opacity-50'
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {favoriteMenuItems.length > 1 && (
              <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-4">
                <div className="text-sm font-semibold text-white">Orden actual</div>
                <div className="mt-1 text-sm text-gray-400">
                  Mueve hacia arriba lo que quieres tener más a mano.
                </div>
                <div className="mt-3 space-y-2">
                  {favoriteMenuItems.map((item, index) => (
                    <div key={item.path} className="flex items-center justify-between gap-3 rounded-xl border border-gray-700 bg-gray-800/70 px-3 py-2">
                      <div className="text-sm text-white">
                        {index + 1}. {item.label}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => moveFavorite(scopeKey, item.path, 'up')}
                          disabled={index <= 0}
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="secondary"
                          size="icon"
                          onClick={() => moveFavorite(scopeKey, item.path, 'down')}
                          disabled={index >= favoriteMenuItems.length - 1}
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-gray-700 bg-gray-900/40 p-4">
              <div className="text-sm font-semibold text-white">Ocultar lo que no usas</div>
              <div className="mt-1 text-sm text-gray-400">
                Esto solo limpia la vista. No cambia permisos ni apaga secciones.
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {hideableNavigationItems.map((item) => {
                  const isHidden = currentMenuPrefs.hiddenPaths.includes(item.path);
                  return (
                    <button
                      key={item.path}
                      type="button"
                      onClick={() => toggleHidden(scopeKey, item.path)}
                      className={cn(
                        'rounded-full border px-3 py-1.5 text-sm transition-colors',
                        isHidden
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
                          : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-500'
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={resetMenuToCurrentBase}>
                  Volver a la vista recomendada
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
