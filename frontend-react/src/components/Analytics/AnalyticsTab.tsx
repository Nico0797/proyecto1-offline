import { useState, useEffect, useCallback } from 'react';
import { AnalyticsHeader } from './AnalyticsHeader';
import { KPIGrid } from './KPIGrid';
import { ChartsPanel } from './ChartsPanel';
import { InsightsPanel } from './InsightsPanel';
import { ForecastCard } from './ForecastCard';
import { HealthScorePanel } from './HealthScorePanel';
import { analyticsService, KPI, Insight, Forecast, HealthScore } from '../../services/analyticsService';
import { useBusinessStore } from '../../store/businessStore';
import { subDays, startOfMonth, format, startOfYear } from 'date-fns';

export const AnalyticsTab = () => {
  const { activeBusiness } = useBusinessStore();
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('30d');
  
  // Data States
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [salesTrend, setSalesTrend] = useState<any[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [healthScore, setHealthScore] = useState<HealthScore | null>(null);

  const getDateRange = useCallback((p: string) => {
    const end = new Date();
    let start = subDays(end, 30);

    switch (p) {
      case '7d': start = subDays(end, 7); break;
      case '90d': start = subDays(end, 90); break;
      case 'month': 
        start = startOfMonth(end); 
        // end is implicitly now/end of month for data fetching
        break;
      case 'year': start = startOfYear(end); break;
    }
    return { 
      startDate: format(start, 'yyyy-MM-dd'), 
      endDate: format(end, 'yyyy-MM-dd'),
      label: p
    };
  }, []);

  const fetchData = useCallback(async () => {
    if (!activeBusiness) return;
    
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange(period);
      
      // 1. Fetch KPIs (Current vs Previous Period for trends)
      // For simplicity, we'll fetch current period summary first
      const summary = await analyticsService.getSummary(activeBusiness.id, startDate, endDate);
      
      // Calculate previous period for comparison (naive implementation)
      const prevStartDate = format(subDays(new Date(startDate), 30), 'yyyy-MM-dd'); // Simplification
      const prevEndDate = format(subDays(new Date(endDate), 30), 'yyyy-MM-dd');
      
      const kpisData = await analyticsService.getKPIs(
        activeBusiness.id, 
        { startDate, endDate, label: 'Current' },
        { startDate: prevStartDate, endDate: prevEndDate, label: 'Previous' }
      );
      setKpis(kpisData);

      // 2. Fetch Charts Data
      const trend = await analyticsService.getSalesTrend(activeBusiness.id, period === '7d' ? 7 : 30);
      setSalesTrend(trend.trend || []);

      const products = await analyticsService.getTopProducts(activeBusiness.id, startDate, endDate);
      setTopProducts(products || []);

      const expenses = await analyticsService.getExpensesByCategory(activeBusiness.id, startDate, endDate);
      setExpensesByCategory(expenses || []);

      // 3. Generate Insights & Forecast
      const generatedInsights = analyticsService.generateInsights(kpisData, products);
      setInsights(generatedInsights);

      const daysElapsed = period === 'month' ? new Date().getDate() : 30; // Approx
      const totalDays = 30; // Approx
      const forecastData = analyticsService.calculateForecast(summary.sales?.total || 0, daysElapsed, totalDays);
      setForecast(forecastData);

      // 4. Mock Health Score (Real implementation would check more endpoints)
      setHealthScore({
        score: 85,
        status: 'good',
        indicators: [
          { label: 'Margen de Utilidad', status: 'ok', message: 'Tu margen es saludable (>20%)' },
          { label: 'Cartera Vencida', status: 'warning', message: 'Tienes 3 clientes con deuda > 30 días' },
          { label: 'Crecimiento Ventas', status: 'ok', message: '+15% vs mes anterior' }
        ]
      });

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, period, getDateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (!activeBusiness) return <div className="p-8 text-center text-gray-500">Selecciona un negocio para ver analíticas.</div>;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <AnalyticsHeader 
        period={period} 
        onPeriodChange={setPeriod} 
        onRefresh={fetchData} 
        loading={loading}
      />

      {/* KPI Section */}
      <KPIGrid kpis={kpis} />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6" data-tour="dashboard.analytics.salesChart">
        
        {/* Left Column: Charts (2/3 width) */}
        <div className="xl:col-span-2 space-y-6">
          <ChartsPanel 
            salesTrend={salesTrend} 
            expensesByCategory={expensesByCategory} 
            topProducts={topProducts} 
          />
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
             <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Detalle de Salud</h3>
             {healthScore && <HealthScorePanel score={healthScore} />}
          </div>
        </div>

        {/* Right Column: Insights & Forecast (1/3 width) */}
        <div className="space-y-6">
          {forecast && <ForecastCard forecast={forecast} />}
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <InsightsPanel insights={insights} />
          </div>
        </div>

      </div>
    </div>
  );
};
