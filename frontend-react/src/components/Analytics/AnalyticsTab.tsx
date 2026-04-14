import { useState, useEffect, useCallback } from 'react';
import { format, startOfMonth, endOfMonth } from 'date-fns';

import { AnalyticsHeader } from './AnalyticsHeader';
import { KPIGrid } from './KPIGrid';
import { ChartsPanel } from './ChartsPanel';
import { InsightsPanel } from './InsightsPanel';
import { ForecastCard } from './ForecastCard';
import { HealthScorePanel } from './HealthScorePanel';
import {
  analyticsService,
  KPI,
  Insight,
  Forecast,
  HealthScore,
  AnalyticsDegradationIssue,
} from '../../services/analyticsService';
import { useBusinessStore } from '../../store/businessStore';
import { PeriodSelector } from '../Balance/PeriodSelector';
import type { PeriodType } from '../Balance/PeriodSelector';
import { ContentSection, SectionStack } from '../Layout/PageLayout';
import { isOfflineProductMode } from '../../runtime/runtimeMode';

export const AnalyticsTab = () => {
  const { activeBusiness } = useBusinessStore();
  const offlineProductMode = isOfflineProductMode();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<PeriodType>('monthly');
  const [startDate, setStartDate] = useState(() => startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(() => endOfMonth(new Date()));

  const [kpis, setKpis] = useState<KPI[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);
  const [degradationIssues, setDegradationIssues] = useState<AnalyticsDegradationIssue[]>([]);
  const [fatalError, setFatalError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!activeBusiness || !startDate || !endDate) return;

    setLoading(true);
    setFatalError(null);
    setDegradationIssues([]);

    try {
      const startDateLabel = format(startDate, 'yyyy-MM-dd');
      const endDateLabel = format(endDate, 'yyyy-MM-dd');
      const rangeDays = Math.max(
        1,
        Math.ceil(
          (new Date(`${endDateLabel}T00:00:00`).getTime() - new Date(`${startDateLabel}T00:00:00`).getTime()) /
            (1000 * 60 * 60 * 24),
        ) + 1,
      );

      const previousRangeEnd = new Date(startDate);
      previousRangeEnd.setDate(previousRangeEnd.getDate() - 1);
      const previousRangeStart = new Date(previousRangeEnd);
      previousRangeStart.setDate(previousRangeStart.getDate() - (rangeDays - 1));
      const prevStartDate = format(previousRangeStart, 'yyyy-MM-dd');
      const prevEndDate = format(previousRangeEnd, 'yyyy-MM-dd');

      const [summaryResult, kpisResult, trendResult, productsResult, expensesResult] = await Promise.allSettled([
        analyticsService.getSummary(activeBusiness.id, startDateLabel, endDateLabel),
        analyticsService.getKPIs(
          activeBusiness.id,
          { startDate: startDateLabel, endDate: endDateLabel, label: 'Current' },
          { startDate: prevStartDate, endDate: prevEndDate, label: 'Previous' },
        ),
        analyticsService.getSalesTrend(activeBusiness.id, startDateLabel, endDateLabel),
        analyticsService.getTopProducts(activeBusiness.id, startDateLabel, endDateLabel),
        analyticsService.getExpensesByCategory(activeBusiness.id, startDateLabel, endDateLabel),
      ]);

      const issues: AnalyticsDegradationIssue[] = [];

      if (summaryResult.status === 'rejected') {
        console.error('Error fetching analytics summary:', summaryResult.reason);
        issues.push({ dataset: 'sales', message: 'No fue posible calcular el resumen analitico.' });
      }

      const summary =
        summaryResult.status === 'fulfilled'
          ? summaryResult.value
          : {
              sales: { total: 0, count: 0 },
              expenses: { total: 0, count: 0 },
              costs: { total: 0, coveredSalesTotal: 0, uncoveredSalesTotal: 0, missingSalesCount: 0 },
              profit: {
                net: null,
                gross: 0,
                operatingBalance: 0,
                coverage: 'missing' as const,
                displayLabel: 'Balance Operativo',
                displayValue: 0,
              },
              degraded: true,
              issues: [],
            };

      if (summary.issues?.length) {
        issues.push(...summary.issues);
      }

      if (kpisResult.status === 'fulfilled') {
        setKpis(kpisResult.value || []);
      } else {
        console.error('Error fetching analytics KPIs:', kpisResult.reason);
        setKpis([]);
        issues.push({ dataset: 'sales', message: 'No fue posible calcular los indicadores comparativos.' });
      }

      if (trendResult.status === 'fulfilled') {
        setSalesTrend(trendResult.value?.trend || []);
      } else {
        console.error('Error fetching sales trend:', trendResult.reason);
        setSalesTrend([]);
        issues.push({ dataset: 'sales', message: 'No fue posible cargar la tendencia de ventas.' });
      }

      const products = productsResult.status === 'fulfilled' ? productsResult.value || [] : [];
      if (productsResult.status === 'fulfilled') {
        setTopProducts(products);
      } else {
        console.error('Error fetching top products:', productsResult.reason);
        setTopProducts([]);
        issues.push({ dataset: 'sales', message: 'No fue posible cargar el top de productos.' });
      }

      if (expensesResult.status === 'fulfilled') {
        setExpensesByCategory(expensesResult.value || []);
      } else {
        console.error('Error fetching expenses by category:', expensesResult.reason);
        setExpensesByCategory([]);
        issues.push({ dataset: 'expenses', message: 'No fue posible cargar la distribucion de gastos.' });
      }

      setDegradationIssues(
        offlineProductMode
          ? []
          : issues.filter(
              (issue, index, array) =>
                index === array.findIndex((item) => item.dataset === issue.dataset && item.message === issue.message),
            ),
      );

      const generatedInsights = analyticsService.generateInsights(
        kpisResult.status === 'fulfilled' ? kpisResult.value : [],
        products,
      );
      setInsights(generatedInsights);

      const today = new Date();
      const effectiveEndDate = endDate > today ? today : endDate;
      const daysElapsed = Math.max(
        1,
        Math.ceil((effectiveEndDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
      );
      const forecastData = analyticsService.calculateForecast(
        summary.sales?.total || 0,
        daysElapsed,
        rangeDays,
        summary.profit.coverage,
      );
      setForecast(forecastData);
      setHealthScore(analyticsService.buildHealthScore(summary));
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setFatalError('No fue posible preparar el analisis en este momento. Intenta de nuevo.');
      setKpis([]);
      setSalesTrend([]);
      setExpensesByCategory([]);
      setTopProducts([]);
      setInsights([]);
      setForecast(null);
      setHealthScore(null);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, endDate, offlineProductMode, startDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!activeBusiness) {
    return <div className="p-8 text-center text-gray-500">Selecciona un negocio para ver analiticas.</div>;
  }

  return (
    <SectionStack className="dashboard-analytics-shell animate-fade-in pb-12">
      <ContentSection className="dashboard-analytics-toolbar">
        <SectionStack className="dashboard-analytics-toolbar-stack">
          <PeriodSelector
            period={period}
            onChangePeriod={setPeriod}
            startDate={startDate}
            endDate={endDate}
            onChangeDateRange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
          />

          <AnalyticsHeader onRefresh={fetchData} loading={loading} />
        </SectionStack>
      </ContentSection>

      {fatalError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-200">
          {fatalError}
        </div>
      ) : null}

      {!fatalError && degradationIssues.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
          <p className="font-medium">Algunos calculos no estuvieron disponibles y se muestran los datos listos para este rango.</p>
          <ul className="mt-2 space-y-1">
            {degradationIssues.map((issue, index) => (
              <li key={`${issue.dataset}-${index}`}>
                {issue.dataset}: {issue.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <ContentSection className="dashboard-analytics-kpis">
        <KPIGrid kpis={kpis} />
      </ContentSection>

      <ContentSection className="dashboard-analytics-main">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3" data-tour="dashboard.analytics.salesChart">
          <SectionStack className="xl:col-span-2">
            <ChartsPanel
              salesTrend={salesTrend}
              expensesByCategory={expensesByCategory}
              topProducts={topProducts}
            />

            <div className="app-surface rounded-xl p-6 shadow-sm lg:rounded-[24px] lg:p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">Detalle de salud</h3>
              {healthScore && <HealthScorePanel score={healthScore} />}
            </div>
          </SectionStack>

          <SectionStack>
            {forecast && <ForecastCard forecast={forecast} />}

            <div className="app-surface rounded-xl p-6 shadow-sm lg:rounded-[24px] lg:p-6">
              <InsightsPanel insights={insights} />
            </div>
          </SectionStack>
        </div>
      </ContentSection>
    </SectionStack>
  );
};
