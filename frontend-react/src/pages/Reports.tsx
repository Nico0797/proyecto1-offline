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
import { SwipePager } from '../components/ui/SwipePager';

export const Reports = () => {
  const { activeBusiness } = useBusinessStore();
  const { savePreset } = useReportPresetsStore();

  // --- State ---
  const [activeTab, setActiveTab] = useState<string>('executive');
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
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      
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
        analyticsService.getSalesTrend(activeBusiness.id, diffDays),
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
    
    // CSV Export logic
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
        tab: activeTab as any,
        filters: { period: dateRange.preset, startDate: dateRange.start, endDate: dateRange.end, comparePeriod }
      });
    }
  };

  if (!activeBusiness) return <div className="p-8 text-center text-gray-500">Selecciona un negocio.</div>;

  return (
    <div className="h-full flex flex-col overflow-hidden" data-tour="reports.panel">
      {/* Header */}
      <div className="shrink-0 px-4 sm:px-6 lg:px-8 py-4 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart2 className="w-6 h-6 text-blue-500" />
                Report Studio
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Análisis profundo y métricas de tu negocio</p>
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
          <div className="mt-4" data-tour="reports.filters">
              <div className="flex flex-col sm:flex-row gap-4 items-center bg-gray-50 dark:bg-gray-800/50 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="w-full sm:w-auto flex-1 flex justify-start">
                  <PeriodFilter 
                    moduleId="reports"
                    value={dateRange}
                    onChange={setDateRange}
                    iconOnly
                  />
                </div>

                <div className="flex items-center gap-2">
                   <label className="flex items-center cursor-pointer gap-2 select-none">
                      <div className="relative">
                        <input 
                          type="checkbox" 
                          className="sr-only" 
                          checked={comparePeriod}
                          onChange={(e) => setComparePeriod(e.target.checked)}
                        />
                        <div className={cn(
                          "block w-8 h-5 rounded-full transition-colors",
                          comparePeriod ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-700"
                        )}></div>
                        <div className={cn(
                          "absolute left-1 top-1 bg-white w-3 h-3 rounded-full transition-transform",
                          comparePeriod && "translate-x-3"
                        )}></div>
                      </div>
                      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Comparar</span>
                   </label>
                </div>
              </div>
          </div>
      </div>

      <SwipePager 
        activePageId={activeTab}
        onPageChange={setActiveTab}
        className="flex-1"
        pages={[
            {
                id: 'executive',
                title: 'Resumen',
                icon: LayoutDashboard,
                content: (
                    <div className="space-y-6">
                        <ExecutiveSummaryTab data={reportData} loading={loading} />
                    </div>
                )
            },
            {
                id: 'sales',
                title: 'Ventas',
                icon: ShoppingCart,
                content: <SalesReportTab data={reportData} loading={loading} />
            },
            {
                id: 'clients',
                title: 'Clientes',
                icon: Users,
                content: <ClientsReportTab data={reportData} loading={loading} />
            },
            {
                id: 'products',
                title: 'Stock',
                icon: Store,
                content: <ProductsReportTab data={reportData} loading={loading} />
            },
            {
                id: 'expenses',
                title: 'Gastos', // Shortened from ExpensesReportTab default
                icon: Wallet,
                content: <ExpensesReportTab data={reportData} loading={loading} />
            },
            {
                id: 'receivables',
                title: 'Cobros', 
                icon: FileText,
                content: <ReceivablesReportTab data={reportData} loading={loading} />
            }
        ]}
      />
    </div>
  );
};
