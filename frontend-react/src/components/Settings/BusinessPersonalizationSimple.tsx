import { useEffect, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  ChevronDown,
  ChevronUp,
  Layers3,
  RotateCcw,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button';
import { useAccess } from '../../hooks/useAccess';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { useNavigationPreferences } from '../../store/navigationPreferences.store';
import {
  buildPersonalizationSettingsPatch,
  getBusinessNavigationDefaults,
  getBusinessPersonalizationSettings,
  resolveBusinessType,
  type BusinessTypeKey,
} from '../../config/businessPersonalizationCompat';
import { applyBusinessTypeConfiguration } from '../../config/businessPresetApplication';
import { buildOperationalProfileFromPreset } from '../../config/businessPresets';
import {
  buildNavigationVisibilityForPreset,
  getBusinessTypeFromPresetKey,
  getBusinessPresetFromType,
  getGranularPresetChoices,
  getModulesByCategory,
  getVisibleModulesFromBusiness,
  resolveSimpleBusinessTypeFromBusiness,
  type BusinessVisibilityId,
} from '../../config/businessOnboardingPresets';
import type { BusinessCommercialSectionsState } from '../../config/businessPersonalizationCompat';
import type { BusinessOperationalProfile } from '../../config/businessOperationalProfile';
import { isBusinessModuleEnabled, type BusinessType } from '../../types';
import { isBackendPathSupported } from '../../config/backendCapabilities';
import { cn } from '../../utils/cn';
import { resolveCustomizableNavigationItems } from '../../navigation/navigationPersonalization';

const TYPE_OPTIONS: Array<{ id: BusinessType; title: string; description: string }> = [
  { id: 'retail', title: 'Productos', description: 'Para ventas de productos, stock y pedidos.' },
  { id: 'services', title: 'Servicios', description: 'Para agenda, atencion, cobros y clientes.' },
  { id: 'hybrid', title: 'Ambos', description: 'Combina productos y servicios en la misma operacion.' },
];

const categoryTitles: Record<'operations' | 'finance' | 'catalogs', { title: string; description: string }> = {
  operations: { title: 'Operacion', description: 'Lo que usas para vender y atender.' },
  finance: { title: 'Finanzas', description: 'Caja, gastos, facturas y reportes.' },
  catalogs: { title: 'Catalogos', description: 'Lo que ofreces y mantienes visible.' },
};

const BOTTOM_BAR_SLOT_LABELS = ['Izquierda 1', 'Izquierda 2', 'Principal', 'Derecha'] as const;
const BOTTOM_BAR_SLOT_COUNT = 4;

const dedupePaths = (paths: string[]) => Array.from(new Set(paths.filter(Boolean)));

const buildBottomBarPaths = (paths: string[], availablePaths: string[]) => {
  const normalized = dedupePaths(paths).filter((path) => availablePaths.includes(path));
  const remainder = availablePaths.filter((path) => !normalized.includes(path));
  return [...normalized, ...remainder].slice(0, BOTTOM_BAR_SLOT_COUNT);
};

const getHiddenReason = (path: string) => {
  if (path === '/agenda') return 'Activa Agenda en modulos activos para usarla en la barra inferior.';
  if (path === '/orders') return 'Activa Pedidos en modulos activos para usarlo en la barra inferior.';
  if (path === '/invoices') return 'Activa Facturas en modulos activos para mostrarla en la barra inferior.';
  if (path === '/reports') return 'Activa Reportes en modulos activos para mostrarlo en la barra inferior.';
  if (path === '/products') return 'Activa Productos en modulos activos para mostrarlo en la barra inferior.';
  if (path === '/sales') return 'Activa Ventas en modulos activos para mostrarla en la barra inferior.';
  if (path === '/customers') return 'Activa Clientes en modulos activos para mostrarlo en la barra inferior.';
  if (path === '/expenses') return 'Activa Gastos en modulos activos para usarlo en la barra inferior.';
  if (path === '/treasury') return 'Activa Caja / Tesoreria en modulos activos para usarla en la barra inferior.';
  return 'Este modulo esta oculto por configuracion. Activalo arriba para usarlo en la barra inferior.';
};

export const BusinessPersonalizationSimple = () => {
  const { user } = useAuthStore();
  const { activeBusiness, updateBusiness, updateBusinessModules } = useBusinessStore();
  const { getScopeKey, setPreferences, preferencesByScope } = useNavigationPreferences();
  const { hasPermission, canAccess } = useAccess();

  const [selectedType, setSelectedType] = useState<BusinessType>('retail');
  const [selectedPresetKey, setSelectedPresetKey] = useState<BusinessTypeKey>('simple_store');
  const [visibleModules, setVisibleModules] = useState<BusinessVisibilityId[]>([]);
  const [bottomBarPaths, setBottomBarPaths] = useState<string[]>([]);
  const [activeBottomSlot, setActiveBottomSlot] = useState<number>(2);
  const [saving, setSaving] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const scopeKey = useMemo(() => getScopeKey(user?.id, activeBusiness?.id), [activeBusiness?.id, getScopeKey, user?.id]);
  const currentStoredPreferences = preferencesByScope[scopeKey] || null;
  const currentPersonalization = useMemo(() => getBusinessPersonalizationSettings(activeBusiness), [activeBusiness]);
  const currentNavigationDefaults = useMemo(() => getBusinessNavigationDefaults(activeBusiness), [activeBusiness]);
  const granularPresetChoices = useMemo(() => getGranularPresetChoices(), []);

  useEffect(() => {
    if (!activeBusiness) return;
    setSelectedType(resolveSimpleBusinessTypeFromBusiness(activeBusiness));
    setSelectedPresetKey(resolveBusinessType(activeBusiness));
    setVisibleModules(getVisibleModulesFromBusiness(activeBusiness));
  }, [activeBusiness]);

  const preset = useMemo(
    () => getBusinessPresetFromType(selectedType, { visibleModules, granularPresetKey: selectedPresetKey }),
    [selectedPresetKey, selectedType, visibleModules],
  );

  const groupedOptions = useMemo(
    () =>
      (['operations', 'finance', 'catalogs'] as const).map((category) => ({
        category,
        ...categoryTitles[category],
        items: getModulesByCategory(category),
      })),
    [],
  );

  const currentType = useMemo(
    () => (activeBusiness ? resolveSimpleBusinessTypeFromBusiness(activeBusiness) : 'retail'),
    [activeBusiness],
  );
  const currentPresetKey = useMemo(
    () => (activeBusiness ? resolveBusinessType(activeBusiness) : 'simple_store'),
    [activeBusiness],
  );
  const currentVisibleModules = useMemo(
    () => (activeBusiness ? getVisibleModulesFromBusiness(activeBusiness) : []),
    [activeBusiness],
  );

  const bottomBarCatalog = useMemo(() => {
    const navigationItems = resolveCustomizableNavigationItems({
      business: activeBusiness,
      hasPermission,
      hasModule: (moduleKey) => {
        if (!moduleKey) return true;
        return isBusinessModuleEnabled(activeBusiness?.modules, moduleKey);
      },
      canAccessFeature: canAccess,
      businessTypeOverride: selectedType,
      includeHelp: false,
      includeSettings: false,
    });

    const hiddenPaths = new Set(buildNavigationVisibilityForPreset(selectedType, visibleModules, currentNavigationDefaults).hidden_paths);

    return navigationItems
      .filter((item) => item.allowFavorite !== false)
      .filter((item) => isBackendPathSupported(item.path))
      .map((item) => ({
        ...item,
        disabled: item.allowHide !== false && hiddenPaths.has(item.path),
        disabledReason: item.allowHide !== false && hiddenPaths.has(item.path) ? getHiddenReason(item.path) : '',
      }));
  }, [activeBusiness, canAccess, currentNavigationDefaults, hasPermission, selectedType, visibleModules]);

  const bottomBarEnabledOptions = useMemo(
    () => bottomBarCatalog.filter((item) => !item.disabled),
    [bottomBarCatalog],
  );

  const bottomBarOptionPaths = useMemo(() => bottomBarEnabledOptions.map((item) => item.path), [bottomBarEnabledOptions]);

  const currentBottomBarOptions = useMemo(() => {
    const hiddenPaths = new Set(buildNavigationVisibilityForPreset(currentType, currentVisibleModules, currentNavigationDefaults).hidden_paths);

    return resolveCustomizableNavigationItems({
      business: activeBusiness,
      hasPermission,
      hasModule: (moduleKey) => {
        if (!moduleKey) return true;
        return isBusinessModuleEnabled(activeBusiness?.modules, moduleKey);
      },
      canAccessFeature: canAccess,
      businessTypeOverride: currentType,
      includeHelp: false,
      includeSettings: false,
    }).filter((item) => item.allowFavorite !== false && (item.allowHide === false || !hiddenPaths.has(item.path)));
  }, [activeBusiness, canAccess, currentNavigationDefaults, currentType, currentVisibleModules, hasPermission]);

  const currentBottomBarPaths = useMemo(() => {
    const currentAvailablePaths = currentBottomBarOptions.map((item) => item.path);
    const sourcePaths = currentStoredPreferences?.favoritePaths
      || currentNavigationDefaults?.favorite_paths
      || getBusinessPresetFromType(currentType, { granularPresetKey: currentPresetKey }).recommendedShortcuts;
    return buildBottomBarPaths(sourcePaths, currentAvailablePaths);
  }, [currentBottomBarOptions, currentNavigationDefaults?.favorite_paths, currentPresetKey, currentStoredPreferences?.favoritePaths, currentType]);

  useEffect(() => {
    if (!activeBusiness) return;
    setBottomBarPaths(currentBottomBarPaths);
  }, [activeBusiness?.id, currentBottomBarPaths]);

  useEffect(() => {
    setBottomBarPaths((current) => buildBottomBarPaths(current, bottomBarOptionPaths));
    setActiveBottomSlot((current) => Math.min(current, Math.max(0, BOTTOM_BAR_SLOT_COUNT - 1)));
  }, [bottomBarOptionPaths]);

  const hasChanges = useMemo(() => {
    const normalizedCurrentVisible = [...currentVisibleModules].sort().join('|');
    const normalizedNextVisible = [...visibleModules].sort().join('|');
    const normalizedCurrentBottomBar = currentBottomBarPaths.join('|');
    const normalizedNextBottomBar = buildBottomBarPaths(bottomBarPaths, bottomBarOptionPaths).join('|');

    return currentType !== selectedType
      || currentPresetKey !== selectedPresetKey
      || normalizedCurrentVisible !== normalizedNextVisible
      || normalizedCurrentBottomBar !== normalizedNextBottomBar;
  }, [bottomBarOptionPaths, bottomBarPaths, currentBottomBarPaths, currentPresetKey, currentType, currentVisibleModules, selectedPresetKey, selectedType, visibleModules]);

  const toggleVisibility = (id: BusinessVisibilityId) => {
    setVisibleModules((current) =>
      current.includes(id) ? current.filter((moduleId) => moduleId !== id) : [...current, id],
    );
  };

  const restoreRecommended = () => {
    const nextPreset = getBusinessPresetFromType(selectedType, { granularPresetKey: selectedPresetKey });
    setVisibleModules(nextPreset.visibleModules);
    setBottomBarPaths(buildBottomBarPaths(nextPreset.recommendedShortcuts, bottomBarOptionPaths));
  };

  const assignBottomBarPath = (slotIndex: number, path: string) => {
    setBottomBarPaths((current) => {
      const next = [...buildBottomBarPaths(current, bottomBarOptionPaths)];
      const existingIndex = next.indexOf(path);
      if (existingIndex >= 0) {
        next[existingIndex] = next[slotIndex];
      }
      next[slotIndex] = path;
      return buildBottomBarPaths(next, bottomBarOptionPaths);
    });
  };

  const handlePresetChange = (presetKey: BusinessTypeKey) => {
    const operationalType = getBusinessTypeFromPresetKey(presetKey);
    const nextPreset = getBusinessPresetFromType(operationalType, { granularPresetKey: presetKey });
    setSelectedPresetKey(presetKey);
    setSelectedType(operationalType);
    setVisibleModules(nextPreset.visibleModules);
    setBottomBarPaths(buildBottomBarPaths(nextPreset.recommendedShortcuts, bottomBarOptionPaths));
  };

  const handleTypeChange = (businessType: BusinessType) => {
    const nextPreset = getBusinessPresetFromType(businessType, { granularPresetKey: selectedPresetKey });
    setSelectedType(businessType);
    setVisibleModules(nextPreset.visibleModules);
    setBottomBarPaths((current) => buildBottomBarPaths(current, bottomBarOptionPaths.length ? bottomBarOptionPaths : nextPreset.recommendedShortcuts));
  };

  const handleSave = async () => {
    if (!activeBusiness) return;

    try {
      setSaving(true);
      const timestamp = new Date().toISOString();
      const sanitizedBottomBarPaths = buildBottomBarPaths(bottomBarPaths, bottomBarOptionPaths);
      const navigationVisibility = buildNavigationVisibilityForPreset(selectedType, visibleModules, currentNavigationDefaults);
      const hiddenPaths = navigationVisibility.hidden_paths.filter((path) => !sanitizedBottomBarPaths.includes(path));

      await applyBusinessTypeConfiguration({
        business: activeBusiness,
        businessType: selectedPresetKey,
        simpleBusinessType: selectedType,
        recommendedModules: preset.enabledBusinessModules,
        commercialSections: preset.commercialSections as BusinessCommercialSectionsState,
        currentNavigationPreferences: currentStoredPreferences,
        navigationMode: 'replace',
        operationalProfile: buildOperationalProfileFromPreset(preset.granularPreset) as unknown as BusinessOperationalProfile,
        prioritizedPath: sanitizedBottomBarPaths[2] || sanitizedBottomBarPaths[0] || preset.granularPreset.prioritizedPath || null,
        setNavigationPreferences: (preferences) => setPreferences(scopeKey, preferences),
        updateBusiness,
        updateBusinessModules,
        visibilityMode: preset.granularPreset.simplicityLevel === 'simple' ? 'basic' : 'advanced',
      });

      const nextSettings = buildPersonalizationSettingsPatch(activeBusiness.settings || {}, {
        ...currentPersonalization,
        business_type: selectedPresetKey,
        simple_business_type: selectedType,
        commercial_sections: preset.commercialSections,
        navigation_defaults: {
          business_type: preset.granularPresetKey,
          favorite_paths: sanitizedBottomBarPaths,
          hidden_paths: hiddenPaths,
          prioritized_path: sanitizedBottomBarPaths[2] || sanitizedBottomBarPaths[0] || preset.granularPreset.prioritizedPath || null,
          last_applied_at: timestamp,
        },
        onboarding: {
          ...currentPersonalization.onboarding,
          completed: true,
          skipped: false,
          last_updated_at: timestamp,
          answers: currentPersonalization.onboarding.answers,
        },
      });

      await updateBusiness(activeBusiness.id, { settings: nextSettings });
      setPreferences(scopeKey, {
        favoritePaths: sanitizedBottomBarPaths,
        hiddenPaths,
      });
      toast.success('La personalizacion quedo actualizada.');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible guardar la personalizacion.');
    } finally {
      setSaving(false);
    }
  };

  if (!activeBusiness) {
    return (
      <div className="app-surface max-w-4xl rounded-[24px] p-6">
        <h3 className="text-xl font-semibold app-text">Personalizacion del negocio</h3>
        <p className="mt-2 text-sm app-text-muted">Selecciona un negocio para ajustar su base recomendada.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-4" data-tour="settings.personalization.panel">
      <section className="app-surface rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">
              <Layers3 className="h-3.5 w-3.5" />
              Preset del negocio
            </div>
            <h2 className="mt-3 text-2xl font-semibold app-text">Mantén tu tipo real de negocio</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 app-text-muted">
              El preset define la base del negocio. El modo operativo se ajusta aparte y no reemplaza estas opciones.
            </p>
          </div>
          <Button variant="secondary" onClick={restoreRecommended} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            Restaurar recomendados
          </Button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {granularPresetChoices.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => handlePresetChange(option.key)}
              className={cn(
                'rounded-3xl border p-4 text-left transition-all',
                selectedPresetKey === option.key ? 'border-blue-500/35 bg-blue-500/[0.08]' : 'theme-surface-soft',
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn('flex h-5 w-5 items-center justify-center rounded-full border', selectedPresetKey === option.key ? 'border-blue-400 bg-blue-500/20' : 'border-[color:var(--app-border)]')}>
                  {selectedPresetKey === option.key ? <Sparkles className="h-3.5 w-3.5 text-blue-700 dark:text-blue-100" /> : null}
                </div>
                <div className="font-semibold app-text">{option.title}</div>
              </div>
              <p className="mt-2 text-sm app-text-muted">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="app-surface rounded-[28px] p-5 sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">
          <BriefcaseBusiness className="h-3.5 w-3.5" />
          Modo operativo
        </div>
        <h2 className="mt-3 text-2xl font-semibold app-text">Productos, servicios o ambos</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 app-text-muted">
          Esto controla Agenda, Pedidos y la visibilidad inicial. No elimina datos ni reemplaza tu preset real.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {TYPE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleTypeChange(option.id)}
              className={cn(
                'rounded-3xl border p-4 text-left transition-all',
                selectedType === option.id ? 'border-blue-500/35 bg-blue-500/[0.08]' : 'theme-surface-soft',
              )}
            >
              <div className="flex items-center gap-2">
                <div className={cn('flex h-5 w-5 items-center justify-center rounded-full border', selectedType === option.id ? 'border-blue-400 bg-blue-500/20' : 'border-[color:var(--app-border)]')}>
                  {selectedType === option.id ? <Sparkles className="h-3.5 w-3.5 text-blue-700 dark:text-blue-100" /> : null}
                </div>
                <div className="font-semibold app-text">{option.title}</div>
              </div>
              <p className="mt-2 text-sm app-text-muted">{option.description}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="app-surface rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-xl font-semibold app-text">Modulos activos</h3>
            <p className="mt-1 text-sm app-text-muted">Agrupados para que puedas dejar visible solo lo que realmente usas.</p>
          </div>
          <div className="text-sm app-text-muted">{visibleModules.length} visibles</div>
        </div>

        <div className="mt-5 space-y-4">
          {groupedOptions.map((group) => (
            <div key={group.category} className="theme-surface-soft rounded-3xl border p-4 sm:p-5">
              <h4 className="text-base font-semibold app-text">{group.title}</h4>
              <p className="mt-1 text-sm app-text-muted">{group.description}</p>
              <div className="mt-4 space-y-3">
                {group.items.map((item) => {
                  const active = visibleModules.includes(item.id);
                  const locked = item.id === 'agenda' && selectedType === 'retail';
                  const hiddenByType = item.id === 'orders' && selectedType === 'services';
                  return (
                    <div key={item.id} className={cn('rounded-2xl border px-4 py-4', active ? 'border-blue-500/25 bg-blue-500/[0.06]' : 'theme-surface-muted')}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold app-text">{item.label}</div>
                          <p className="mt-1 text-sm app-text-muted">{item.description}</p>
                          {locked ? <div className="mt-2 text-xs text-amber-600 dark:text-amber-200">Este acceso no aplica por defecto para una operacion de productos.</div> : null}
                          {hiddenByType ? <div className="mt-2 text-xs text-amber-600 dark:text-amber-200">Pedidos queda oculto por defecto en servicios.</div> : null}
                        </div>
                        <Button variant={active ? 'secondary' : 'outline'} onClick={() => toggleVisibility(item.id)} disabled={saving || locked}>
                          {active ? 'Visible' : 'Oculto'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="app-surface rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] app-text-muted">
              <Smartphone className="h-3.5 w-3.5" />
              Barra inferior
            </div>
            <h3 className="mt-3 text-xl font-semibold app-text">Edita la barra inferior sin enredos</h3>
            <p className="mt-1 text-sm app-text-muted">Toca una posicion y luego elige el modulo. El centro es el boton principal. “Mas” siempre queda fijo.</p>
          </div>
          <Button variant="secondary" onClick={() => setBottomBarPaths(buildBottomBarPaths(preset.recommendedShortcuts, bottomBarOptionPaths))} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            Restaurar barra recomendada
          </Button>
        </div>

        <div className="mt-5 rounded-[28px] border border-[color:var(--app-border)] bg-[color:var(--app-canvas)] px-4 pb-4 pt-5">
          <div className="mx-auto max-w-sm">
            <div className="grid grid-cols-5 items-end gap-2 rounded-[1.65rem] border app-divider app-page-header px-2 py-3">
              {bottomBarPaths.slice(0, 2).map((path, index) => {
                const item = bottomBarEnabledOptions.find((candidate) => candidate.path === path);
                return (
                  <button
                    key={`${path}-${index}`}
                    type="button"
                    onClick={() => setActiveBottomSlot(index)}
                    className={cn('rounded-2xl px-2 py-2 text-center transition-all', activeBottomSlot === index ? 'bg-blue-500/10 text-blue-100' : 'app-text-muted')}
                  >
                    {item ? <item.icon className="mx-auto h-4 w-4" /> : null}
                    <div className="mt-1 truncate text-[10px] font-medium">{item?.shortLabel || item?.label || 'Libre'}</div>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setActiveBottomSlot(2)}
                className={cn(
                  'mx-auto flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-full bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 text-white ring-4 ring-[color:var(--app-canvas)] shadow-[0_16px_28px_-18px_rgba(29,78,216,0.42)] transition-all',
                  activeBottomSlot === 2 ? 'scale-[1.02]' : '',
                )}
              >
                    {bottomBarEnabledOptions.find((item) => item.path === bottomBarPaths[2]) ? (
                      (() => {
                    const item = bottomBarEnabledOptions.find((candidate) => candidate.path === bottomBarPaths[2]);
                    if (!item) return null;
                    return <item.icon className="h-5 w-5" />;
                  })()
                ) : null}
              </button>

              {bottomBarPaths.slice(3, 4).map((path, offset) => {
                const slotIndex = offset + 3;
                const item = bottomBarEnabledOptions.find((candidate) => candidate.path === path);
                return (
                  <button
                    key={`${path}-${slotIndex}`}
                    type="button"
                    onClick={() => setActiveBottomSlot(slotIndex)}
                    className={cn('rounded-2xl px-2 py-2 text-center transition-all', activeBottomSlot === slotIndex ? 'bg-blue-500/10 text-blue-100' : 'app-text-muted')}
                  >
                    {item ? <item.icon className="mx-auto h-4 w-4" /> : null}
                    <div className="mt-1 truncate text-[10px] font-medium">{item?.shortLabel || item?.label || 'Libre'}</div>
                  </button>
                );
              })}

              <div className="rounded-2xl px-2 py-2 text-center app-text-muted">
                <div className="mx-auto flex h-4 w-4 items-center justify-center text-xs font-semibold">⋯</div>
                <div className="mt-1 truncate text-[10px] font-medium">Mas</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BOTTOM_BAR_SLOT_LABELS.map((label, index) => {
            const item = bottomBarEnabledOptions.find((candidate) => candidate.path === bottomBarPaths[index]);
            return (
              <button
                key={label}
                type="button"
                onClick={() => setActiveBottomSlot(index)}
                className={cn(
                  'rounded-2xl border px-3 py-3 text-left transition-all',
                  activeBottomSlot === index ? 'border-blue-500/35 bg-blue-500/[0.08]' : 'theme-surface-soft',
                )}
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] app-text-muted">{label}</div>
                <div className="mt-1 text-sm font-semibold app-text">{item?.label || 'Sin modulo'}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-sm font-semibold app-text">Elegir para {BOTTOM_BAR_SLOT_LABELS[activeBottomSlot]}</div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {bottomBarCatalog.map((item) => {
              const selected = bottomBarPaths[activeBottomSlot] === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    if (item.disabled) return;
                    assignBottomBarPath(activeBottomSlot, item.path);
                  }}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all',
                    item.disabled
                      ? 'border-dashed opacity-60 theme-surface-soft'
                      : selected ? 'border-blue-500/35 bg-blue-500/[0.08]' : 'theme-surface-soft',
                  )}
                  disabled={item.disabled}
                >
                  <div className={cn('mt-0.5 rounded-xl border p-2', item.disabled ? 'border-[color:var(--app-border)] app-text-muted' : selected ? 'border-blue-500/25 bg-blue-500/10 text-blue-100' : 'border-[color:var(--app-border)] app-text-muted')}>
                    <item.icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold app-text">{item.label}</div>
                    <p className="mt-1 text-sm app-text-muted">{item.description}</p>
                    {item.disabled ? <p className="mt-1 text-xs text-amber-600 dark:text-amber-200">{item.disabledReason}</p> : null}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="app-surface rounded-[28px] p-5 sm:p-6">
        <button
          type="button"
          onClick={() => setAdvancedOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-4 text-left"
        >
          <div>
            <h3 className="text-xl font-semibold app-text">Opciones avanzadas</h3>
            <p className="mt-1 text-sm app-text-muted">Solo para recordar la estructura interna. Cambiar base o modo no borra ventas, pedidos, agenda ni historial.</p>
          </div>
          {advancedOpen ? <ChevronUp className="h-5 w-5 app-text-muted" /> : <ChevronDown className="h-5 w-5 app-text-muted" />}
        </button>

        {advancedOpen ? (
          <div className="mt-5 space-y-4 border-t border-[color:var(--app-border)] pt-5">
            <div className="theme-surface-soft rounded-3xl border p-4">
              <div className="text-sm font-semibold app-text">Base granular conectada</div>
              <p className="mt-1 text-sm app-text-muted">
                Internamente esta seleccion usa el preset <span className="font-medium app-text">{preset.granularPreset.name}</span> con modo operativo <span className="font-medium app-text">{TYPE_OPTIONS.find((option) => option.id === selectedType)?.title || selectedType}</span>.
              </p>
            </div>
            <div className="theme-surface-soft rounded-3xl border p-4">
              <div className="text-sm font-semibold app-text">Seguridad del cambio</div>
              <p className="mt-1 text-sm app-text-muted">
                Ocultar modulos o mover botones no elimina productos, ventas, agenda, pedidos ni historial. Solo cambia visibilidad y accesos recomendados.
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || saving} isLoading={saving}>
          Guardar personalizacion
        </Button>
      </div>
    </div>
  );
};
