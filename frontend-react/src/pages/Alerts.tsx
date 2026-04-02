import type { ComponentType } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, Boxes, BriefcaseBusiness, CheckCircle2, RefreshCcw, Search, Settings2, ShieldAlert } from 'lucide-react';
import { useAlertsPreferences } from '../store/alertsPreferences.store';
import { useAlertsSnoozeStore } from '../store/alertsSnooze.store';
import { useBusinessStore } from '../store/businessStore';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardContent } from '../components/ui/Card';
import { FilterBar, FilterPeriod, FilterSearch } from '../components/ui/FilterBar';
import { useAlertsStore } from '../store/alertsStore';
import { cn } from '../utils/cn';
import { Alert, AlertCategory } from '../services/alerts.service';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { PageBody, PageHeader, PageLayout, PageStack, PageToolbarCard } from '../components/Layout/PageLayout';
import { SwipePager } from '../components/ui/SwipePager';
import {
  MobileCenteredModal,
  MobileFilterDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../components/mobile/MobileContentFirst';

const CATEGORY_ORDER: AlertCategory[] = ['operation', 'inventory', 'finance', 'configuration'];

const CATEGORY_META: Record<AlertCategory, { label: string; description: string; icon: ComponentType<any>; tone: string }> = {
  operation: {
    label: 'Operación',
    description: 'Ventas, cotizaciones y fricción comercial inmediata.',
    icon: BriefcaseBusiness,
    tone: 'text-blue-600 dark:text-blue-400',
  },
  inventory: {
    label: 'Inventario',
    description: 'Stock, bodega, costos base y preparación operativa.',
    icon: Boxes,
    tone: 'text-amber-600 dark:text-amber-400',
  },
  finance: {
    label: 'Finanzas',
    description: 'Cobros, pagos, gastos y rentabilidad accionable.',
    icon: ShieldAlert,
    tone: 'text-rose-600 dark:text-rose-400',
  },
  configuration: {
    label: 'Configuración',
    description: 'Personalización, datos del negocio y ajustes pendientes.',
    icon: Settings2,
    tone: 'text-emerald-600 dark:text-emerald-400',
  },
};

const formatDate = (value?: string) => {
  if (!value) return 'Sin fecha';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString('es-CO');
};

export const Alerts = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const { isAuthenticated } = useAuthStore();
  const prefs = useAlertsPreferences();
  const snooze = useAlertsSnoozeStore();
  const { alerts, loading, fetchAlerts } = useAlertsStore();

  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | AlertCategory>('all');
  const [onlyCritical, setOnlyCritical] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('alerts'));
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const refresh = async () => {
    if (!activeBusiness || !isAuthenticated) return;
    await fetchAlerts(activeBusiness);
  };

  useEffect(() => {
    void refresh();
  }, [
    activeBusiness?.id,
    isAuthenticated,
    prefs.preferences.arDueSoonDays,
    prefs.preferences.stockThreshold,
    prefs.preferences.recurringAheadDays,
  ]);

  const filteredAlerts = useMemo(() => {
    const now = new Date();
    return alerts.filter((alert) => {
      const status = snooze.getStatus(alert.id);
      if (status?.status === 'resolved') return false;
      if (status?.status === 'snoozed' && status.until && new Date(status.until) > now) return false;

      if (!prefs.preferences.recurring && alert.type === 'recurring') return false;
      if (!prefs.preferences.stockLow && alert.type === 'inventory') return false;
      if (!prefs.preferences.arDueSoon && alert.type === 'receivable' && alert.severity !== 'critical') return false;
      if (onlyCritical && alert.severity !== 'critical') return false;
      if (tab !== 'all' && alert.category !== tab) return false;

      if (alert.dueDate) {
        if (dateRange.start && new Date(alert.dueDate) < new Date(dateRange.start)) return false;
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          if (new Date(alert.dueDate) > endDate) return false;
        }
      }

      const searchable = `${alert.title} ${alert.description}`.toLowerCase();
      return searchable.includes(query.toLowerCase());
    });
  }, [alerts, snooze, prefs.preferences, onlyCritical, tab, query, dateRange]);

  const groupedAlerts = useMemo(() => (
    CATEGORY_ORDER.map((category) => ({
      category,
      meta: CATEGORY_META[category],
      items: filteredAlerts.filter((alert) => alert.category === category),
    }))
  ), [filteredAlerts]);

  const totalActive = filteredAlerts.length;
  const criticalCount = filteredAlerts.filter((item) => item.severity === 'critical').length;
  const snoozedCount = Object.values(snooze.entries).filter((entry) => entry.status === 'snoozed').length;
  const resolvedCount = Object.values(snooze.entries).filter((entry) => entry.status === 'resolved').length;
  const hasAlertFilters = query.trim().length > 0 || onlyCritical;
  const mobileFilterSummary = hasAlertFilters ? 'Con filtros activos' : 'Buscar y filtrar';
  const settingsSummary = snoozedCount > 0
    ? `${snoozedCount} pospuesta(s)`
    : resolvedCount > 0
      ? `${resolvedCount} revisada(s)`
      : 'Tipos y umbrales';
  const mobileAlertFilters = useMobileFilterDraft({
    value: { query, onlyCritical, dateRange },
    onApply: (nextValue) => {
      setQuery(nextValue.query);
      setOnlyCritical(nextValue.onlyCritical);
      setDateRange(nextValue.dateRange);
    },
    createEmptyValue: () => ({
      query: '',
      onlyCritical: false,
      dateRange: getPeriodPreference('alerts'),
    }),
  });

  const handleAlertAction = (alert: Alert) => {
    if (!alert.action?.path) return;
    navigate(alert.action.path);
  };

  const handleSnooze = (alert: Alert, days = 1) => {
    const until = new Date();
    until.setDate(until.getDate() + days);
    snooze.setStatus(alert.id, 'snoozed', until.toISOString().split('T')[0]);
  };

  const handleResolve = (alert: Alert) => {
    snooze.setStatus(alert.id, 'resolved');
  };

  const resetAlertPreferences = () => {
    prefs.reset();
  };

  const restoreHiddenAlerts = () => {
    snooze.clearByStatus('snoozed');
  };

  const restoreResolvedAlerts = () => {
    snooze.clearByStatus('resolved');
  };

  const resetAlertWorkspace = () => {
    prefs.reset();
    snooze.resetAll();
  };

  const alertSettingsPanel = (
    <div className="space-y-4">
      <div className="app-surface rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold app-text">Tipos visibles</h3>
            <p className="mt-1 text-xs app-text-muted">
              Muestra solo las familias de alertas que hoy sí afectan esta bandeja.
            </p>
          </div>
          <BellOff className="h-4 w-4 app-text-muted" />
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex items-start justify-between gap-3 rounded-2xl border app-divider px-3.5 py-3">
            <div>
              <div className="text-sm font-medium app-text">Cobros por vencer</div>
              <div className="mt-1 text-xs app-text-muted">Mantiene visibles las alertas preventivas de cartera próxima a vencerse.</div>
            </div>
            <input
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              type="checkbox"
              checked={prefs.preferences.arDueSoon}
              onChange={(event) => prefs.setPreferences({ arDueSoon: event.target.checked })}
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-2xl border app-divider px-3.5 py-3">
            <div>
              <div className="text-sm font-medium app-text">Gastos recurrentes</div>
              <div className="mt-1 text-xs app-text-muted">Incluye programaciones de caja y obligaciones recurrentes próximas o vencidas.</div>
            </div>
            <input
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              type="checkbox"
              checked={prefs.preferences.recurring}
              onChange={(event) => prefs.setPreferences({ recurring: event.target.checked })}
            />
          </label>

          <label className="flex items-start justify-between gap-3 rounded-2xl border app-divider px-3.5 py-3">
            <div>
              <div className="text-sm font-medium app-text">Stock e inventario</div>
              <div className="mt-1 text-xs app-text-muted">Muestra alertas de productos sin stock, bajo mínimo y bodega operativa.</div>
            </div>
            <input
              className="mt-0.5 h-4 w-4 rounded border-gray-300 dark:border-gray-600"
              type="checkbox"
              checked={prefs.preferences.stockLow}
              onChange={(event) => prefs.setPreferences({ stockLow: event.target.checked })}
            />
          </label>
        </div>
      </div>

      <div className="app-surface rounded-2xl p-4">
        <div>
          <h3 className="text-sm font-semibold app-text">Sensibilidad</h3>
          <p className="mt-1 text-xs app-text-muted">
            Ajusta ventanas y umbrales reales usados para construir la lista de alertas.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="text-xs font-medium app-text-secondary">Cobros por vencer</span>
            <Input
              type="number"
              min={1}
              value={String(prefs.preferences.arDueSoonDays)}
              onChange={(event) => prefs.setPreferences({ arDueSoonDays: Math.max(1, parseInt(event.target.value, 10) || 1) })}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium app-text-secondary">Recurrentes</span>
            <Input
              type="number"
              min={1}
              value={String(prefs.preferences.recurringAheadDays)}
              onChange={(event) => prefs.setPreferences({ recurringAheadDays: Math.max(1, parseInt(event.target.value, 10) || 1) })}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-medium app-text-secondary">Stock bajo</span>
            <Input
              type="number"
              min={0}
              value={String(prefs.preferences.stockThreshold)}
              onChange={(event) => prefs.setPreferences({ stockThreshold: Math.max(0, parseInt(event.target.value, 10) || 0) })}
            />
          </label>
        </div>
      </div>

      <div className="app-surface rounded-2xl p-4">
        <div>
          <h3 className="text-sm font-semibold app-text">Bandeja oculta y revisada</h3>
          <p className="mt-1 text-xs app-text-muted">
            Recupera alertas pospuestas o marcadas como revisadas sin salir de esta pestaña.
          </p>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border app-divider px-3.5 py-3">
            <div className="text-xs font-medium app-text-secondary">Pospuestas</div>
            <div className="mt-1 text-2xl font-semibold app-text">{snoozedCount}</div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              disabled={snoozedCount === 0}
              onClick={restoreHiddenAlerts}
            >
              Restaurar pospuestas
            </Button>
          </div>

          <div className="rounded-2xl border app-divider px-3.5 py-3">
            <div className="text-xs font-medium app-text-secondary">Revisadas</div>
            <div className="mt-1 text-2xl font-semibold app-text">{resolvedCount}</div>
            <Button
              variant="secondary"
              size="sm"
              className="mt-3 w-full"
              disabled={resolvedCount === 0}
              onClick={restoreResolvedAlerts}
            >
              Reabrir revisadas
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button variant="outline" onClick={resetAlertPreferences}>
          Restaurar preferencias
        </Button>
        <Button variant="secondary" onClick={resetAlertWorkspace}>
          Restaurar bandeja y ajustes
        </Button>
      </div>
    </div>
  );

  const legacyAlertsToolbarFields = (
    <>
      <div className="relative min-w-0 flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" placeholder="Buscar alertas..." value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="shrink-0 self-stretch lg:self-auto">
        <PeriodFilter
          moduleId="alerts"
          value={dateRange}
          onChange={setDateRange}
          iconOnly
          buttonClassName="w-full lg:w-auto"
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input
          type="checkbox"
          checked={onlyCritical}
          onChange={(event) => setOnlyCritical(event.target.checked)}
          className="rounded border-gray-300 dark:border-gray-600"
        />
        Solo críticas
      </label>
      <Button variant="secondary" onClick={refresh}>
        <RefreshCcw className="w-4 h-4" /> Refrescar
      </Button>
    </>
  );

  const legacyAlertsToolbarContent = (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      {legacyAlertsToolbarFields}
      <Button variant="outline" onClick={() => setIsSettingsOpen(true)}>
        <Settings2 className="w-4 h-4" />
        Configurar alertas
      </Button>
    </div>
  );

  const alertsToolbarFields = (
    <FilterBar
      search={(
        <FilterSearch
          value={query}
          onChange={setQuery}
          placeholder="Buscar alertas"
        />
      )}
      primary={(
        <label className="app-filter-inline-toggle">
          <input
            type="checkbox"
            checked={onlyCritical}
            onChange={(event) => setOnlyCritical(event.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Solo criticas
        </label>
      )}
      period={(
        <FilterPeriod moduleId="alerts" value={dateRange} onChange={setDateRange} />
      )}
      actions={(
        <Button variant="secondary" onClick={refresh} className="w-full lg:w-auto">
          <RefreshCcw className="w-4 h-4" /> Refrescar
        </Button>
      )}
    />
  );

  const mobileAlertsToolbarFields = (
    <FilterBar
      search={(
        <FilterSearch
          value={mobileAlertFilters.draft.query}
          onChange={(value) => mobileAlertFilters.setDraft((current) => ({ ...current, query: value }))}
          placeholder="Buscar alertas"
        />
      )}
      primary={(
        <label className="flex min-h-11 items-center gap-2 rounded-[18px] border border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] px-3.5 text-sm text-gray-600 dark:text-gray-400">
          <input
            type="checkbox"
            checked={mobileAlertFilters.draft.onlyCritical}
            onChange={(event) => mobileAlertFilters.setDraft((current) => ({ ...current, onlyCritical: event.target.checked }))}
            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          Solo críticas
        </label>
      )}
      period={(
        <FilterPeriod
          moduleId="alerts"
          value={mobileAlertFilters.draft.dateRange}
          onChange={(value) => mobileAlertFilters.setDraft((current) => ({ ...current, dateRange: value }))}
        />
      )}
      actions={(
        <Button variant="secondary" onClick={refresh} className="w-full lg:w-auto">
          <RefreshCcw className="w-4 h-4" /> Refrescar
        </Button>
      )}
    />
  );

  const alertsToolbarContent = (
    <FilterBar
      search={(
        <FilterSearch
          value={query}
          onChange={setQuery}
          placeholder="Buscar alertas"
        />
      )}
      primary={(
        <label className="app-filter-inline-toggle">
          <input
            type="checkbox"
            checked={onlyCritical}
            onChange={(event) => setOnlyCritical(event.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600"
          />
          Solo criticas
        </label>
      )}
      period={(
        <FilterPeriod moduleId="alerts" value={dateRange} onChange={setDateRange} />
      )}
      actions={[
        <Button key="refresh" variant="secondary" onClick={refresh} className="w-full lg:w-auto">
          <RefreshCcw className="w-4 h-4" /> Refrescar
        </Button>,
        <Button key="settings" variant="outline" onClick={() => setIsSettingsOpen(true)} className="w-full lg:w-auto">
          <Settings2 className="w-4 h-4" />
          Configurar alertas
        </Button>,
      ]}
    />
  );

  void legacyAlertsToolbarFields;
  void legacyAlertsToolbarContent;
  void alertsToolbarFields;

  const renderAlertSections = (sections: Array<{ category: AlertCategory; meta: { label: string; description: string; icon: ComponentType<any>; tone: string }; items: Alert[] }>) => {
    if (loading) {
      return (
        <div className="grid gap-3">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="app-surface h-24 rounded-xl animate-pulse" />
          ))}
        </div>
      );
    }

    const visibleSections = sections.filter(({ items }) => items.length > 0);

    if (visibleSections.length === 0) {
      return (
        <TeachingEmptyState
          icon={CheckCircle2}
          title="No hay alertas activas para este filtro"
          description="Cuando el sistema detecte pendientes accionables aparecerán aquí agrupados por contexto para que no tengas que revisar toda la app."
          nextStep="Puedes refrescar, ampliar el rango o ajustar la visibilidad desde Configurar alertas."
          primaryActionLabel="Refrescar alertas"
          onPrimaryAction={refresh}
          secondaryActionLabel="Configurar alertas"
          onSecondaryAction={() => setIsSettingsOpen(true)}
        />
      );
    }

    return (
      <div className="space-y-5" data-tour="alerts.list">
        {visibleSections.map(({ category, meta, items }) => {
          const SectionIcon = meta.icon;

          return (
            <section key={category} className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
                    <SectionIcon className={cn('w-5 h-5', meta.tone)} />
                    {meta.label}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{meta.description}</p>
                </div>
                <span className="app-chip rounded-full px-3 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {items.length} alerta(s)
                </span>
              </div>

              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {items.map((alert) => (
                  <Card
                    key={alert.id}
                    className={cn(
                      'app-surface border-l-4',
                      alert.severity === 'critical'
                        ? 'border-l-red-500'
                        : alert.severity === 'warning'
                          ? 'border-l-amber-500'
                          : 'border-l-blue-500'
                    )}
                  >
                    <CardContent className="space-y-4 p-5">
                      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-1 text-xs font-semibold',
                                alert.severity === 'critical'
                                  ? 'app-status-chip-danger'
                                  : alert.severity === 'warning'
                                    ? 'app-status-chip-warning'
                                    : 'app-status-chip-info'
                              )}
                            >
                              {alert.priorityLabel}
                            </span>
                            {alert.count !== undefined && (
                              <span className="app-chip rounded-full px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300">
                                {alert.count} caso(s)
                              </span>
                            )}
                          </div>
                          <h3 className="font-bold text-gray-900 dark:text-white">{alert.title}</h3>
                          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{alert.description}</p>
                        </div>
                        {alert.dueDate && (
                          <div className="text-xs text-gray-400 md:text-right">
                            <div className="uppercase tracking-wide">Fecha</div>
                            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{formatDate(alert.dueDate)}</div>
                          </div>
                        )}
                      </div>

                      <div className="app-divider flex flex-wrap items-center gap-2 border-t pt-2">
                        {alert.action && (
                          <Button onClick={() => handleAlertAction(alert)}>
                            {alert.action.label}
                          </Button>
                        )}
                        <Button variant="secondary" onClick={() => handleSnooze(alert, 1)}>
                          Posponer 24h
                        </Button>
                        <Button variant="secondary" onClick={() => handleResolve(alert)}>
                          Marcar revisada
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    );
  };

  const alertPages = [
    {
      id: 'all',
      title: 'Todas',
      icon: ShieldAlert,
      badge: totalActive,
      content: renderAlertSections(groupedAlerts),
    },
    ...CATEGORY_ORDER.map((category) => ({
      id: category,
      title: CATEGORY_META[category].label,
      icon: CATEGORY_META[category].icon,
      badge: groupedAlerts.find((group) => group.category === category)?.items.length || 0,
      content: renderAlertSections([
        {
          category,
          meta: CATEGORY_META[category],
          items: groupedAlerts.find((group) => group.category === category)?.items || [],
        },
      ]),
    })),
  ];

  return (
    <PageLayout data-tour="alerts.panel">
      <PageHeader
        title="Alertas"
        description="Detecta pendientes accionables y entra rápido al módulo correcto sin revisar toda la app."
        action={
          <div className="flex items-center gap-2">
            <span className="app-status-chip-danger">Críticas {criticalCount}</span>
            <span className="app-status-chip-info">Activas {totalActive}</span>
          </div>
        }
      />

      <PageBody>
        <PageStack>
          <div className="hidden lg:block">
            <PageToolbarCard className="app-toolbar" data-tour="alerts.filters">
              {alertsToolbarContent}
            </PageToolbarCard>
          </div>

          <MobileUnifiedPageShell
            utilityBar={(
              <MobileUtilityBar>
                <MobileFilterDrawer summary={mobileFilterSummary} {...mobileAlertFilters.sheetProps}>
                  {mobileAlertsToolbarFields}
                </MobileFilterDrawer>
                <Button variant="secondary" size="sm" className="rounded-full" onClick={() => setIsSettingsOpen(true)}>
                  <Settings2 className="w-4 h-4" />
                  Configurar
                </Button>
                <span className="inline-flex items-center rounded-full border app-divider px-3 py-2 text-xs app-text-secondary">
                  {settingsSummary}
                </span>
              </MobileUtilityBar>
            )}
          >
            <div className="min-h-0">
              <SwipePager
                activePageId={tab}
                onPageChange={(pageId) => setTab(pageId as 'all' | AlertCategory)}
                className="flex-1"
                contentScroll="visible"
                pages={alertPages}
              />
            </div>
          </MobileUnifiedPageShell>
        </PageStack>
      </PageBody>

      <MobileCenteredModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Configurar alertas"
        className="w-[min(560px,calc(100vw-32px))]"
        bodyClassName="space-y-4"
      >
        {alertSettingsPanel}
      </MobileCenteredModal>
    </PageLayout>
  );
};
