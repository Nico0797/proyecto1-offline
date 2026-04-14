import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, ChevronDown, ChevronUp, EyeOff, RotateCcw, Sparkles, Star } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { canAccessModule } from '../../auth/plan';
import { isBackendPathSupported } from '../../config/backendCapabilities';
import {
  BUSINESS_PRESET_UI_ORDER,
  buildOperationalProfileFromPreset,
  buildPersonalizationSettingsPatch,
  type BusinessCommercialSectionKey,
  type BusinessTypeKey,
  getBusinessBaseState,
  getBusinessCommercialSections,
  getBusinessNavigationDefaults,
  getBusinessPersonalizationSettings,
  getBusinessTypePreset,
  getBusinessTypePresetDefinition,
  getEnabledBusinessModules,
  getMissingRecommendedModules,
  isBusinessCommercialSectionEnabled,
} from '../../config/businessPersonalizationCompat';
import {
  applyBusinessTypeConfiguration,
  buildPresetNavigationPreferences,
  hasManualNavigationCustomization,
  type NavigationApplicationMode,
  toNavigationPreferences,
} from '../../config/businessPresetApplication';
import {
  type BusinessOperationalInventoryModel,
  normalizeBusinessOperationalProfile,
  type BusinessOperationalProfile,
} from '../../config/businessOperationalProfile';
import { useAccess } from '../../hooks/useAccess';
import { BUSINESS_NAVIGATION_ITEMS } from '../../navigation/businessNavigation';
import { resolveBusinessNavigationState } from '../../navigation/navigationPersonalization';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { useNavigationPreferences } from '../../store/navigationPreferences.store';
import { BUSINESS_MODULE_META, BUSINESS_MODULE_ORDER, type BusinessModuleKey, type BusinessModuleState, isBusinessModuleEnabled } from '../../types';
import { cn } from '../../utils/cn';
import { Button } from '../ui/Button';

const GROUPS = [
  { id: 'daily', title: 'Operación diaria', keys: ['sales', 'quotes'] as BusinessModuleKey[] },
  { id: 'customers', title: 'Clientes y cobros', keys: ['customers', 'accounts_receivable'] as BusinessModuleKey[] },
  { id: 'inventory', title: 'Productos e inventario', keys: ['products', 'raw_inventory'] as BusinessModuleKey[] },
  { id: 'control', title: 'Análisis y control', keys: ['reports'] as BusinessModuleKey[] },
];

const PRIMARY_COMMERCIAL_PATHS = ['/invoices', '/orders', '/sales-goals'];

const buildModulesFormState = (modules?: BusinessModuleState[] | null): Record<BusinessModuleKey, boolean> =>
  BUSINESS_MODULE_ORDER.reduce((acc, key) => {
    acc[key] = isBusinessModuleEnabled(modules, key);
    return acc;
  }, {} as Record<BusinessModuleKey, boolean>);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="theme-surface-soft rounded-2xl border px-4 py-3">
    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] app-text-muted">{label}</div>
    <div className="mt-1 text-sm font-semibold app-text">{value}</div>
  </div>
);

export const BusinessPersonalizationRedesign = () => {
  const { user } = useAuthStore();
  const { activeBusiness, updateBusiness, updateBusinessModules } = useBusinessStore();
  const { hasPermission, hasModule, canAccess, subscriptionPlan, canManageBusinessExperience: canManageBusiness } = useAccess();
  const getScopeKey = useNavigationPreferences((state) => state.getScopeKey);
  const getPreferences = useNavigationPreferences((state) => state.getPreferences);
  const setPreferences = useNavigationPreferences((state) => state.setPreferences);
  const preferencesByScope = useNavigationPreferences((state) => state.preferencesByScope);

  const baseState = useMemo(() => getBusinessBaseState(activeBusiness), [activeBusiness]);
  const appliedBusinessType = baseState.effectiveBusinessType;
  const appliedPreset = useMemo(() => getBusinessTypePresetDefinition(appliedBusinessType), [appliedBusinessType]);
  const currentNavigationDefaults = useMemo(() => getBusinessNavigationDefaults(activeBusiness), [activeBusiness]);
  const scopeKey = useMemo(() => getScopeKey(user?.id, activeBusiness?.id), [activeBusiness?.id, getScopeKey, user?.id]);
  const storedNavigationPreferences = preferencesByScope[scopeKey];

  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessTypeKey>(appliedBusinessType);
  const [showPresetPicker, setShowPresetPicker] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savingPreset, setSavingPreset] = useState(false);
  const [savingModules, setSavingModules] = useState(false);
  const [modulesForm, setModulesForm] = useState<Record<BusinessModuleKey, boolean>>(() => buildModulesFormState(activeBusiness?.modules));
  const [commercialSectionsForm, setCommercialSectionsForm] = useState(() => getBusinessCommercialSections(activeBusiness || null));

  useEffect(() => setSelectedBusinessType(appliedBusinessType), [appliedBusinessType, activeBusiness?.id]);
  useEffect(() => setModulesForm(buildModulesFormState(activeBusiness?.modules)), [activeBusiness?.id, activeBusiness?.modules]);
  useEffect(() => setCommercialSectionsForm(getBusinessCommercialSections(activeBusiness || null)), [activeBusiness]);

  const presetOptions = useMemo(
    () => BUSINESS_PRESET_UI_ORDER.map((key) => getBusinessTypePresetDefinition(key)),
    []
  );
  const selectedPreset = useMemo(() => getBusinessTypePresetDefinition(selectedBusinessType), [selectedBusinessType]);
  const currentModules = useMemo(() => getEnabledBusinessModules(activeBusiness), [activeBusiness]);
  const currentModuleState = useMemo(() => buildModulesFormState(activeBusiness?.modules), [activeBusiness?.modules]);
  const selectedRecommendedModules = useMemo(
    () => selectedPreset.recommendedModules.filter((key) => canAccessModule(subscriptionPlan, key)),
    [selectedPreset.recommendedModules, subscriptionPlan]
  );
  const missingRecommendedModules = useMemo(() => getMissingRecommendedModules(currentModules, selectedRecommendedModules), [currentModules, selectedRecommendedModules]);
  const summaryLabels = useMemo(() => currentModules.slice(0, 5).map((key) => BUSINESS_MODULE_META[key].label), [currentModules]);

  const hasModuleChanges = useMemo(
    () => BUSINESS_MODULE_ORDER.some((key) => currentModuleState[key] !== modulesForm[key]),
    [currentModuleState, modulesForm]
  );
  const hasCommercialChanges = useMemo(
    () => Object.keys(commercialSectionsForm).some((key) => commercialSectionsForm[key as BusinessCommercialSectionKey] !== getBusinessCommercialSections(activeBusiness || null)[key as BusinessCommercialSectionKey]),
    [activeBusiness, commercialSectionsForm]
  );

  const customizableNavigationItems = useMemo(() => BUSINESS_NAVIGATION_ITEMS.filter((item) => {
    if (!hasPermission(item.permission)) return false;
    if (!hasModule(item.moduleKey)) return false;
    if (item.feature && !canAccess(item.feature)) return false;
    if (item.commercialSectionKey && !isBusinessCommercialSectionEnabled(activeBusiness, item.commercialSectionKey)) return false;
    return item.path !== '/help';
  }), [activeBusiness, canAccess, hasModule, hasPermission]);

  const currentDefaultMenuPrefs = useMemo(() => {
    if (currentNavigationDefaults) return toNavigationPreferences(currentNavigationDefaults);
    return buildPresetNavigationPreferences({ businessType: appliedBusinessType, availableItems: customizableNavigationItems });
  }, [appliedBusinessType, currentNavigationDefaults, customizableNavigationItems]);

  const currentMenuPrefs = useMemo(() => getPreferences(scopeKey, currentDefaultMenuPrefs), [currentDefaultMenuPrefs, getPreferences, preferencesByScope, scopeKey]);
  const favoriteItems = useMemo(() => currentMenuPrefs.favoritePaths.map((path) => customizableNavigationItems.find((item) => item.path === path)).filter(Boolean), [currentMenuPrefs.favoritePaths, customizableNavigationItems]) as typeof customizableNavigationItems;
  const visibleItems = useMemo(() => customizableNavigationItems.filter((item) => !currentMenuPrefs.hiddenPaths.includes(item.path)), [currentMenuPrefs.hiddenPaths, customizableNavigationItems]);
  const secondaryItems = useMemo(() => visibleItems.filter((item) => !currentMenuPrefs.favoritePaths.includes(item.path)), [currentMenuPrefs.favoritePaths, visibleItems]);
  const hiddenItems = useMemo(() => customizableNavigationItems.filter((item) => item.allowHide !== false && currentMenuPrefs.hiddenPaths.includes(item.path)), [currentMenuPrefs.hiddenPaths, customizableNavigationItems]);
  const primaryItem = favoriteItems[0] || visibleItems[0] || null;
  const hasManualMenuCustomization = useMemo(() => hasManualNavigationCustomization({ storedPreferences: storedNavigationPreferences, navigationDefaults: currentDefaultMenuPrefs, availableItems: customizableNavigationItems }), [currentDefaultMenuPrefs, customizableNavigationItems, storedNavigationPreferences]);
  const resolvedMenuPreview = useMemo(() => resolveBusinessNavigationState({ business: activeBusiness, storedPreferences: currentMenuPrefs, hasPermission, hasModule, canAccessFeature: canAccess }), [activeBusiness, canAccess, currentMenuPrefs, hasModule, hasPermission]);

  const groupedModules = useMemo(() => GROUPS.map((group) => ({
    ...group,
    items: group.keys.map((key) => ({
      key,
      meta: BUSINESS_MODULE_META[key],
      enabled: modulesForm[key],
      recommended: selectedRecommendedModules.includes(key),
      locked: !canAccessModule(subscriptionPlan, key),
      pending: modulesForm[key] !== currentModuleState[key],
    })),
  })), [currentModuleState, modulesForm, selectedRecommendedModules, subscriptionPlan]);

  const commercialCards = useMemo(() => PRIMARY_COMMERCIAL_PATHS
    .map((path) => BUSINESS_NAVIGATION_ITEMS.find((item) => item.path === path))
    .filter((item): item is NonNullable<typeof item> => !!item && !!item.commercialSectionKey)
    .filter((item) => isBackendPathSupported(item.path))
    .map((item) => ({
      key: item.commercialSectionKey as BusinessCommercialSectionKey,
      label: item.label,
      description: item.description,
      enabled: commercialSectionsForm[item.commercialSectionKey as BusinessCommercialSectionKey],
      locked: (!!item.feature && !canAccess(item.feature)) || !modulesForm.sales,
    })), [canAccess, commercialSectionsForm, modulesForm.sales]);

  const setMenu = (favoritePaths: string[], hiddenPaths: string[]) => setPreferences(scopeKey, { favoritePaths, hiddenPaths });
  const toggleFavorite = (path: string) => setMenu(currentMenuPrefs.favoritePaths.includes(path) ? currentMenuPrefs.favoritePaths.filter((item) => item !== path) : [...currentMenuPrefs.favoritePaths.filter((item) => item !== path), path], currentMenuPrefs.hiddenPaths.filter((item) => item !== path));
  const toggleHidden = (path: string) => setMenu(currentMenuPrefs.favoritePaths.filter((item) => item !== path), currentMenuPrefs.hiddenPaths.includes(path) ? currentMenuPrefs.hiddenPaths.filter((item) => item !== path) : [...currentMenuPrefs.hiddenPaths, path]);
  const setPrimary = (path: string) => setMenu([path, ...currentMenuPrefs.favoritePaths.filter((item) => item !== path)], currentMenuPrefs.hiddenPaths.filter((item) => item !== path));
  const moveFavorite = (path: string, direction: 'up' | 'down') => {
    const index = currentMenuPrefs.favoritePaths.indexOf(path);
    if (index === -1) return;
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= currentMenuPrefs.favoritePaths.length) return;
    const next = [...currentMenuPrefs.favoritePaths];
    const [item] = next.splice(index, 1);
    next.splice(nextIndex, 0, item);
    setMenu(next, currentMenuPrefs.hiddenPaths.filter((hidden) => !next.includes(hidden)));
  };
  const resetMenu = () => setPreferences(scopeKey, currentDefaultMenuPrefs);

  const saveModules = async () => {
    if (!activeBusiness || (!hasModuleChanges && !hasCommercialChanges)) return;
    try {
      setSavingModules(true);
      if (hasModuleChanges) await updateBusinessModules(activeBusiness.id, modulesForm);
      if (hasCommercialChanges) {
        const personalization = getBusinessPersonalizationSettings(activeBusiness);
        await updateBusiness(activeBusiness.id, {
          settings: buildPersonalizationSettingsPatch(activeBusiness.settings || {}, { ...personalization, commercial_sections: commercialSectionsForm }),
        });
      }
      toast.success('La personalización quedó actualizada.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible guardar la personalización.');
    } finally {
      setSavingModules(false);
    }
  };

  const applyPreset = async (businessType: BusinessTypeKey, navigationMode: NavigationApplicationMode) => {
    if (!activeBusiness) return;
    const preset = getBusinessTypePresetDefinition(businessType);
    const canonicalPreset = getBusinessTypePreset(businessType);
    if (!canonicalPreset) return;
    const confirmed = window.confirm(`Vas a aplicar la base ${preset.label}. Después podrás editar manualmente cualquier módulo. ${navigationMode === 'replace' ? 'También vamos a restaurar el menú recomendado.' : 'Si ya ajustaste tu menú, intentaremos conservarlo.'}`);
    if (!confirmed) return;
    try {
      setSavingPreset(true);
      const operational = buildOperationalProfileFromPreset(canonicalPreset);
      await applyBusinessTypeConfiguration({
        business: activeBusiness,
        businessType,
        commercialSections: canonicalPreset.commercialSections as Record<BusinessCommercialSectionKey, boolean>,
        currentNavigationPreferences: storedNavigationPreferences,
        navigationMode,
        operationalProfile: normalizeBusinessOperationalProfile({
          ...operational,
          inventory_model: (operational.inventory_model ?? null) as BusinessOperationalInventoryModel | null,
          fulfillment_mode: operational.fulfillment_mode ?? null,
          production_mode: (operational.production_mode ?? null) as BusinessOperationalProfile['production_mode'],
          recipe_mode: (operational.recipe_mode ?? null) as BusinessOperationalProfile['recipe_mode'],
          production_control_mode: (operational.production_control_mode ?? null) as BusinessOperationalProfile['production_control_mode'],
        }),
        plan: subscriptionPlan,
        prioritizedPath: canonicalPreset.prioritizedPath || null,
        recommendedModules: canonicalPreset.recommendedModules,
        setNavigationPreferences: (preferences) => setPreferences(scopeKey, preferences),
        updateBusiness,
        updateBusinessModules,
        visibilityMode: canonicalPreset.simplicityLevel === 'simple' ? 'basic' : 'advanced',
      });
      setSelectedBusinessType(businessType);
      setCommercialSectionsForm(canonicalPreset.commercialSections as Record<BusinessCommercialSectionKey, boolean>);
      setShowPresetPicker(false);
      toast.success(navigationMode === 'replace' ? 'Base aplicada y menú restaurado.' : 'Base aplicada conservando tu menú cuando fue posible.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible aplicar la base.');
    } finally {
      setSavingPreset(false);
    }
  };

  if (!activeBusiness) return <div className="app-surface max-w-4xl rounded-[24px] p-6"><h3 className="text-xl font-semibold app-text">Personalización del negocio</h3><p className="mt-2 text-sm app-text-muted">Selecciona un negocio para ajustar qué quieres ver y usar en tu app.</p></div>;
  if (!canManageBusiness) return <div className="app-surface max-w-4xl rounded-[24px] p-6"><h3 className="text-xl font-semibold app-text">Personalización del negocio</h3><p className="mt-2 text-sm app-text-muted">No tienes permisos para cambiar esta configuración.</p></div>;

  return (
    <div className="max-w-4xl space-y-4" data-tour="settings.personalization.panel">
      <section className="app-surface rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold app-text">Personaliza tu negocio</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 app-text-muted">Primero ves el resumen, luego ajustas módulos y al final entras en opciones avanzadas si realmente las necesitas.</p>
          </div>
          <Button variant="secondary" onClick={() => setShowPresetPicker((current) => !current)}><Sparkles className="h-4 w-4" />{showPresetPicker ? 'Cerrar bases' : 'Cambiar base'}</Button>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Stat label="Base actual" value={appliedPreset.label} />
          <Stat label="Módulos activos" value={`${currentModules.length} visibles`} />
          <Stat label="Pantalla principal" value={primaryItem?.label || 'Sin prioridad'} />
        </div>
        {summaryLabels.length > 0 ? <div className="mt-4 flex flex-wrap gap-2">{summaryLabels.map((label) => <span key={label} className="rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-xs font-medium text-blue-700 dark:text-blue-100">{label}</span>)}</div> : null}
        {baseState.needsReview ? <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-100">Detectamos que otra base podría representar mejor tu negocio. Si la aplicas, luego podrás editar manualmente todos los módulos.</div> : null}
      </section>

      {showPresetPicker ? (
        <section className="app-surface rounded-[28px] p-5 sm:p-6" data-tour="settings.personalization.base">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-3">
              {presetOptions.map((preset) => <button key={preset.key} type="button" onClick={() => setSelectedBusinessType(preset.key)} className={cn('w-full rounded-3xl border p-4 text-left transition-all', selectedBusinessType === preset.key ? 'border-blue-500/35 bg-blue-500/[0.08]' : 'theme-surface-soft')}><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><div className={cn('flex h-5 w-5 items-center justify-center rounded-full border', selectedBusinessType === preset.key ? 'border-blue-400 bg-blue-500/20' : 'border-white/15')}>{selectedBusinessType === preset.key ? <Check className="h-3.5 w-3.5 text-blue-100" /> : null}</div><div className="font-semibold app-text">{preset.label}</div></div><p className="mt-2 text-sm app-text-muted">{preset.shortDescription}</p></div>{appliedBusinessType === preset.key ? <span className="text-xs font-medium text-emerald-600 dark:text-emerald-200">Actual</span> : null}</div></button>)}
            </div>
            <div className="theme-surface-soft rounded-3xl border p-5">
              <h3 className="text-lg font-semibold app-text">{selectedPreset.label}</h3>
              <p className="mt-2 text-sm leading-6 app-text-muted">{selectedPreset.longDescription}</p>
              <div className="mt-4 flex flex-wrap gap-2">{selectedPreset.recommendedModules.map((key) => <span key={key} className="rounded-full border border-[color:var(--app-border)] bg-white/[0.04] px-3 py-1 text-xs app-text">{BUSINESS_MODULE_META[key].label}</span>)}</div>
              <div className="mt-4 rounded-2xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-700 dark:text-blue-100">La base es una recomendación inicial, no un bloqueo. Luego puedes prender u ocultar cualquier módulo manualmente.</div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button onClick={() => applyPreset(selectedBusinessType, 'preserve_manual')} isLoading={savingPreset}>Aplicar base</Button><Button variant="secondary" onClick={() => applyPreset(selectedBusinessType, 'replace')} disabled={savingPreset}>Aplicar y restaurar menú</Button></div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="app-surface rounded-[28px] p-5 sm:p-6" data-tour="settings.personalization.modules">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><h3 className="text-xl font-semibold app-text">Edición rápida de módulos</h3><p className="mt-2 text-sm leading-6 app-text-muted">Activa solo lo esencial para tu operación. Esta es la parte principal de la personalización.</p></div>
          <div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => { setModulesForm(currentModuleState); setCommercialSectionsForm(getBusinessCommercialSections(activeBusiness || null)); }} disabled={(!hasModuleChanges && !hasCommercialChanges) || savingModules || savingPreset}>Descartar</Button><Button onClick={saveModules} isLoading={savingModules} disabled={(!hasModuleChanges && !hasCommercialChanges) || savingPreset}>Guardar</Button></div>
        </div>
        {missingRecommendedModules.length > 0 ? <div className="mt-4 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-100">La configuración actual no tiene {missingRecommendedModules.length} módulo(s) recomendados por la base seleccionada. Eso está bien si tu operación ya se ajustó manualmente.</div> : null}
        <div className="mt-5 space-y-5">{groupedModules.map((group) => <div key={group.id} className="theme-surface-soft rounded-3xl border p-4 sm:p-5"><h4 className="text-base font-semibold app-text">{group.title}</h4><div className="mt-4 space-y-3">{group.items.map((item) => <div key={item.key} className={cn('rounded-2xl border px-4 py-4', item.enabled ? 'border-blue-500/25 bg-blue-500/[0.06]' : 'theme-surface-muted')}><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><div className="font-semibold app-text">{item.meta.label}</div>{item.recommended ? <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-100">Recomendado</span> : null}{item.pending ? <span className="rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-100">Pendiente</span> : null}</div><p className="mt-1 text-sm app-text-muted">{item.meta.description}</p></div><Button variant={item.enabled ? 'secondary' : 'outline'} onClick={() => !item.locked && setModulesForm((current) => ({ ...current, [item.key]: !current[item.key] }))} disabled={item.locked || savingModules || savingPreset}>{item.locked ? 'Plan superior' : item.enabled ? 'Activo' : 'Activar'}</Button></div></div>)}</div></div>)}
          {commercialCards.length > 0 ? <div className="theme-surface-soft rounded-3xl border p-4 sm:p-5"><h4 className="text-base font-semibold app-text">Vistas comerciales</h4><div className="mt-4 space-y-3">{commercialCards.map((item) => <div key={item.key} className="theme-surface-muted rounded-2xl border px-4 py-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="font-semibold app-text">{item.label}</div><p className="mt-1 text-sm app-text-muted">{item.description}</p></div><Button variant={item.enabled ? 'secondary' : 'outline'} onClick={() => !item.locked && setCommercialSectionsForm((current) => ({ ...current, [item.key]: !current[item.key] }))} disabled={item.locked || savingModules || savingPreset}>{item.locked ? 'Activa Ventas' : item.enabled ? 'Activa' : 'Activar'}</Button></div></div>)}</div></div> : null}
        </div>
      </section>

      <section className="app-surface rounded-[28px] p-5 sm:p-6">
        <button type="button" onClick={() => setShowAdvanced((current) => !current)} className="flex w-full items-center justify-between gap-4 text-left">
          <div><h3 className="text-xl font-semibold app-text">Opciones avanzadas</h3><p className="mt-2 text-sm leading-6 app-text-muted">Aquí queda el detalle fino del menú y la vista previa final para desktop y móvil.</p></div>
          {showAdvanced ? <ChevronUp className="h-5 w-5 app-text-muted" /> : <ChevronDown className="h-5 w-5 app-text-muted" />}
        </button>
        {showAdvanced ? <div className="mt-5 space-y-5"><div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><div className="theme-surface-soft rounded-3xl border p-5"><div className="text-sm font-semibold app-text">Pantalla principal</div><div className="mt-4 space-y-2">{visibleItems.slice(0, 6).map((item) => <button key={item.path} type="button" onClick={() => setPrimary(item.path)} className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left', primaryItem?.path === item.path ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/10 bg-white/[0.02]')}><span className="font-medium app-text">{item.label}</span>{primaryItem?.path === item.path ? <Check className="h-4 w-4 text-blue-200" /> : null}</button>)}</div></div><div className="theme-surface-soft rounded-3xl border p-5"><div className="flex items-center justify-between gap-3"><div><div className="text-sm font-semibold app-text">Accesos importantes</div><p className="mt-1 text-sm app-text-muted">Se guardan al instante para este usuario y este negocio.</p></div><Button variant="secondary" onClick={resetMenu}><RotateCcw className="h-4 w-4" />Volver a lo recomendado</Button></div><div className="mt-4 space-y-2">{visibleItems.slice(0, 8).map((item) => <button key={item.path} type="button" onClick={() => toggleFavorite(item.path)} className={cn('flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left', currentMenuPrefs.favoritePaths.includes(item.path) ? 'border-blue-500/30 bg-blue-500/10' : 'border-white/10 bg-white/[0.02]')}><span className="font-medium app-text">{item.label}</span><span className="text-sm app-text-muted">{currentMenuPrefs.favoritePaths.includes(item.path) ? 'Listo' : 'Agregar'}</span></button>)}</div>{hasManualMenuCustomization ? <p className="mt-4 text-xs app-text-muted">Tienes una personalización manual guardada.</p> : null}</div></div>
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-3"><div className="theme-surface-soft rounded-3xl border p-5"><div className="text-sm font-semibold app-text">Principales</div><div className="mt-4 space-y-2">{favoriteItems.length === 0 ? <div className="text-sm app-text-muted">Sin accesos principales.</div> : favoriteItems.map((item, index) => <div key={item.path} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"><div className="font-medium app-text">{item.label}</div><div className="mt-3 flex flex-wrap gap-2"><Button variant="ghost" size="sm" onClick={() => moveFavorite(item.path, 'up')} disabled={index === 0}><ArrowUp className="h-4 w-4" />Subir</Button><Button variant="ghost" size="sm" onClick={() => moveFavorite(item.path, 'down')} disabled={index === favoriteItems.length - 1}><ArrowDown className="h-4 w-4" />Bajar</Button><Button variant="secondary" size="sm" onClick={() => toggleFavorite(item.path)}>Quitar</Button></div></div>)}</div></div><div className="theme-surface-soft rounded-3xl border p-5"><div className="text-sm font-semibold app-text">Visibles</div><div className="mt-4 space-y-2">{secondaryItems.slice(0, 8).map((item) => <div key={item.path} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"><div className="font-medium app-text">{item.label}</div><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => toggleFavorite(item.path)}><Star className="h-4 w-4" />Principal</Button>{item.allowHide !== false ? <Button variant="ghost" size="sm" onClick={() => toggleHidden(item.path)}><EyeOff className="h-4 w-4" />Ocultar</Button> : null}</div></div>)}</div></div><div className="theme-surface-soft rounded-3xl border p-5"><div className="text-sm font-semibold app-text">Ocultos</div><div className="mt-4 space-y-2">{hiddenItems.length === 0 ? <div className="text-sm app-text-muted">No tienes accesos ocultos.</div> : hiddenItems.map((item) => <div key={item.path} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"><div className="font-medium app-text">{item.label}</div><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => toggleHidden(item.path)}>Mostrar</Button><Button variant="ghost" size="sm" onClick={() => toggleFavorite(item.path)}><Star className="h-4 w-4" />Priorizar</Button></div></div>)}</div></div></div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><div className="theme-surface-soft rounded-3xl border p-5"><div className="text-sm font-semibold app-text">Vista previa desktop</div><div className="mt-4 space-y-3">{resolvedMenuPreview.visibleSections.map((section) => <div key={section.id} className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"><div className="font-medium app-text">{section.title}</div><div className="mt-2 flex flex-wrap gap-2">{section.items.map((item) => <span key={item.path} className="rounded-full border border-white/10 px-2.5 py-1 text-xs app-text-muted">{item.label}</span>)}</div></div>)}</div></div><div className="theme-surface-soft rounded-3xl border p-5"><div className="text-sm font-semibold app-text">Vista previa móvil</div><div className="mt-4 space-y-2">{resolvedMenuPreview.mobileItems.map((item, index) => <div key={item.path} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"><div className="flex h-8 w-8 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-sm font-semibold text-blue-100">{index + 1}</div><div className="min-w-0 flex-1"><div className="font-medium app-text">{item.label}</div><div className="text-sm app-text-muted">{item.description}</div></div></div>)}</div></div></div>
        </div> : null}
      </section>
    </div>
  );
};
