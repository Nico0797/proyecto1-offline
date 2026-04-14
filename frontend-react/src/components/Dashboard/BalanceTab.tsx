import React from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { useBusinessStore } from '../../store/businessStore';
import { Button } from '../ui/Button';
import {
  balanceService,
  BalanceSummary,
  BalanceMovement,
  BalanceExpenseCategory,
  BalanceBreakdownItem,
  PeriodType,
} from '../../services/balanceService';
import { PeriodSelector } from '../Balance/PeriodSelector';
import { MovementsTable } from '../Balance/MovementsTable';
import { SummaryCard } from '../Dashboard/SummaryCard';
import { TrendingUp, TrendingDown, Wallet, Lightbulb, AlertTriangle, CreditCard, ArrowRight } from 'lucide-react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { getBusinessBaseState, getBusinessPersonalizationSettings } from '../../config/businessPersonalization';
import {
  MobileFilterDrawer,
  MobileHelpDisclosure,
  MobileSummaryDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../mobile/MobileContentFirst';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

interface BalanceTabProps {
  onOpenAnalytics?: () => void;
}

export const BalanceTab: React.FC<BalanceTabProps> = ({ onOpenAnalytics }) => {
  const { activeBusiness } = useBusinessStore();
  const [period, setPeriod] = React.useState<PeriodType>('monthly');
  const [startDate, setStartDate] = React.useState(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = React.useState(() => endOfMonth(new Date()));

  const [summary, setSummary] = React.useState<BalanceSummary | null>(null);
  const [movements, setMovements] = React.useState<BalanceMovement[]>([]);
  const [expenseCategories, setExpenseCategories] = React.useState<BalanceExpenseCategory[]>([]);
  const [cashOutBreakdown, setCashOutBreakdown] = React.useState<BalanceBreakdownItem[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [fatalError, setFatalError] = React.useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [showMovements, setShowMovements] = React.useState(false);

  const currency = activeBusiness?.currency || 'COP';
  const businessBaseState = getBusinessBaseState(activeBusiness);
  const personalizationSettings = getBusinessPersonalizationSettings(activeBusiness);
  const prefersAdvancedVisibility = personalizationSettings.visibility_mode === 'advanced';
  const simplifyByDefault = !prefersAdvancedVisibility && businessBaseState.effectiveBusinessType !== 'production';

  const formatCurrency = React.useCallback((value?: number | null) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }, [currency]);

  const calculateVariation = React.useCallback((current: number, previous: number) => {
    if (!previous) return current > 0 ? 100 : 0;
    return ((current - previous) / Math.abs(previous)) * 100;
  }, []);

  React.useEffect(() => {
    if (activeBusiness && startDate && endDate) {
      loadData();
    }
  }, [activeBusiness, startDate, endDate]);

  React.useEffect(() => {
    setShowAdvanced(!simplifyByDefault);
    setShowMovements(!simplifyByDefault);
  }, [activeBusiness?.id, simplifyByDefault]);

  const loadData = async () => {
    if (!activeBusiness) return;
    setLoading(true);

    const startStr = format(startDate, 'yyyy-MM-dd');
    const endStr = format(endDate, 'yyyy-MM-dd');

    try {
      const dashboard = await balanceService.getDashboard(activeBusiness.id, startStr, endStr);
      setFatalError(null);
      setSummary(dashboard?.summary || null);
      setMovements(Array.isArray(dashboard?.movements) ? dashboard.movements : []);
      setExpenseCategories(Array.isArray(dashboard?.expenseCategories) ? dashboard.expenseCategories : []);
      setCashOutBreakdown(Array.isArray(dashboard?.cashOutBreakdown) ? dashboard.cashOutBreakdown : []);
    } catch (err) {
      console.error('Error loading balance data', err);
      setFatalError(err instanceof Error ? err.message : 'No fue posible cargar caja.');
      setSummary(null);
      setMovements([]);
      setExpenseCategories([]);
      setCashOutBreakdown([]);
    } finally {
      setLoading(false);
    }
  };

  const getInsights = () => {
    if (!summary) return [];
    const insights = [];

    if (summary.cashOut > summary.cashIn) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Caja real negativa',
        text: 'Las salidas reales superan las entradas reales del periodo. Revisa ejecución operativa, pagos pendientes y recaudo.',
      });
    }

    const operationalExpenseChange = summary.previousOperationalExpensesExecutedTotal > 0
      ? ((summary.operationalExpensesExecutedTotal - summary.previousOperationalExpensesExecutedTotal) / summary.previousOperationalExpensesExecutedTotal) * 100
      : 0;

    if (operationalExpenseChange > 10) {
      insights.push({
        type: 'warning',
        icon: TrendingDown,
        title: 'Mayor ejecución operativa',
        text: `Las salidas operativas ejecutadas subieron ${operationalExpenseChange.toFixed(1)}% frente al periodo anterior.`,
      });
    } else if (summary.salesTotal > summary.previousSalesTotal && summary.previousSalesTotal > 0) {
      insights.push({
        type: 'success',
        icon: TrendingUp,
        title: 'Crecimiento de Ventas',
        text: `¡Bien hecho! Tus ventas han aumentado un ${((summary.salesTotal - summary.previousSalesTotal) / summary.previousSalesTotal * 100).toFixed(1)}%.`,
      });
    }

    if (summary.operationalPayablesOverdueTotal > 0) {
      insights.push({
        type: 'warning',
        icon: AlertTriangle,
        title: 'Por pagar operativo vencido',
        text: `Tienes ${formatCurrency(summary.operationalPayablesOverdueTotal)} vencido en obligaciones operativas.`,
      });
    }

    if (summary.financialDebtOverdueTotal > 0) {
      insights.push({
        type: 'warning',
        icon: CreditCard,
        title: 'Deuda financiera vencida',
        text: `Tienes ${formatCurrency(summary.financialDebtOverdueTotal)} vencido en tarjetas, préstamos o créditos.`,
      });
    } else if (summary.margin > 20) {
      insights.push({
        type: 'success',
        icon: Lightbulb,
        title: 'Margen Saludable',
        text: `¡Excelente! Mantienes un margen de utilidad del ${summary.margin.toFixed(1)}%.`,
      });
    }

    return insights.slice(0, 3);
  };

  const safeExpenseCategories = Array.isArray(expenseCategories) ? expenseCategories : [];
  const safeCashOutBreakdown = Array.isArray(cashOutBreakdown) ? cashOutBreakdown : [];
  const safeMovements = Array.isArray(movements) ? movements : [];
  const insights = getInsights();
  const operationalPaymentsTotal = (summary?.supplierPaymentsTotal || 0) + (summary?.operationalObligationPaymentsTotal || 0);
  const flowHighlights = [
    {
      label: 'Entradas reales',
      value: formatCurrency(summary?.cashIn || 0),
      tone: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20',
    },
    {
      label: 'Gasto operativo',
      value: formatCurrency(summary?.operationalExpensesExecutedTotal || 0),
      tone: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20',
    },
    {
      label: 'Pagos operativos',
      value: formatCurrency(operationalPaymentsTotal),
      tone: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20',
    },
    {
      label: 'Pagos deuda financiera',
      value: formatCurrency(summary?.financialDebtPaymentsTotal || 0),
      tone: 'text-violet-700 dark:text-violet-300 bg-violet-50 dark:bg-violet-900/20',
    },
  ];
  const compactCurrency = React.useCallback((value?: number | null) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      notation: 'compact',
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(Number(value || 0));
  }, [currency]);

  const chartData = {
    labels: ['Entradas reales', 'Gasto operativo', 'Pagos operativos', 'Pagos deuda financiera', 'Flujo neto real'],
    datasets: [
      {
        label: 'Monto',
        data: [
          summary?.cashIn || 0,
          summary?.operationalExpensesExecutedTotal || 0,
          operationalPaymentsTotal,
          summary?.financialDebtPaymentsTotal || 0,
          summary?.cashNet || 0,
        ],
        backgroundColor: ['#2563eb', '#ef4444', '#f59e0b', '#7c3aed', '#0f766e'],
        borderRadius: 8,
      },
    ],
  };

  const visibleCashOutBreakdown = safeCashOutBreakdown.filter((item) => Number(item.total || 0) > 0.0001);
  const doughnutData = {
    labels: visibleCashOutBreakdown.map((item) => item.label),
    datasets: [
      {
        data: visibleCashOutBreakdown.map((item) => item.total),
        backgroundColor: ['#ef4444', '#f59e0b', '#0ea5e9', '#7c3aed', '#64748b'],
        borderWidth: 0,
      },
    ],
  };

  const hasUrgentOperationalDebt = (summary?.operationalPayablesOverdueTotal || 0) > 0;
  const hasUrgentFinancialDebt = (summary?.financialDebtOverdueTotal || 0) > 0;
  const receivablesDueSoonTotal =
    (summary?.overdueReceivables || 0) +
    (summary?.dueTodayReceivables || 0) +
    (summary?.dueSoonReceivables || 0);
  const movementPreview = safeMovements.slice(0, 5);
  const mobileBalanceControls = useMobileFilterDraft({
    value: { period, startDate, endDate, showAdvanced, showMovements },
    onApply: (nextValue) => {
      setPeriod(nextValue.period);
      setStartDate(nextValue.startDate);
      setEndDate(nextValue.endDate);
      setShowAdvanced(nextValue.showAdvanced);
      setShowMovements(nextValue.showMovements);
    },
    createEmptyValue: () => ({
      period: 'monthly' as PeriodType,
      startDate: startOfMonth(new Date()),
      endDate: endOfMonth(new Date()),
      showAdvanced: !simplifyByDefault,
      showMovements: !simplifyByDefault,
    }),
  });

  const balanceActionsContent = (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={() => setShowMovements((current) => !current)} className="flex-1 sm:flex-none">
        {showMovements ? 'Ocultar movimientos' : 'Ver movimientos'}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setShowAdvanced((current) => !current)} className="flex-1 sm:flex-none">
        {showAdvanced ? 'Ocultar detalle' : 'Ver detalle'}
      </Button>
      {onOpenAnalytics && (
        <Button size="sm" onClick={onOpenAnalytics} className="flex-1 sm:flex-none">
          Ir a análisis
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  const mobileDraftActionsContent = (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        onClick={() => mobileBalanceControls.setDraft((current) => ({ ...current, showMovements: !current.showMovements }))}
        className="flex-1"
      >
        {mobileBalanceControls.draft.showMovements ? 'Ocultar movimientos' : 'Ver movimientos'}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => mobileBalanceControls.setDraft((current) => ({ ...current, showAdvanced: !current.showAdvanced }))}
        className="flex-1"
      >
        {mobileBalanceControls.draft.showAdvanced ? 'Ocultar detalle' : 'Ver detalle'}
      </Button>
      {onOpenAnalytics && (
        <Button size="sm" onClick={onOpenAnalytics} className="w-full sm:w-auto">
          Ir a análisis
          <ArrowRight className="w-4 h-4" />
        </Button>
      )}
    </div>
  );

  const balanceControlsContent = (
    <div className="app-toolbar-stack">
      <PeriodSelector
        period={period}
        onChangePeriod={setPeriod}
        startDate={startDate}
        endDate={endDate}
        onChangeDateRange={(s, e) => {
          setStartDate(s);
          setEndDate(e);
        }}
      />

      {balanceActionsContent}
    </div>
  );

  const balanceKpiContent = (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <SummaryCard
        title="Entró"
        value={formatCurrency(summary?.cashIn || 0)}
        icon={Wallet}
        color="green"
        trend={{
          value: calculateVariation(summary?.cashIn || 0, summary?.previousCashIn || 0),
          label: 'vs periodo anterior',
        }}
      />
      <SummaryCard
        title="Salió"
        value={formatCurrency(summary?.cashOut || 0)}
        icon={TrendingDown}
        color="red"
        trend={{
          value: calculateVariation(summary?.cashOut || 0, summary?.previousCashOut || 0),
          label: 'vs periodo anterior',
        }}
      />
      <SummaryCard
        title="Neto"
        value={formatCurrency(summary?.cashNet || 0)}
        icon={Wallet}
        color={summary?.cashNet && summary.cashNet >= 0 ? 'green' : 'red'}
        trend={{
          value: calculateVariation(summary?.cashNet || 0, summary?.previousCashNet || 0),
          label: 'vs periodo anterior',
        }}
      />
      <SummaryCard
        title="Te deben"
        value={formatCurrency(summary?.accountsReceivable || 0)}
        icon={CreditCard}
        color="yellow"
        trend={{
          value: `${summary?.receivableCustomersCount || 0} cliente(s)`,
          label: receivablesDueSoonTotal > 0 ? `${formatCurrency(receivablesDueSoonTotal)} por cobrar` : 'sin saldos urgentes',
          isRaw: true,
        }}
      />
    </div>
  );

  return (
    <div className="app-content-stack animate-in fade-in slide-in-from-bottom-2 duration-300 pb-10">
      {fatalError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-200">
          Caja sigue disponible, pero ocurrió un error: {fatalError}
        </div>
      ) : null}
      <div className="dashboard-balance-desktop-stack hidden lg:flex lg:flex-col">
        <div className="app-toolbar">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-xs sm:text-sm font-semibold text-blue-600 dark:text-blue-400">Caja</div>
              <h2 className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Lo esencial del dinero del período</h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Empieza por lo simple: cuánto entró, cuánto salió, cómo quedó el neto y cuánto te deben.
              </p>
            </div>
            <div className="w-full lg:max-w-[26rem]">
              {balanceControlsContent}
            </div>
          </div>
        </div>

        {balanceKpiContent}
      </div>

      <MobileUnifiedPageShell
        utilityBar={(
          <MobileUtilityBar>
            <MobileFilterDrawer summary="Periodo y vista" {...mobileBalanceControls.sheetProps}>
              <div className="app-toolbar-stack">
                <PeriodSelector
                  period={mobileBalanceControls.draft.period}
                  onChangePeriod={(value) => mobileBalanceControls.setDraft((current) => ({ ...current, period: value }))}
                  startDate={mobileBalanceControls.draft.startDate}
                  endDate={mobileBalanceControls.draft.endDate}
                  onChangeDateRange={(s, e) => {
                    mobileBalanceControls.setDraft((current) => ({ ...current, startDate: s, endDate: e }));
                  }}
                />

                {mobileDraftActionsContent}
              </div>
            </MobileFilterDrawer>
            <MobileSummaryDrawer summary="Resumen de caja">
              {balanceKpiContent}
            </MobileSummaryDrawer>
            <MobileHelpDisclosure summary="Cómo leer caja">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Empieza por el flujo neto y el por cobrar. Los controles de período y el detalle completo quedan disponibles sin empujar el contenido principal.
              </p>
            </MobileHelpDisclosure>
          </MobileUtilityBar>
        )}
      >
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="app-surface rounded-[28px] p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Flujo neto del período</h3>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(summary?.cashNet || 0)}
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-between">
                  <span>Entradas reales</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(summary?.cashIn || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Cobro neto de facturas</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(summary?.invoiceNetCollectionsTotal || summary?.invoicePaymentsTotal || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Reembolsos y reversiones</span>
                  <span>{formatCurrency((summary?.invoiceRefundsTotal || 0) + (summary?.invoiceReversalsTotal || 0))}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Salidas reales</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(summary?.cashOut || 0)}</span>
                </div>
                <div className="flex items-center justify-between border-t border-gray-200 pt-2 text-gray-900 dark:border-gray-800 dark:text-white">
                  <span className="font-medium">Neto</span>
                  <span className="font-bold">{formatCurrency(summary?.cashNet || 0)}</span>
                </div>
              </div>
            </div>

            <div className="app-surface rounded-[28px] p-6 shadow-sm">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Por cobrar al cierre</h3>
              <div className="mt-2 flex items-end gap-2">
                <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {formatCurrency(summary?.accountsReceivable || 0)}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center justify-between">
                  <span>Vencido</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">{formatCurrency(summary?.overdueReceivables || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Vence hoy</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{formatCurrency(summary?.dueTodayReceivables || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Por vencer</span>
                  <span className="font-semibold text-blue-600 dark:text-blue-400">{formatCurrency(summary?.dueSoonReceivables || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Clientes con saldo</span>
                  <span>{summary?.receivableCustomersCount || 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Ventas a crédito</span>
                  <span>{formatCurrency(summary?.salesAccountsReceivable || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Facturas</span>
                  <span>{formatCurrency(summary?.invoiceAccountsReceivable || 0)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Recaudo de facturas</span>
                  <span>{Number(summary?.invoiceCollectionRate || 0).toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Cobro bruto facturas</span>
                  <span>{formatCurrency(summary?.invoiceGrossCollectionsTotal || 0)}</span>
                </div>
              </div>
            </div>
          </div>

          {(hasUrgentOperationalDebt || hasUrgentFinancialDebt || (summary?.dueTodayReceivables || 0) > 0) && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {hasUrgentOperationalDebt && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/30 dark:bg-amber-900/10">
                  <div className="text-sm font-semibold text-amber-900 dark:text-amber-100">Por pagar operativo vencido</div>
                  <div className="mt-1 text-lg font-bold text-amber-900 dark:text-white">{formatCurrency(summary?.operationalPayablesOverdueTotal || 0)}</div>
                  <div className="mt-1 text-xs text-amber-700 dark:text-amber-200">Sigue existiendo, pero ya no domina la pantalla inicial.</div>
                </div>
              )}
              {hasUrgentFinancialDebt && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-900/10">
                  <div className="text-sm font-semibold text-red-900 dark:text-red-100">Deuda financiera vencida</div>
                  <div className="mt-1 text-lg font-bold text-red-900 dark:text-white">{formatCurrency(summary?.financialDebtOverdueTotal || 0)}</div>
                  <div className="mt-1 text-xs text-red-700 dark:text-red-200">Puedes ver el detalle completo cuando lo necesites.</div>
                </div>
              )}
              {(summary?.dueTodayReceivables || 0) > 0 && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                  <div className="text-sm font-semibold text-blue-900 dark:text-blue-100">Cobros que vencen hoy</div>
                  <div className="mt-1 text-lg font-bold text-blue-900 dark:text-white">{formatCurrency(summary?.dueTodayReceivables || 0)}</div>
                  <div className="mt-1 text-xs text-blue-700 dark:text-blue-200">Útil para priorizar recaudo sin abrir análisis.</div>
                </div>
              )}
            </div>
          )}
        </>
      </MobileUnifiedPageShell>

      {showMovements && (
        <div className="app-surface rounded-2xl p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Movimientos del período</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Primero te mostramos el historial porque suele ser lo más útil para revisar el día a día.
              </p>
            </div>
            {movementPreview.length > 0 && (
              <div className="space-y-2">
                {movementPreview.map((movement) => (
                  <div key={movement.id} className="app-muted-panel flex items-center justify-between rounded-xl px-3 py-3 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-gray-900 dark:text-white">{movement.description}</div>
                      <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                        {movement.date} {movement.category ? `• ${movement.category}` : ''}
                      </div>
                    </div>
                    <div className={movement.type === 'income' ? 'font-semibold text-green-600 dark:text-green-400' : 'font-semibold text-red-600 dark:text-red-400'}>
                      {movement.type === 'income' ? '+' : '-'}{formatCurrency(movement.amount)}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <MovementsTable movements={safeMovements} loading={loading} currency={currency} />
          </div>
        </div>
      )}

      {showAdvanced && (
        <>
          {insights.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {insights.map((insight, idx) => (
                <div
                  key={`${insight.title}-${idx}`}
                  className={`flex gap-3 rounded-xl border p-4 ${
                    insight.type === 'warning'
                      ? 'border-red-100 bg-red-50 dark:border-red-800 dark:bg-red-900/20'
                      : insight.type === 'success'
                        ? 'border-green-100 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                        : 'border-blue-100 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
                  }`}
                >
                  <div
                    className={`h-fit rounded-lg p-2 ${
                      insight.type === 'warning'
                        ? 'bg-red-100 text-red-600 dark:bg-red-800 dark:text-red-200'
                        : insight.type === 'success'
                          ? 'bg-green-100 text-green-600 dark:bg-green-800 dark:text-green-200'
                          : 'bg-blue-100 text-blue-600 dark:bg-blue-800 dark:text-blue-200'
                    }`}
                  >
                    <insight.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4
                      className={`text-sm font-bold ${
                        insight.type === 'warning'
                          ? 'text-red-800 dark:text-red-200'
                          : insight.type === 'success'
                            ? 'text-green-800 dark:text-green-200'
                            : 'text-blue-800 dark:text-blue-200'
                      }`}
                    >
                      {insight.title}
                    </h4>
                    <p
                      className={`mt-1 text-xs ${
                        insight.type === 'warning'
                          ? 'text-red-600 dark:text-red-300'
                          : insight.type === 'success'
                            ? 'text-green-600 dark:text-green-300'
                            : 'text-blue-600 dark:text-blue-300'
                      }`}
                    >
                      {insight.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3" data-tour="dashboard.balance.summary">
            <div className="min-w-0 space-y-6 lg:col-span-2">
              <div className="app-surface overflow-hidden rounded-2xl p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="max-w-2xl">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Flujo real del período</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        El gráfico y el historial usan el mismo corte: entradas reales, gasto operativo, pagos operativos y deuda financiera.
                      </p>
                    </div>
                    <div className="app-chip inline-flex self-start rounded-full px-3 py-1 text-xs font-medium">
                      Neto real: {formatCurrency(summary?.cashNet || 0)}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {flowHighlights.map((item) => (
                      <div key={item.label} className={`rounded-xl px-3 py-3 ${item.tone}`}>
                        <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">{item.label}</div>
                        <div className="mt-1 text-sm font-bold sm:text-base">{item.value}</div>
                      </div>
                    ))}
                  </div>

                  <div className="app-muted-panel rounded-2xl px-3 py-4 sm:px-4">
                    <div className="h-[320px] sm:h-[360px]">
                      <Bar
                        data={chartData}
                        options={{
                          indexAxis: 'y',
                          responsive: true,
                          maintainAspectRatio: false,
                          layout: { padding: { left: 4, right: 12, top: 4, bottom: 4 } },
                          plugins: {
                            legend: { display: false },
                            tooltip: {
                              callbacks: {
                                label: (context) => compactCurrency(Number(context.parsed.x || 0)),
                              },
                            },
                          },
                          scales: {
                            x: {
                              grid: { color: 'rgba(148, 163, 184, 0.18)' },
                              ticks: {
                                maxTicksLimit: 5,
                                callback: (value) => compactCurrency(Number(value)),
                              },
                            },
                            y: {
                              grid: { display: false },
                              ticks: {
                                font: { size: 11 },
                              },
                            },
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="app-surface rounded-xl p-6">
                <h3 className="mb-2 font-semibold text-gray-900 dark:text-white">Composición de salidas reales</h3>
                <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                  No mezcla gasto operativo ejecutado con pagos a proveedores ni deuda financiera.
                </p>
                <div className="relative h-64">
                  {visibleCashOutBreakdown.length > 0 ? (
                    <Doughnut
                      data={doughnutData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '70%',
                        plugins: { legend: { position: 'bottom', labels: { boxWidth: 10 } } },
                      }}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-400">
                      Sin salidas reales registradas
                    </div>
                  )}
                </div>
                {safeExpenseCategories.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-gray-200 pt-4 dark:border-gray-800">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Categorías del gasto operativo ejecutado
                    </div>
                    <div className="space-y-2">
                      {safeExpenseCategories.slice(0, 5).map((item, index) => (
                        <div key={`${item.key}-${index}`} className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-300">{item.category}</span>
                          <span className="font-medium text-gray-900 dark:text-white">{formatCurrency(item.total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
