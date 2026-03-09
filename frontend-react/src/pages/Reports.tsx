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
  FileText,
  Layers
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { cn } from '../utils/cn';
import { format, subDays } from 'date-fns';
import { PeriodFilter } from '../components/ui/PeriodFilter';
import { DateRange, getPeriodPreference } from '../utils/dateRange.utils';
import { toast } from 'react-hot-toast';
import { downloadFile, generateFilename } from '../utils/downloadHelper';

import {
  ExecutiveSummaryTab,
  SalesReportTab,
  ClientsReportTab,
  ProductsReportTab,
  ExpensesReportTab,
  ReceivablesReportTab,
  CombinedReportsTab
} from '../components/Reports';
import { SwipePager } from '../components/ui/SwipePager';

export const Reports = () => {
  const { activeBusiness } = useBusinessStore();
  const { savePreset } = useReportPresetsStore();

  // --- State ---
  const [activeTab, setActiveTab] = useState<string>('executive');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('reports'));
  const [comparePeriod, setComparePeriod] = useState(false);
  
  // Data
  const [reportData, setReportData] = useState<any>(null);

  // --- Data Fetching ---
  const fetchData = useCallback(async () => {
    if (!activeBusiness || !dateRange.start || !dateRange.end) return;
    
    // Skip fetching if combined tab (it handles its own data on demand or doesn't need summary data)
    // Actually combined tab uses separate downloads, but maybe we want to keep fetching summary data 
    // to prevent errors if switching tabs.
    
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
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [activeBusiness, dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- Handlers ---

  const handleExport = async () => {
    if (!activeBusiness || !dateRange.start || !dateRange.end) return;

    if (activeTab === 'combined') {
        toast('Selecciona un reporte específico de la lista abajo 👇', { icon: '💡' });
        return;
    }

    setExporting(true);
    // Use loading toast but manage ID to update it
    const toastId = toast.loading('Generando archivo...');
    
    try {
        let reportType: 'sales' | 'expenses' | 'combined' = 'combined';
        let specificType = '';

        // Map tab to backend report type
        switch (activeTab) {
            case 'sales': 
                // Using general business as it includes sales detail
                reportType = 'combined'; 
                specificType = 'general_business';
                break;
            case 'expenses': 
                reportType = 'combined';
                specificType = 'finance_full'; 
                break;
            case 'executive': 
                reportType = 'combined';
                specificType = 'general_business'; 
                break;
            case 'clients': 
                reportType = 'combined';
                specificType = 'customers_full'; 
                break;
            case 'products': 
                reportType = 'combined';
                specificType = 'products_full'; 
                break;
            case 'receivables': 
                reportType = 'combined';
                specificType = 'customers_full'; 
                break;
            default: 
                reportType = 'combined';
                specificType = 'general_business';
        }

        const url = await analyticsService.getExportUrl(activeBusiness.id, reportType, {
            startDate: dateRange.start,
            endDate: dateRange.end,
            type: specificType
        });
        
        const filename = generateFilename(`reporte_${activeTab}`, dateRange.start, dateRange.end);
        const token = localStorage.getItem('token') || undefined;
        
        const success = await downloadFile(url, { filename }, token);
        
        if (success) {
            toast.success('Descarga completada', { id: toastId });
        } else {
            toast.error('Error en la descarga', { id: toastId });
        }

    } catch (error) {
        console.error(error);
        toast.error('Error al generar el reporte', { id: toastId });
    } finally {
        setExporting(false);
    }
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
      <div className="shrink-0 px-4 py-4 bg-white dark:bg-gray-900 z-10 border-b border-gray-200 dark:border-gray-800">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-6 h-6 text-blue-500" />
              Report Studio
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Análisis profundo y métricas de tu negocio</p>
          </div>
          
          {/* Chip Toolbar */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {/* Date Filter */}
              <PeriodFilter 
                moduleId="reports"
                value={dateRange}
                onChange={setDateRange}
                iconOnly={false}
                buttonClassName="rounded-full h-9 px-3 text-sm min-w-0 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 border-none shadow-sm"
                className="shrink-0"
              />

              {/* Compare Toggle */}
              <button
                onClick={() => setComparePeriod(!comparePeriod)}
                className={cn(
                  "shrink-0 h-9 px-3 rounded-full text-sm font-medium transition-colors flex items-center gap-2 border shadow-sm",
                  comparePeriod 
                    ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50 dark:bg-gray-900 dark:border-gray-700 dark:text-gray-300"
                )}
              >
                <div className={cn("w-3 h-3 rounded-full border flex items-center justify-center transition-colors", comparePeriod ? "bg-blue-500 border-blue-500" : "border-gray-400")}>
                  {comparePeriod && <div className="w-1 h-1 bg-white rounded-full" />}
                </div>
                Comparar
              </button>

              <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-1 shrink-0" />

              {/* Actions */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleSavePreset} 
                className="rounded-full h-9 shrink-0 shadow-sm"
              >
                <Save className="w-3.5 h-3.5 mr-2" />
                Guardar
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleExport} 
                className="rounded-full h-9 shrink-0 shadow-sm" 
                data-tour="reports.export"
                disabled={exporting}
              >
                {exporting ? (
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                ) : (
                    <Download className="w-3.5 h-3.5 mr-2" />
                )}
                {exporting ? 'Exportando...' : 'Exportar'}
              </Button>
              
              <Button 
                size="sm" 
                onClick={fetchData} 
                disabled={loading} 
                className="rounded-full h-9 shrink-0 bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 mr-2", loading && "animate-spin")} />
                Generar
              </Button>
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
                id: 'combined',
                title: 'Avanzados',
                icon: Layers,
                content: (
                    <div className="px-4 pt-4 md:px-6 md:pt-6 overflow-y-auto h-full">
                        <div className="max-w-7xl mx-auto">
                            <CombinedReportsTab dateRange={dateRange} loading={loading} />
                        </div>
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
                title: 'Gastos',
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
