import { useState, useEffect, useCallback } from 'react';
import { useBusinessStore } from '../store/businessStore';
import { analyticsService } from '../services/analyticsService';
import { useReportPresetsStore } from '../store/reportPresetsStore';
import { 
  BarChart2, 
  Download, 
  Save, 
  RefreshCw,
  LayoutDashboard,
  ShoppingCart,
  Users,
  Store,
  Wallet,
  FileText
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';
import { cn } from '../utils/cn';
import { format, subDays } from 'date-fns';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';

import {
  ExecutiveSummaryTab,
  SalesReportTab,
  ClientsReportTab,
  ProductsReportTab,
  ExpensesReportTab,
  ReceivablesReportTab
} from '../components/Reports';

type ReportTab = 'executive' | 'sales' | 'clients' | 'products' | 'expenses' | 'receivables';

export const Reports = () => {
  const { activeBusiness } = useBusinessStore();
  const { savePreset } = useReportPresetsStore();

  // --- State ---
  const [activeTab, setActiveTab] = useState<ReportTab>('executive');
  const [loading, setLoading] = useState(false);
  // Filters
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('reports'));
  const [comparePeriod, setComparePeriod] = useState(false);
  
  // Data
  const [reportData, setReportData] = useState<any>(null);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!activeBusiness || !dateRange.start || !dateRange.end) return;
    setLoading(true);
    try {
      const startDate = dateRange.start;
      const endDate = dateRange.end;

      // Calculate previous period
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include start day
      
      const prevEnd = subDays(start, 1);
      const prevStart = subDays(prevEnd, diffDays - 1);
      
      const prevStartDate = format(prevStart, 'yyyy-MM-dd');
      const prevEndDate = format(prevEnd, 'yyyy-MM-dd');

      // Fetch data based on range
      const [summary, kpis, trend, products, expenses, clients] = await Promise.all([
        analyticsService.getSummary(activeBusiness.id, startDate, endDate),
        analyticsService.getKPIs(
          activeBusiness.id, 
          { startDate, endDate, label: 'Current' },
          { 
            startDate: prevStartDate, 
            endDate: prevEndDate, 
            label: 'Previous' 
          }
        ),
        analyticsService.getSalesTrend(activeBusiness.id, 30), // This takes 'days', maybe adapt to range?
        analyticsService.getTopProducts(activeBusiness.id, startDate, endDate),
        analyticsService.getExpensesByCategory(activeBusiness.id, startDate, endDate),
        analyticsService.getClientStats(activeBusiness.id, startDate, endDate)
      ]);

      setReportData({
        summary,
        kpis,
        trend: trend.trend || [],
        products,
        expenses,
        clients,
        insights: analyticsService.generateInsights(kpis, products)
      });
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---

  const handleExport = () => {
    if (!reportData) return;
    
    // CSV Export for active tab
    const headers: string[] = [];
    let rows: any[] = [];
    
    if (activeTab === 'executive') {
        headers.push('KPI', 'Valor Actual', 'Valor Anterior', 'Cambio (%)');
        rows = reportData.kpis.map((k: any) => [
            k.label, 
            k.value, 
            k.previousValue, 
            k.change.toFixed(2) + '%'
        ]);
    } else if (activeTab === 'sales') {
        headers.push('Fecha', 'Ventas ($)', '# Transacciones');
        rows = reportData.trend.map((t: any) => [
            t.date,
            t.amount,
            t.count
        ]);
    } else if (activeTab === 'clients') {
        headers.push('Cliente', 'Última Compra', 'Total Gastado', 'Compras', 'Saldo');
        rows = reportData.clients.map((c: any) => [
            c.name,
            c.last_purchase || 'N/A',
            c.total_spent,
            c.purchase_count,
            c.balance
        ]);
    } else if (activeTab === 'products') {
        headers.push('Producto', 'Unidades Vendidas', 'Total Ingresos');
        rows = reportData.products.map((p: any) => [
            p.name,
            p.qty,
            p.total
        ]);
    } else if (activeTab === 'expenses') {
        headers.push('Categoría', 'Monto Total');
        rows = reportData.expenses.map((e: any) => [
            e.category,
            e.total
        ]);
    } else if (activeTab === 'receivables') {
        headers.push('Cliente', 'Saldo Pendiente', 'Vencido');
        rows = reportData.clients
            .filter((c: any) => c.balance > 0)
            .map((c: any) => [
                c.name,
                c.balance,
                c.is_overdue ? 'SI' : 'NO'
            ]);
    }

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `reporte_${activeTab}_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSavePreset = () => {
    const name = prompt('Nombre de la plantilla:');
    if (name) {
      savePreset({
        name,
        tab: activeTab,
        filters: { period: dateRange.preset, startDate: dateRange.start, endDate: dateRange.end, comparePeriod }
      });
    }
  };

  const tabs = [
    { id: 'executive', label: 'Resumen', icon: LayoutDashboard },
    { id: 'sales', label: 'Ventas', icon: ShoppingCart },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'products', label: 'Productos', icon: Store },
    { id: 'expenses', label: 'Gastos', icon: Wallet },
    { id: 'receivables', label: 'Cartera', icon: FileText },
  ];

  if (!activeBusiness) return <div className="p-8 text-center text-gray-500">Selecciona un negocio.</div>;

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500" data-tour="reports.panel">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <BarChart2 className="w-8 h-8 text-blue-500" />
            Report Studio
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Análisis profundo y métricas de tu negocio</p>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full lg:w-auto">
          <Button variant="outline" size="sm" onClick={handleSavePreset} className="flex-1 lg:flex-none">
            <Save className="w-4 h-4 mr-2" />
            Guardar
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport} className="flex-1 lg:flex-none" data-tour="reports.export">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button size="sm" onClick={fetchData} disabled={loading} className="flex-1 lg:flex-none">
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} />
            Generar
          </Button>
        </div>
      </div>

      {/* Filters Panel */}
      <Card className="border-none bg-white/50 dark:bg-gray-800/50 backdrop-blur-md shadow-sm" data-tour="reports.filters">
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-6 items-center">
            {/* Period Selector */}
            <div className="w-full lg:w-auto">
              <PeriodFilter 
                moduleId="reports"
                value={dateRange}
                onChange={setDateRange}
              />
            </div>

            {/* Compare Toggle */}
            <div className="flex items-center gap-3 pb-2 ml-auto">
               <label className="flex items-center cursor-pointer gap-2">
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only" 
                      checked={comparePeriod}
                      onChange={(e) => setComparePeriod(e.target.checked)}
                    />
                    <div className={cn(
                      "block w-10 h-6 rounded-full transition-colors",
                      comparePeriod ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                    )}></div>
                    <div className={cn(
                      "absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform",
                      comparePeriod && "translate-x-4"
                    )}></div>
                  </div>
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Comparar vs anterior</span>
               </label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <div className="flex overflow-x-auto no-scrollbar border-b border-gray-200 dark:border-gray-800 gap-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as ReportTab)}
            data-tour={
              tab.id === 'executive' ? 'reports.dashboard' :
              tab.id === 'sales' ? 'reports.sales' :
              tab.id === 'products' ? 'reports.inventory' :
              undefined
            }
            className={cn(
              "flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
              activeTab === tab.id
                ? "border-blue-500 text-blue-600 dark:text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'executive' && <ExecutiveSummaryTab data={reportData} loading={loading} />}
            {activeTab === 'sales' && <SalesReportTab data={reportData} loading={loading} />}
            {activeTab === 'clients' && <ClientsReportTab data={reportData} loading={loading} />}
            {activeTab === 'products' && <ProductsReportTab data={reportData} loading={loading} />}
            {activeTab === 'expenses' && <ExpensesReportTab data={reportData} loading={loading} />}
            {activeTab === 'receivables' && <ReceivablesReportTab data={reportData} loading={loading} />}
          </>
        )}
      </div>
    </div>
  );
};
