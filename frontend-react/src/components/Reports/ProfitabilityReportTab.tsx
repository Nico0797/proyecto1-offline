import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BadgeAlert,
  BarChart3,
  CircleAlert,
  Download,
  Package,
  Receipt,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import {
  ProductCostingSummaryItem,
  ProfitabilityAlert,
  ProfitabilityAlertsResponse,
  ProfitabilityProductsResponse,
  ProfitabilitySalesItem,
  ProfitabilitySalesResponse,
  ProfitabilitySummary,
} from '../../types';
import { createEmptyProfitabilityAlertsResponse, profitabilityService } from '../../services/profitabilityService';
import { useBusinessStore } from '../../store/businessStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { generateFilename, saveBlobFile } from '../../utils/downloadHelper';

type ProfitabilityStatusFilter = 'all' | 'complete' | 'incomplete' | 'missing_cost' | 'no_consumption' | 'with_issues';
type ProfitabilityFocus =
  | 'overview'
  | 'top_products'
  | 'bottom_products'
  | 'top_sales'
  | 'bottom_sales'
  | 'issues_products'
  | 'issues_sales';
type DetailView = 'products' | 'sales';

interface ProfitabilityReportTabProps {
  businessId: number;
  startDate: string;
  endDate: string;
  initialFocus?: string;
  initialStatus?: string;
  initialProductQuery?: string;
}

const STATUS_OPTIONS: Array<{ value: ProfitabilityStatusFilter; label: string }> = [
  { value: 'all', label: 'Todos los estados' },
  { value: 'complete', label: 'Rentabilidad confiable' },
  { value: 'with_issues', label: 'Con advertencias' },
  { value: 'incomplete', label: 'Costo incompleto' },
  { value: 'missing_cost', label: 'Sin costo base' },
  { value: 'no_consumption', label: 'Sin consumo relacionado' },
];

const getStatusTone = (status?: string) => {
  switch (status) {
    case 'complete':
      return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-300';
    case 'no_consumption':
      return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-300';
    case 'missing_cost':
      return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-300';
    default:
      return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300';
  }
};

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1).toLocaleDateString('es-CO');
};

const matchesStatus = (status?: string, filter: ProfitabilityStatusFilter = 'all') => {
  if (filter === 'all') return true;
  if (filter === 'with_issues') return status !== 'complete';
  return status === filter;
};

const normalizeText = (value?: string | number | null) => String(value ?? '').toLowerCase().trim();

const matchesQuery = (item: { product_name?: string | null; customer_name?: string | null; sale_id?: number | null }, query: string) => {
  const needle = normalizeText(query);
  if (!needle) return true;
  return [
    normalizeText(item.product_name),
    normalizeText(item.customer_name),
    normalizeText(item.sale_id),
  ].some((candidate) => candidate.includes(needle));
};

const getReadableStatus = (label?: string | null, status?: string) => {
  if (label) return label;
  switch (status) {
    case 'complete':
      return 'Confiable';
    case 'missing_cost':
      return 'Sin costo base';
    case 'no_consumption':
      return 'Sin consumo';
    default:
      return 'Incompleto';
  }
};

const getConfidenceLabel = (status?: string) => (status === 'complete' ? 'Confiable' : 'Revisar');

export const ProfitabilityReportTab: React.FC<ProfitabilityReportTabProps> = ({
  businessId,
  startDate,
  endDate,
  initialFocus,
  initialStatus,
  initialProductQuery,
}) => {
  const { activeBusiness } = useBusinessStore();
  const [summary, setSummary] = useState<ProfitabilitySummary | null>(null);
  const [products, setProducts] = useState<ProfitabilityProductsResponse | null>(null);
  const [sales, setSales] = useState<ProfitabilitySalesResponse | null>(null);
  const [alerts, setAlerts] = useState<ProfitabilityAlertsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ProfitabilityStatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFocus, setActiveFocus] = useState<ProfitabilityFocus>('overview');
  const [detailView, setDetailView] = useState<DetailView>('products');

  const currency = activeBusiness?.currency || 'COP';
  const formatCurrency = (value?: number | null) => {
    if (value === null || value === undefined) return '—';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  };

  useEffect(() => {
    setStatusFilter(STATUS_OPTIONS.some((item) => item.value === initialStatus) ? (initialStatus as ProfitabilityStatusFilter) : 'all');
    setSearchQuery(initialProductQuery || '');
    setActiveFocus((initialFocus as ProfitabilityFocus) || 'overview');
  }, [initialFocus, initialProductQuery, initialStatus]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = { start_date: startDate, end_date: endDate };
        const [summaryResult, productsResult, salesResult, alertsResult] = await Promise.allSettled([
          profitabilityService.getSummary(businessId, params),
          profitabilityService.getProducts(businessId, params),
          profitabilityService.getSales(businessId, params),
          profitabilityService.getAlerts(businessId, params),
        ]);

        if (
          summaryResult.status !== 'fulfilled' ||
          productsResult.status !== 'fulfilled' ||
          salesResult.status !== 'fulfilled'
        ) {
          throw (
            (summaryResult.status === 'rejected' && summaryResult.reason) ||
            (productsResult.status === 'rejected' && productsResult.reason) ||
            (salesResult.status === 'rejected' && salesResult.reason) ||
            new Error('No fue posible cargar la rentabilidad')
          );
        }

        setSummary(summaryResult.value);
        setProducts(productsResult.value);
        setSales(salesResult.value);

        if (alertsResult.status === 'fulfilled') {
          setAlerts(alertsResult.value);
        } else {
          console.warn('Profitability alerts failed', alertsResult.reason);
          setAlerts(createEmptyProfitabilityAlertsResponse());
        }
      } catch (error: any) {
        setSummary(null);
        setProducts(null);
        setSales(null);
        setAlerts(createEmptyProfitabilityAlertsResponse());
        toast.error(error?.response?.data?.error || 'No fue posible cargar la rentabilidad');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [businessId, endDate, startDate]);

  const filteredProductItems = useMemo(
    () => (products?.items || []).filter((item) => matchesStatus(item.cost_status, statusFilter) && matchesQuery(item, searchQuery)),
    [products, searchQuery, statusFilter]
  );

  const filteredIssueProducts = useMemo(
    () => (products?.incomplete_items || []).filter((item) => matchesStatus(item.cost_status, statusFilter) && matchesQuery(item, searchQuery)),
    [products, searchQuery, statusFilter]
  );

  const filteredTopProducts = useMemo(
    () => (products?.top_margin_items || []).filter((item) => matchesStatus(item.cost_status, statusFilter) && matchesQuery(item, searchQuery)),
    [products, searchQuery, statusFilter]
  );

  const filteredBottomProducts = useMemo(
    () => (products?.bottom_margin_items || []).filter((item) => matchesStatus(item.cost_status, statusFilter) && matchesQuery(item, searchQuery)),
    [products, searchQuery, statusFilter]
  );

  const filteredSalesItems = useMemo(
    () => (sales?.items || []).filter((item) => matchesStatus(item.cost_status, statusFilter) && matchesQuery(item, searchQuery)),
    [sales, searchQuery, statusFilter]
  );

  const filteredIssueSales = useMemo(
    () => ([...(sales?.no_consumption_items || []), ...(sales?.incomplete_items || [])]).filter((item) => matchesStatus(item.cost_status, statusFilter) && matchesQuery(item, searchQuery)),
    [sales, searchQuery, statusFilter]
  );

  const filteredTopSales = useMemo(
    () => (sales?.top_margin_items || []).filter((item) => matchesStatus(item.cost_status, statusFilter) && matchesQuery(item, searchQuery)),
    [sales, searchQuery, statusFilter]
  );

  const filteredBottomSales = useMemo(
    () => (sales?.bottom_margin_items || []).filter((item) => matchesStatus(item.cost_status, statusFilter) && matchesQuery(item, searchQuery)),
    [sales, searchQuery, statusFilter]
  );

  const currentDetailItems = detailView === 'products' ? filteredProductItems : filteredSalesItems;

  const focusToDetailView = (focus: ProfitabilityFocus): DetailView => (
    focus === 'top_sales' || focus === 'bottom_sales' || focus === 'issues_sales' ? 'sales' : 'products'
  );

  const handleFocus = (focus: ProfitabilityFocus, nextStatus?: ProfitabilityStatusFilter) => {
    setActiveFocus(focus);
    setDetailView(focusToDetailView(focus));
    if (nextStatus) {
      setStatusFilter(nextStatus);
    }
  };

  const handleAlertAction = (alert: ProfitabilityAlert) => {
    handleFocus((alert.focus as ProfitabilityFocus) || 'overview', (alert.status_filter as ProfitabilityStatusFilter) || 'all');
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const blob = await profitabilityService.downloadExport(businessId, {
        start_date: startDate,
        end_date: endDate,
        status: statusFilter,
        product_query: searchQuery || undefined,
        focus: activeFocus,
      });
      await saveBlobFile(blob, { filename: generateFilename('rentabilidad', startDate, endDate) });
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible exportar la rentabilidad');
    } finally {
      setExporting(false);
    }
  };

  const renderProductCard = (item: ProductCostingSummaryItem, variant: 'top' | 'bottom' | 'issue') => (
    <div key={`${variant}-product-${item.product_id}`} className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{item.product_name}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {getReadableStatus(item.cost_status_label, item.cost_status)} • {item.costed_sales_count} venta(s) costeadas de {item.sales_count}
          </div>
          {variant === 'issue' && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.cost_status_message}</div>
          )}
        </div>
        <div className="text-right">
          <div className={`font-semibold ${variant === 'bottom' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
            {item.estimated_margin_percent ?? '—'}%
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(item.estimated_gross_margin)}</div>
        </div>
      </div>
    </div>
  );

  const renderSaleCard = (item: ProfitabilitySalesItem, variant: 'top' | 'bottom' | 'issue') => (
    <div key={`${variant}-sale-${item.sale_id}`} className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium text-gray-900 dark:text-white">Venta #{item.sale_id}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {item.customer_name || 'Cliente casual'} • {formatDate(item.sale_date)}
          </div>
          {variant === 'issue' && (
            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.cost_status_message}</div>
          )}
        </div>
        <div className="text-right">
          <div className={`font-semibold ${variant === 'bottom' ? 'text-rose-600 dark:text-rose-300' : variant === 'issue' ? 'text-amber-600 dark:text-amber-300' : 'text-emerald-600 dark:text-emerald-300'}`}>
            {item.estimated_margin_percent ?? '—'}{item.estimated_margin_percent != null ? '%' : ''}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{formatCurrency(item.estimated_gross_margin ?? item.sale_total)}</div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Rentabilidad</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            El margen solo es confiable cuando el costeo está completo. Los casos incompletos, sin consumo o sin costo base se separan explícitamente.
          </p>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
              Periodo: {formatDate(startDate)} al {formatDate(endDate)}
            </span>
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-300">
              Completo = confiable
            </span>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
              Incompleto / faltante = revisar
            </span>
          </div>
        </div>
        <Button variant="outline" onClick={handleExport} isLoading={exporting}>
          <Download className="w-4 h-4" />
          Exportar rentabilidad
        </Button>
      </div>

      <Card className="p-4 md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto, cliente o venta..."
                className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
            </div>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ProfitabilityStatusFilter)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={detailView}
            onChange={(e) => setDetailView(e.target.value as DetailView)}
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="products">Detalle por productos</option>
            <option value="sales">Detalle por ventas</option>
          </select>
          <Button
            variant="secondary"
            onClick={() => {
              setStatusFilter('all');
              setSearchQuery('');
              setActiveFocus('overview');
            }}
          >
            Limpiar filtros
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <button type="button" onClick={() => handleFocus('overview', 'complete')} className="text-left">
          <Card className="p-5 transition-all hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-900/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Margen bruto estimado</div>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{summary ? formatCurrency(summary.gross_margin_total) : '—'}</div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {summary?.margin_percent !== null && summary?.margin_percent !== undefined ? `${summary.margin_percent}% sobre ventas completas` : 'No estimable todavía'}
                </div>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-600 dark:border-emerald-900/30 dark:bg-emerald-900/10 dark:text-emerald-300">
                <BarChart3 className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </button>

        <button type="button" onClick={() => handleFocus('top_sales', 'complete')} className="text-left">
          <Card className="p-5 transition-all hover:shadow-md hover:border-blue-300 dark:hover:border-blue-900/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Ventas completas</div>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{summary?.complete_sales_count ?? '—'}</div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">{summary ? `${summary.sales_count} ventas en el período` : '—'}</div>
              </div>
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-3 text-blue-600 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-300">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </button>

        <button type="button" onClick={() => handleFocus('issues_sales', 'with_issues')} className="text-left">
          <Card className="p-5 transition-all hover:shadow-md hover:border-amber-300 dark:hover:border-amber-900/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Ventas con advertencia</div>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {summary ? (summary.incomplete_sales_count + summary.no_consumption_sales_count) : '—'}
                </div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Incompletas o sin consumo</div>
              </div>
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-600 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300">
                <CircleAlert className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </button>

        <button type="button" onClick={() => handleFocus('issues_products', 'with_issues')} className="text-left">
          <Card className="p-5 transition-all hover:shadow-md hover:border-rose-300 dark:hover:border-rose-900/30">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">Productos con advertencia</div>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{summary?.products_with_issues_count ?? '—'}</div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">Incompletos, sin costo o sin consumo</div>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-600 dark:border-rose-900/30 dark:bg-rose-900/10 dark:text-rose-300">
                <BadgeAlert className="w-5 h-5" />
              </div>
            </div>
          </Card>
        </button>
      </div>

      {alerts?.alerts?.length ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {alerts.alerts.map((alert) => (
            <div key={alert.code} className={`rounded-2xl border px-4 py-4 ${alert.level === 'danger' ? 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10' : 'border-amber-200 bg-amber-50 dark:border-amber-900/30 dark:bg-amber-900/10'}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`mt-0.5 h-5 w-5 shrink-0 ${alert.level === 'danger' ? 'text-red-600 dark:text-red-300' : 'text-amber-600 dark:text-amber-300'}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-gray-900 dark:text-white">{alert.title}</div>
                  <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{alert.message}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{alert.count} caso(s)</span>
                    <Button size="sm" variant="outline" onClick={() => handleAlertAction(alert)}>
                      Ver detalle
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className={`p-5 ${activeFocus === 'top_products' ? 'ring-2 ring-emerald-400/60' : ''}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Top productos por margen</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => handleFocus('top_products', 'complete')}>Filtrar</Button>
          </div>
          <div className="space-y-3">
            {filteredTopProducts.length ? filteredTopProducts.slice(0, 5).map((item) => renderProductCard(item, 'top')) : <div className="text-sm text-gray-500 dark:text-gray-400">No hay productos con margen confiable para los filtros aplicados.</div>}
          </div>
        </Card>

        <Card className={`p-5 ${activeFocus === 'bottom_products' ? 'ring-2 ring-rose-400/60' : ''}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Peores productos por margen</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => handleFocus('bottom_products', 'complete')}>Filtrar</Button>
          </div>
          <div className="space-y-3">
            {filteredBottomProducts.length ? filteredBottomProducts.slice(0, 5).map((item) => renderProductCard(item, 'bottom')) : <div className="text-sm text-gray-500 dark:text-gray-400">No hay productos costeados suficientes para comparar.</div>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className={`p-5 ${activeFocus === 'top_sales' ? 'ring-2 ring-blue-400/60' : ''}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Ventas con mejor margen</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => handleFocus('top_sales', 'complete')}>Filtrar</Button>
          </div>
          <div className="space-y-3">
            {filteredTopSales.length ? filteredTopSales.slice(0, 5).map((item) => renderSaleCard(item, 'top')) : <div className="text-sm text-gray-500 dark:text-gray-400">No hay ventas con margen confiable para los filtros aplicados.</div>}
          </div>
        </Card>

        <Card className={`p-5 ${activeFocus === 'bottom_sales' ? 'ring-2 ring-rose-400/60' : ''}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-rose-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Ventas con peor margen</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => handleFocus('bottom_sales', 'complete')}>Filtrar</Button>
          </div>
          <div className="space-y-3">
            {filteredBottomSales.length ? filteredBottomSales.slice(0, 5).map((item) => renderSaleCard(item, 'bottom')) : <div className="text-sm text-gray-500 dark:text-gray-400">No hay ventas costeadas suficientes para ordenar.</div>}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className={`p-5 ${activeFocus === 'issues_products' ? 'ring-2 ring-amber-400/60' : ''}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Productos con costo no confiable</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => handleFocus('issues_products', 'with_issues')}>Filtrar</Button>
          </div>
          <div className="space-y-3">
            {filteredIssueProducts.length ? filteredIssueProducts.slice(0, 8).map((item) => renderProductCard(item, 'issue')) : <div className="text-sm text-gray-500 dark:text-gray-400">No hay productos con advertencias para los filtros aplicados.</div>}
          </div>
        </Card>

        <Card className={`p-5 ${activeFocus === 'issues_sales' ? 'ring-2 ring-amber-400/60' : ''}`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CircleAlert className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Ventas con margen no confiable</h3>
            </div>
            <Button size="sm" variant="ghost" onClick={() => handleFocus('issues_sales', 'with_issues')}>Filtrar</Button>
          </div>
          <div className="space-y-3">
            {filteredIssueSales.length ? filteredIssueSales.slice(0, 8).map((item) => renderSaleCard(item, 'issue')) : <div className="text-sm text-gray-500 dark:text-gray-400">No hay ventas con advertencias para los filtros aplicados.</div>}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-800 md:px-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Detalle filtrado</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Vista operativa para revisar filas según rango, estado y búsqueda aplicados.
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant={detailView === 'products' ? 'primary' : 'secondary'} onClick={() => setDetailView('products')}>
                Productos
              </Button>
              <Button size="sm" variant={detailView === 'sales' ? 'primary' : 'secondary'} onClick={() => setDetailView('sales')}>
                Ventas
              </Button>
            </div>
          </div>
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500 dark:bg-gray-900/60 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 font-medium">{detailView === 'products' ? 'Producto' : 'Venta'}</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Confiabilidad</th>
                <th className="px-4 py-3 font-medium">{detailView === 'products' ? 'Ventas' : 'Cliente'}</th>
                <th className="px-4 py-3 font-medium">Monto</th>
                <th className="px-4 py-3 font-medium">Margen</th>
                <th className="px-4 py-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {detailView === 'products' ? (
                filteredProductItems.slice(0, 30).map((item) => (
                  <tr key={`product-row-${item.product_id}`} className="bg-white dark:bg-gray-900">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.product_name}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusTone(item.cost_status)}`}>
                        {getReadableStatus(item.cost_status_label, item.cost_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{getConfidenceLabel(item.cost_status)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.sales_count}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatCurrency(item.revenue_total)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.estimated_margin_percent != null ? `${item.estimated_margin_percent}%` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.cost_status_message}</td>
                  </tr>
                ))
              ) : (
                filteredSalesItems.slice(0, 30).map((item) => (
                  <tr key={`sale-row-${item.sale_id}`} className="bg-white dark:bg-gray-900">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">#{item.sale_id}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${getStatusTone(item.cost_status)}`}>
                        {getReadableStatus(item.cost_status_label, item.cost_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{getConfidenceLabel(item.cost_status)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.customer_name || 'Cliente casual'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatCurrency(item.sale_total)}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.estimated_margin_percent != null ? `${item.estimated_margin_percent}%` : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.cost_status_message}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-4 md:hidden">
          {detailView === 'products'
            ? filteredProductItems.slice(0, 12).map((item) => renderProductCard(item, item.cost_status === 'complete' ? 'top' : 'issue'))
            : filteredSalesItems.slice(0, 12).map((item) => renderSaleCard(item, item.cost_status === 'complete' ? 'top' : 'issue'))}
        </div>

        {!currentDetailItems.length && !loading ? (
          <div className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
            No hay filas para el rango y filtros aplicados. Ajusta el estado o limpia la búsqueda.
          </div>
        ) : null}
      </Card>

      {loading ? (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-6 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
          Cargando rentabilidad…
        </div>
      ) : null}
    </div>
  );
};
