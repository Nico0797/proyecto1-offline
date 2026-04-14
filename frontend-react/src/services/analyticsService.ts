import { 
  AnalyticsCostCoverage,
  KPI, 
  Insight, 
  Forecast, 
  SalesTrendPoint,
  HealthScore,
} from '../types/analytics';
import { getAccessSnapshot } from '../hooks/useAccess';
import { format } from 'date-fns';
import type { Sale, Expense, Customer } from '../types';
import api from './api';
import { buildBusinessExpensesQueryParams, getBusinessExpensesPath } from './businessApiRoutes';
import { balanceService } from './balanceService';
import { hasOfflineSessionSeed } from './offlineSession';
import { isOfflineProductMode } from '../runtime/runtimeMode';
import { requestGeneratedFile, type DownloadedFilePayload } from '../utils/downloadHelper';
import {
  buildLocalMergedCustomers,
  filterLocalExpensesByRange,
  filterLocalSalesByRange,
  isPureOfflineRuntime,
  readCompatibleOfflineExpenses,
  readOfflineSales,
} from './offlineLocalData';

type AnalyticsDatasetKey = 'sales' | 'expenses' | 'customers' | 'debtors';

interface AnalyticsDegradationIssue {
  dataset: AnalyticsDatasetKey;
  message: string;
}

interface RawAnalyticsResult {
  sales: Sale[];
  expenses: Expense[];
  customers: Customer[];
  degraded: boolean;
  issues: AnalyticsDegradationIssue[];
}

interface AnalyticsSummary {
  sales: { total: number; count: number };
  expenses: { total: number; count: number };
  costs: { total: number; coveredSalesTotal: number; uncoveredSalesTotal: number; missingSalesCount: number };
  profit: {
    net: number | null;
    gross: number;
    operatingBalance: number;
    coverage: AnalyticsCostCoverage;
    displayLabel: string;
    displayValue: number | string;
  };
  health?: {
    overdueReceivables: number;
    overdueReceivableCustomersCount: number;
    dueSoonReceivables: number;
    receivableCustomersCount: number;
    marginPercent: number;
    costedSalesTotal: number;
    uncostedSalesTotal: number;
    missingCostSalesCount: number;
    previousSalesTotal: number;
    costCoverage: AnalyticsCostCoverage;
    operatingBalance: number;
  };
  degraded?: boolean;
  issues?: AnalyticsDegradationIssue[];
}

const roundCurrency = (value: number) => Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100;

const resolveCostCoverage = (coveredSalesTotal: number, uncoveredSalesTotal: number, missingSalesCount: number): AnalyticsCostCoverage => {
  if (missingSalesCount <= 0 && uncoveredSalesTotal <= 0.01) return 'complete';
  if (coveredSalesTotal > 0.01) return 'partial';
  return 'missing';
};

const shouldUseLocalOnly = () => isOfflineProductMode() || (!localStorage.getItem('token') && hasOfflineSessionSeed());

const safeNumber = (value: any) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildLocalRawAnalyticsResult = async (
  businessId: number,
  startDate: string,
  endDate: string,
): Promise<RawAnalyticsResult> => {
  const [sales, mergedCustomers] = await Promise.all([
    readOfflineSales(businessId),
    buildLocalMergedCustomers(businessId),
  ]);

  const localExpenses = filterLocalExpensesByRange(readCompatibleOfflineExpenses(businessId), startDate, endDate);
  const localSales = filterLocalSalesByRange(sales, startDate, endDate);

  return {
    sales: localSales,
    expenses: localExpenses,
    customers: mergedCustomers.customers,
    degraded: false,
    issues: [],
  };
};

class AnalyticsService {
  private isOperationalExecutedExpense(expense: Expense) {
    const sourceType = String(expense.source_type || 'manual').toLowerCase();
    return sourceType !== 'supplier_payment' && sourceType !== 'debt_payment' && sourceType !== 'purchase_payment';
  }

  private buildIssue(dataset: AnalyticsDatasetKey, error: any): AnalyticsDegradationIssue {
    return {
      dataset,
      message: error?.response?.data?.error || error?.message || `No fue posible cargar ${dataset}`,
    };
  }

  private extractExpensesPayload(payload: any): Expense[] {
    if (Array.isArray(payload?.expenses)) return payload.expenses;
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.items)) return payload.items;
    return [];
  }
  
  // --- Data Fetching (Raw) ---

  private async fetchRawData(businessId: number, startDate: string, endDate: string): Promise<RawAnalyticsResult> {
    if (isPureOfflineRuntime() || shouldUseLocalOnly()) {
      return buildLocalRawAnalyticsResult(businessId, startDate, endDate);
    }

    try {
      const access = getAccessSnapshot();
      const canAccessSales = access.hasModule('sales') && access.hasPermission('sales.view');
      const canAccessExpenses = access.hasPermission('expenses.view');
      const canAccessCustomers = access.hasModule('customers') && access.hasPermission('customers.view');
      const canAccessReceivables = access.hasModule('accounts_receivable') && access.hasPermission('receivables.view');

      const requests: Array<Promise<any>> = [
        canAccessSales
          ? api.get(`/businesses/${businessId}/sales`, { params: { start_date: startDate, end_date: endDate } })
          : Promise.resolve({ data: { sales: [] } }),
        canAccessExpenses
          ? api.get(getBusinessExpensesPath(businessId), {
              params: buildBusinessExpensesQueryParams({ start_date: startDate, end_date: endDate }),
            })
          : Promise.resolve({ data: { expenses: [] } }),
        canAccessCustomers
          ? api.get(`/businesses/${businessId}/customers`)
          : Promise.resolve({ data: { customers: [] } }),
        canAccessReceivables
          ? api.get(`/businesses/${businessId}/customers/debtors`)
          : Promise.resolve({ data: { debtors: [] } }),
      ];

      const [salesResult, expensesResult, customersResult, debtorsResult] = await Promise.allSettled(requests);
      const issues: AnalyticsDegradationIssue[] = [];

      if (salesResult.status === 'rejected') {
        console.warn('Could not fetch sales data:', salesResult.reason);
        issues.push(this.buildIssue('sales', salesResult.reason));
      }
      if (expensesResult.status === 'rejected') {
        console.warn('Could not fetch expenses data:', expensesResult.reason);
        issues.push(this.buildIssue('expenses', expensesResult.reason));
      }
      if (customersResult.status === 'rejected') {
        console.warn('Could not fetch customers data:', customersResult.reason);
        issues.push(this.buildIssue('customers', customersResult.reason));
      }
      if (debtorsResult.status === 'rejected') {
        console.warn('Could not fetch debtors data:', debtorsResult.reason);
        issues.push(this.buildIssue('debtors', debtorsResult.reason));
      }

      const sales: Sale[] = salesResult.status === 'fulfilled' ? salesResult.value?.data?.sales || [] : [];
      const expenses: Expense[] = expensesResult.status === 'fulfilled' ? this.extractExpensesPayload(expensesResult.value?.data) : [];
      const customersRaw: Customer[] = customersResult.status === 'fulfilled' ? customersResult.value?.data?.customers || [] : [];
      const debtors: any[] = debtorsResult.status === 'fulfilled' ? debtorsResult.value?.data?.debtors || [] : [];

      const debtorMap = new Map(debtors.map((d: any) => [d.id, d]));

      const customers: Customer[] = customersRaw.map(c => {
        const debtor = debtorMap.get(c.id);
        return {
          ...c,
          balance: debtor ? debtor.balance : 0,
          oldest_due_date: debtor ? debtor.since : undefined,
          receivable_due_date: debtor ? debtor.due_date : undefined,
          receivable_status: debtor ? debtor.status : undefined,
          receivable_status_label: debtor ? debtor.status_label : undefined,
          overdue_balance: debtor ? debtor.overdue_balance : 0,
          receivable_invoice_count: debtor ? debtor.invoice_count : 0,
          receivable_days_overdue: debtor ? debtor.max_days_overdue : 0,
          is_overdue: debtor ? debtor.status === 'overdue' : false
        } as Customer;
      });

      return {
        sales,
        expenses,
        customers,
        degraded: issues.length > 0,
        issues,
      };
    } catch (error) {
      console.error('Error fetching raw data:', error);
      return {
        sales: [],
        expenses: [],
        customers: [],
        degraded: true,
        issues: [this.buildIssue('sales', error)],
      };
    }
  }

  // --- Public Methods (Aggregators) ---

  async getSummary(businessId: number, startDate: string, endDate: string): Promise<AnalyticsSummary> {
    const [rawResult, financialResult] = await Promise.allSettled([
      this.fetchRawData(businessId, startDate, endDate),
      balanceService.getDashboard(businessId, startDate, endDate),
    ]);

    const issues: AnalyticsDegradationIssue[] = [];
    const raw = rawResult.status === 'fulfilled'
      ? rawResult.value
      : { sales: [], expenses: [], customers: [], degraded: true, issues: [this.buildIssue('sales', rawResult.reason)] };

    if (rawResult.status === 'rejected') {
      issues.push(this.buildIssue('sales', rawResult.reason));
      issues.push(this.buildIssue('expenses', rawResult.reason));
    } else if (raw.issues?.length) {
      issues.push(...raw.issues);
    }

    if (financialResult.status === 'rejected') {
      issues.push(this.buildIssue('sales', financialResult.reason));
    }

    const financialSummary = financialResult.status === 'fulfilled' ? financialResult.value.summary : null;
    const totalSales = financialSummary?.salesTotal ?? raw.sales.reduce((sum, s) => sum + s.total, 0);
    const countSales = raw.sales.length;
    const executedOperationalExpenses = raw.expenses.filter((expense) => this.isOperationalExecutedExpense(expense));
    const totalExpenses = financialSummary?.expensesTotal ?? executedOperationalExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalCost = financialSummary?.salesCogsTotal ?? raw.sales.reduce((sum, sale) => sum + safeNumber((sale as any).total_cost), 0);
    const coveredSalesTotal = financialSummary?.costedSalesTotal ?? raw.sales
      .filter((sale) => safeNumber((sale as any).total_cost) > 0.0001)
      .reduce((sum, sale) => sum + safeNumber(sale.total), 0);
    const uncoveredSalesTotal = financialSummary?.uncostedSalesTotal ?? raw.sales
      .filter((sale) => safeNumber((sale as any).total_cost) <= 0.0001)
      .reduce((sum, sale) => sum + safeNumber(sale.total), 0);
    const missingSalesCount = financialSummary?.missingCostSalesCount ?? raw.sales.filter((sale) => safeNumber((sale as any).total_cost) <= 0.0001).length;
    const coverage = resolveCostCoverage(coveredSalesTotal, uncoveredSalesTotal, missingSalesCount);
    const grossProfit = roundCurrency(coveredSalesTotal - totalCost);
    const operatingBalance = roundCurrency(totalSales - totalExpenses);
    const netProfit = coverage === 'complete'
      ? roundCurrency(grossProfit - totalExpenses)
      : null;
    const displayLabel = coverage === 'complete'
      ? 'Utilidad Neta'
      : coverage === 'partial'
        ? 'Resultado Operativo'
        : 'Balance Operativo';
    const displayValue = coverage === 'complete'
      ? roundCurrency(netProfit || 0)
      : coverage === 'partial'
        ? operatingBalance
        : operatingBalance;

    if (isPureOfflineRuntime() || shouldUseLocalOnly()) {
      return {
        sales: { total: totalSales, count: countSales },
        expenses: { total: totalExpenses, count: executedOperationalExpenses.length },
        costs: {
          total: roundCurrency(totalCost),
          coveredSalesTotal: roundCurrency(coveredSalesTotal),
          uncoveredSalesTotal: roundCurrency(uncoveredSalesTotal),
          missingSalesCount,
        },
        profit: {
          net: netProfit,
          gross: grossProfit,
          operatingBalance,
          coverage,
          displayLabel,
          displayValue,
        },
        health: financialSummary ? {
          overdueReceivables: financialSummary.overdueReceivables,
          overdueReceivableCustomersCount: financialSummary.receivableOverdueCustomersCount,
          dueSoonReceivables: financialSummary.dueSoonReceivables,
          receivableCustomersCount: financialSummary.receivableCustomersCount,
          marginPercent: financialSummary.margin,
          costedSalesTotal: financialSummary.costedSalesTotal,
          uncostedSalesTotal: financialSummary.uncostedSalesTotal,
          missingCostSalesCount: financialSummary.missingCostSalesCount,
          previousSalesTotal: financialSummary.previousSalesTotal,
          costCoverage: coverage,
          operatingBalance,
        } : undefined,
        degraded: false,
        issues: [],
      };
    }

    return {
      sales: { total: totalSales, count: countSales },
      expenses: { total: totalExpenses, count: executedOperationalExpenses.length },
      costs: {
        total: roundCurrency(totalCost),
        coveredSalesTotal: roundCurrency(coveredSalesTotal),
        uncoveredSalesTotal: roundCurrency(uncoveredSalesTotal),
        missingSalesCount,
      },
      profit: {
        net: netProfit,
        gross: grossProfit,
        operatingBalance,
        coverage,
        displayLabel,
        displayValue,
      },
      health: financialSummary ? {
        overdueReceivables: financialSummary.overdueReceivables,
        overdueReceivableCustomersCount: financialSummary.receivableOverdueCustomersCount,
        dueSoonReceivables: financialSummary.dueSoonReceivables,
        receivableCustomersCount: financialSummary.receivableCustomersCount,
        marginPercent: financialSummary.margin,
        costedSalesTotal: financialSummary.costedSalesTotal,
        uncostedSalesTotal: financialSummary.uncostedSalesTotal,
        missingCostSalesCount: financialSummary.missingCostSalesCount,
        previousSalesTotal: financialSummary.previousSalesTotal,
        costCoverage: coverage,
        operatingBalance,
      } : undefined,
      degraded: raw.degraded || financialResult.status === 'rejected',
      issues: issues.filter((issue, index, array) => index === array.findIndex((item) => item.dataset === issue.dataset && item.message === issue.message)),
    };
  }

  buildHealthScore(summary: AnalyticsSummary): HealthScore {
    const health = summary.health;
    const indicators: HealthScore['indicators'] = [];
    let score = 100;

    const marginPercent = health?.marginPercent ?? 0;
    if ((health?.overdueReceivableCustomersCount || 0) > 0 && (health?.overdueReceivables || 0) > 0) {
      score -= 25;
      indicators.push({
        label: 'Cartera vencida',
        status: 'warning',
        message: `Tienes ${health?.overdueReceivableCustomersCount} cliente(s) con saldo vencido por ${Math.round(health?.overdueReceivables || 0).toLocaleString()}.`,
      });
    } else {
      indicators.push({
        label: 'Cartera vencida',
        status: 'ok',
        message: 'No hay cartera vencida real en el negocio activo.',
      });
    }

    if ((health?.missingCostSalesCount || 0) > 0 || (health?.uncostedSalesTotal || 0) > 0.01) {
      score -= 20;
      indicators.push({
        label: 'Costo de ventas',
        status: 'warning',
        message: `Hay ${health?.missingCostSalesCount || 0} venta(s) sin costo confiable. La utilidad se calcula solo sobre ventas costadas.`,
      });
    } else {
      indicators.push({
        label: 'Costo de ventas',
        status: 'ok',
        message: 'La utilidad usa costos reales de ventas costadas.',
      });
    }

    if (health?.costCoverage !== 'complete') {
      score -= health?.costCoverage === 'partial' ? 10 : 20;
      indicators.push({
        label: 'Utilidad neta',
        status: 'warning',
        message: health?.costCoverage === 'partial'
          ? 'La utilidad neta no es totalmente confiable; se muestra margen bruto parcial sobre ventas costeadas.'
          : 'La utilidad neta no es estimable todavía porque faltan costos confiables en las ventas del periodo.',
      });
    } else if ((summary.profit.net || 0) < 0) {
      score -= 25;
      indicators.push({
        label: 'Utilidad neta',
        status: 'critical',
        message: 'La utilidad neta del periodo es negativa.',
      });
    } else if (marginPercent < 15) {
      score -= 10;
      indicators.push({
        label: 'Margen neto',
        status: 'warning',
        message: `El margen neto está en ${marginPercent.toFixed(1)}%.`,
      });
    } else {
      indicators.push({
        label: 'Margen neto',
        status: 'ok',
        message: `El margen neto está en ${marginPercent.toFixed(1)}%.`,
      });
    }

    score = Math.max(10, Math.min(100, score));
    return {
      score,
      status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'critical',
      indicators,
    };
  }

  async getSalesTrend(businessId: number, startDate: string, endDate: string) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    const { sales } = await this.fetchRawData(businessId, startDate, endDate);

    // Group by date
    const trendMap = new Map<string, { amount: number, count: number }>();
    
    // Initialize map with 0s for all days
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, 'yyyy-MM-dd');
        trendMap.set(dateStr, { amount: 0, count: 0 });
    }

    sales.forEach(s => {
      const dateStr = format(new Date(`${s.sale_date}T00:00:00`), 'yyyy-MM-dd');
      const current = trendMap.get(dateStr) || { amount: 0, count: 0 };
      trendMap.set(dateStr, { 
        amount: current.amount + s.total, 
        count: current.count + 1 
      });
    });

    const trend: SalesTrendPoint[] = Array.from(trendMap.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return { trend };
  }

  async getTopProducts(businessId: number, startDate: string, endDate: string) {
    const { sales } = await this.fetchRawData(businessId, startDate, endDate);
    
    const productMap = new Map<string, { id: number, name: string, qty: number, total: number }>();

    sales.forEach(sale => {
      sale.items.forEach(item => {
        const key = item.product_id ? String(item.product_id) : item.name;
        const current = productMap.get(key) || { 
            id: item.product_id || 0, 
            name: item.name, 
            qty: 0, 
            total: 0 
        };
        
        productMap.set(key, {
            ...current,
            qty: current.qty + item.qty,
            total: current.total + (item.total || (item.qty * item.unit_price))
        });
      });
    });

    const top_products = Array.from(productMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 10); // Top 10

    return top_products;
  }

  async getExpensesByCategory(businessId: number, startDate: string, endDate: string) {
    const { expenses } = await this.fetchRawData(businessId, startDate, endDate);
    const executedOperationalExpenses = expenses.filter((expense) => this.isOperationalExecutedExpense(expense));
    
    const categoryMap = new Map<string, number>();

    executedOperationalExpenses.forEach(e => {
        const category = e.category || 'Sin categoría';
        const current = categoryMap.get(category) || 0;
        categoryMap.set(category, current + e.amount);
    });

    const categories = Array.from(categoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total);

    return categories;
  }
  
  async getClientStats(businessId: number, startDate: string, endDate: string) {
     const { customers, sales } = await this.fetchRawData(businessId, startDate, endDate);
     
     // Map customers to stats
     const customerStats = customers.map(c => {
         const customerSales = sales.filter(s => s.customer_id === c.id);
         
         // Sort by date desc
         customerSales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
         
         const lastPurchase = customerSales.length > 0 ? customerSales[0].sale_date : null;
         const totalSpent = customerSales.reduce((sum, s) => sum + s.total, 0);
         
         return {
             ...c,
             last_purchase: lastPurchase,
             total_spent: totalSpent,
             purchase_count: customerSales.length
         };
     });
     
     // Sort by total spent desc by default
     return customerStats.sort((a, b) => b.total_spent - a.total_spent);
  }

  async getTeamPerformance(businessId: number, startDate: string, endDate: string) {
    try {
      const response = await api.get(`/businesses/${businessId}/analytics/team`, {
        params: { start_date: startDate, end_date: endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching team performance:', error);
      throw error;
    }
  }

  async getTeamExport(businessId: number, startDate: string, endDate: string) {
      try {
          const response = await api.get(`/businesses/${businessId}/export/team`, {
              params: { start_date: startDate, end_date: endDate },
              responseType: 'blob'
          });
          return response.data;
      } catch (error) {
          console.error('Error exporting team report:', error);
          throw error;
      }
  }

  // --- KPI Calculation & Aggregation ---

  async getKPIs(
    businessId: number, 
    currentPeriod: { startDate: string, endDate: string, label: string },
    prevPeriod: { startDate: string, endDate: string, label: string }
  ): Promise<KPI[]> {
    const emptySummary: AnalyticsSummary = {
      sales: { total: 0, count: 0 },
      expenses: { total: 0, count: 0 },
      costs: { total: 0, coveredSalesTotal: 0, uncoveredSalesTotal: 0, missingSalesCount: 0 },
      profit: {
        net: null,
        gross: 0,
        operatingBalance: 0,
        coverage: 'missing',
        displayLabel: 'Balance Operativo',
        displayValue: 0,
      },
      degraded: true,
      issues: [],
    };

    const [currentResult, prevResult] = await Promise.allSettled([
      this.getSummary(businessId, currentPeriod.startDate, currentPeriod.endDate),
      this.getSummary(businessId, prevPeriod.startDate, prevPeriod.endDate)
    ]);

    if (currentResult.status === 'rejected') {
      console.warn('Could not fetch current KPI summary:', currentResult.reason);
    }
    if (prevResult.status === 'rejected') {
      console.warn('Could not fetch previous KPI summary:', prevResult.reason);
    }

    const current = currentResult.status === 'fulfilled' ? currentResult.value : emptySummary;
    const prev = prevResult.status === 'fulfilled' ? prevResult.value : emptySummary;

    const calculateChange = (curr: number, prev: number) => {
      // Safety check for inputs
      const safeCurr = isNaN(curr) ? 0 : curr;
      const safePrev = isNaN(prev) ? 0 : prev;
      
      if (safePrev === 0) return safeCurr > 0 ? 100 : 0;
      return ((safeCurr - safePrev) / safePrev) * 100;
    };

    const kpis: KPI[] = [
      {
        id: 'sales',
        label: 'Ventas generadas',
        value: current.sales.total,
        previousValue: prev.sales.total,
        change: calculateChange(current.sales.total, prev.sales.total),
        trend: current.sales.total >= prev.sales.total ? 'up' : 'down',
        format: 'currency' as const
      },
      {
        id: 'costs',
        label: current.profit.coverage === 'complete' ? 'Costo de ventas' : 'Costo costeado',
        value: current.costs.total,
        previousValue: prev.costs.total,
        change: calculateChange(current.costs.total, prev.costs.total),
        trend: current.costs.total <= prev.costs.total ? 'up' : 'down',
        format: 'currency' as const,
        inverse: true,
      },
      {
        id: 'expenses',
        label: 'Gasto Operativo Ejecutado',
        value: current.expenses.total,
        previousValue: prev.expenses.total,
        change: calculateChange(current.expenses.total, prev.expenses.total),
        trend: current.expenses.total <= prev.expenses.total ? 'up' : 'down',
        format: 'currency' as const,
        inverse: true
      },
      {
        id: 'gross-profit',
        label: current.profit.coverage === 'complete' ? 'Utilidad Bruta' : 'Margen Bruto Parcial',
        value: current.profit.gross,
        previousValue: prev.profit.gross,
        change: calculateChange(current.profit.gross, prev.profit.gross),
        trend: current.profit.gross >= prev.profit.gross ? 'up' : 'down',
        format: 'currency' as const
      },
      {
        id: 'profit',
        label: current.profit.displayLabel,
        value: current.profit.displayValue,
        previousValue: current.profit.coverage === 'complete' && prev.profit.coverage === 'complete' && prev.profit.net != null ? prev.profit.net : undefined,
        change: current.profit.coverage === 'complete' && prev.profit.coverage === 'complete' && current.profit.net != null && prev.profit.net != null
          ? calculateChange(current.profit.net, prev.profit.net)
          : undefined,
        trend: current.profit.coverage === 'complete'
          ? ((current.profit.net || 0) >= (prev.profit.net || 0) ? 'up' : 'down')
          : 'neutral',
        format: typeof current.profit.displayValue === 'number' ? 'currency' as const : undefined
      },
      {
        id: 'ticket',
        label: 'Ticket Promedio',
        value: current.sales.count > 0 ? current.sales.total / current.sales.count : 0,
        previousValue: prev.sales.count > 0 ? prev.sales.total / prev.sales.count : 0,
        change: 0, 
        trend: 'neutral',
        format: 'currency' as const
      }
    ];

    return kpis.map((kpi) => ({
        ...kpi,
        change: kpi.id === 'ticket' && typeof kpi.value === 'number' ? calculateChange(kpi.value, kpi.previousValue || 0) : kpi.change,
        trend: kpi.id === 'ticket' && typeof kpi.value === 'number'
          ? (kpi.value >= (kpi.previousValue || 0) ? 'up' : 'down')
          : kpi.trend
    }));
  }

  // --- Insights Generation ---

  generateInsights(kpis: KPI[], topProducts: any[]): Insight[] {
    const insights: Insight[] = [];

    // Sales Insight
    const salesKPI = kpis.find(k => k.id === 'sales');
    if (salesKPI) {
      const salesChange = typeof salesKPI.change === 'number' ? salesKPI.change : null;
      if (salesChange !== null && salesChange > 10) {
        insights.push({
          id: 'sales-growth',
          type: 'positive',
          title: 'Crecimiento de Ingresos',
          description: `Tus ingresos han aumentado un ${salesChange.toFixed(1)}% respecto al periodo anterior.`,
          metric: 'sales'
        });
      } else if (salesChange !== null && salesChange < -10) {
        insights.push({
          id: 'sales-drop',
          type: 'negative',
          title: 'Caída de Ingresos',
          description: `Tus ingresos han disminuido un ${Math.abs(salesChange).toFixed(1)}%. Revisa tus estrategias de venta.`,
          metric: 'sales'
        });
      }
    }

    // Product Insight
    if (topProducts.length > 0) {
      const top = topProducts[0];
      insights.push({
        id: 'top-product',
        type: 'neutral',
        title: 'Producto Estrella',
        description: `"${top.name}" es tu producto más vendido, representando una parte significativa de tus ingresos.`,
        metric: 'products'
      });
    }

    // Profit Insight
    const profitKPI = kpis.find(k => k.id === 'profit');
    if (profitKPI && typeof profitKPI.value === 'number' && profitKPI.value < 0) {
       insights.push({
         id: 'loss-warning',
         type: 'warning',
         title: 'Pérdida Operativa',
         description: 'Tus gastos superan a tus ingresos en este periodo. Revisa tus costos fijos.',
         metric: 'profit'
       });
    }

    return insights;
  }

  // --- Simple Forecast (projection) ---
  calculateForecast(currentTotal: number, daysElapsed: number, totalDaysInPeriod: number, coverage: AnalyticsCostCoverage = 'missing'): Forecast {
    const safeElapsed = Math.max(1, daysElapsed || 0);
    const safeTotalDays = Math.max(safeElapsed, totalDaysInPeriod || 0);
    const dailyAvg = currentTotal / safeElapsed;
    const projectedRevenue = dailyAvg * safeTotalDays;
    const ratio = Math.min(1, safeElapsed / safeTotalDays);
    const level = 0.5 + 0.45 * ratio;
    const margin = 0.15 * (1 - ratio);
    const min = projectedRevenue * (1 - margin);
    const max = projectedRevenue * (1 + margin);
    const projectedResult = coverage === 'complete'
      ? projectedRevenue * 0.25
      : coverage === 'partial'
        ? projectedRevenue * 0.18
        : projectedRevenue;
    const resultLabel = coverage === 'complete'
      ? 'Utilidad neta estimada'
      : coverage === 'partial'
        ? 'Margen bruto parcial estimado'
        : 'Ventas estimadas';
    const suggestions: string[] = [
      'Refuerza campañas en días de baja',
      'Impulsa productos con mayor margen',
      'Optimiza gastos fijos esta semana'
    ];
    return {
      projectedRevenue: Math.round(projectedRevenue),
      projectedResult: Math.round(projectedResult),
      resultLabel,
      confidence: { min: Math.round(min), max: Math.round(max), level: Math.round(level * 100) / 100 },
      trend: projectedRevenue >= currentTotal ? 'up' : 'down',
      suggestions
    };
  }

  // --- Export Methods ---

  /**
   * Genera un reporte y devuelve el archivo directamente como Blob.
   * @param businessId
   * @param reportType 'sales' | 'expenses' | 'combined'
   * @param params Query parameters (startDate, endDate, type for combined)
   */
  async downloadExportReport(businessId: number, reportType: 'sales' | 'expenses' | 'combined', params: any = {}): Promise<DownloadedFilePayload> {
    let endpoint = '';
    
    if (reportType === 'sales') {
        endpoint = `/businesses/${businessId}/export/sales`;
    } else if (reportType === 'expenses') {
        endpoint = `/businesses/${businessId}/export/expenses`;
    } else {
        endpoint = `/businesses/${businessId}/export/combined`;
    }

    try {
        return await requestGeneratedFile(endpoint, params, 'reporte.xlsx');

    } catch (error) {
        console.error('Error downloading export report:', error);
        throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
export type { KPI, Insight, Forecast, SalesTrendPoint, HealthScore, ExpenseCategory, TopProduct } from '../types/analytics';
export type { AnalyticsDegradationIssue, AnalyticsSummary };
