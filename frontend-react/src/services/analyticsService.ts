import { 
  KPI, 
  Insight, 
  Forecast, 
  SalesTrendPoint
} from '../types/analytics';
import { Sale, Expense, Customer } from '../types';
import api from './api';

class AnalyticsService {
  
  // --- Data Fetching (Raw) ---

  private async fetchRawData(businessId: number, startDate: string, endDate: string) {
    try {
      const [salesRes, expensesRes, customersRes, debtorsRes] = await Promise.all([
        api.get(`/businesses/${businessId}/sales`, { params: { start_date: startDate, end_date: endDate } }),
        api.get(`/businesses/${businessId}/expenses`, { params: { start_date: startDate, end_date: endDate } }),
        api.get(`/businesses/${businessId}/customers`),
        api.get(`/businesses/${businessId}/customers/debtors`)
      ]);

      const sales: Sale[] = salesRes.data.sales || [];
      const expenses: Expense[] = expensesRes.data.expenses || [];
      const customersRaw: Customer[] = customersRes.data.customers || [];
      const debtors: any[] = debtorsRes.data.debtors || [];

      // Create map of debtors for O(1) access
      const debtorMap = new Map(debtors.map((d: any) => [d.id, d]));
      const today = new Date();

      // Merge balance info into customers
      const customers: Customer[] = customersRaw.map(c => {
        const debtor = debtorMap.get(c.id);
        let isOverdue = false;
        
        if (debtor && debtor.since) {
             const sinceDate = new Date(debtor.since);
             const days = Math.floor((today.getTime() - sinceDate.getTime()) / (1000 * 60 * 60 * 24));
             isOverdue = days > 30;
        }

        return {
          ...c,
          balance: debtor ? debtor.balance : 0,
          oldest_due_date: debtor ? debtor.since : undefined,
          is_overdue: isOverdue 
        } as Customer;
      });

      return { sales, expenses, customers };
    } catch (error) {
      console.error('Error fetching raw data:', error);
      return { sales: [], expenses: [], customers: [] };
    }
  }

  // --- Public Methods (Aggregators) ---

  async getSummary(businessId: number, startDate: string, endDate: string) {
    const { sales, expenses } = await this.fetchRawData(businessId, startDate, endDate);
    
    const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
    const countSales = sales.length;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = totalSales - totalExpenses;

    return {
      sales: { total: totalSales, count: countSales },
      expenses: { total: totalExpenses, count: expenses.length },
      profit: { net: netProfit, gross: totalSales } // Gross simplified as total sales for now
    };
  }

  async getSalesTrend(businessId: number, days: number = 30) {
    // Calculate dates based on days
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);
    
    const startDate = start.toISOString().split('T')[0];
    const endDate = end.toISOString().split('T')[0];

    const { sales } = await this.fetchRawData(businessId, startDate, endDate);

    // Group by date
    const trendMap = new Map<string, { amount: number, count: number }>();
    
    // Initialize map with 0s for all days
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        trendMap.set(dateStr, { amount: 0, count: 0 });
    }

    sales.forEach(s => {
      const dateStr = new Date(s.sale_date).toISOString().split('T')[0];
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
    
    const categoryMap = new Map<string, number>();

    expenses.forEach(e => {
        const current = categoryMap.get(e.category) || 0;
        categoryMap.set(e.category, current + e.amount);
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

  // --- KPI Calculation & Aggregation ---

  async getKPIs(
    businessId: number, 
    currentPeriod: { startDate: string, endDate: string, label: string },
    prevPeriod: { startDate: string, endDate: string, label: string }
  ): Promise<KPI[]> {
    
    // Fetch both periods
    const [current, prev] = await Promise.all([
      this.getSummary(businessId, currentPeriod.startDate, currentPeriod.endDate),
      this.getSummary(businessId, prevPeriod.startDate, prevPeriod.endDate)
    ]);

    const calculateChange = (curr: number, prev: number) => {
      // Safety check for inputs
      const safeCurr = isNaN(curr) ? 0 : curr;
      const safePrev = isNaN(prev) ? 0 : prev;
      
      if (safePrev === 0) return safeCurr > 0 ? 100 : 0;
      return ((safeCurr - safePrev) / safePrev) * 100;
    };

    return [
      {
        id: 'sales',
        label: 'Ingresos Totales',
        value: current.sales.total,
        previousValue: prev.sales.total,
        change: calculateChange(current.sales.total, prev.sales.total),
        trend: current.sales.total >= prev.sales.total ? 'up' : 'down',
        format: 'currency' as const
      },
      {
        id: 'expenses',
        label: 'Gastos Operativos',
        value: current.expenses.total,
        previousValue: prev.expenses.total,
        change: calculateChange(current.expenses.total, prev.expenses.total),
        trend: current.expenses.total <= prev.expenses.total ? 'up' : 'down', 
        format: 'currency' as const,
        inverse: true 
      },
      {
        id: 'profit',
        label: 'Utilidad Neta',
        value: current.profit.net,
        previousValue: prev.profit.net,
        change: calculateChange(current.profit.net, prev.profit.net),
        trend: current.profit.net >= prev.profit.net ? 'up' : 'down',
        format: 'currency' as const
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
    ].map(kpi => ({
        ...kpi,
        change: kpi.id === 'ticket' ? calculateChange(kpi.value, kpi.previousValue || 0) : kpi.change,
        trend: kpi.value >= (kpi.previousValue || 0) ? 'up' : 'down'
    }));
  }

  // --- Insights Generation ---

  generateInsights(kpis: KPI[], topProducts: any[]): Insight[] {
    const insights: Insight[] = [];

    // Sales Insight
    const salesKPI = kpis.find(k => k.id === 'sales');
    if (salesKPI) {
      if (salesKPI.change > 10) {
        insights.push({
          id: 'sales-growth',
          type: 'positive',
          title: 'Crecimiento de Ingresos',
          description: `Tus ingresos han aumentado un ${salesKPI.change.toFixed(1)}% respecto al periodo anterior.`,
          metric: 'sales'
        });
      } else if (salesKPI.change < -10) {
        insights.push({
          id: 'sales-drop',
          type: 'negative',
          title: 'Caída de Ingresos',
          description: `Tus ingresos han disminuido un ${Math.abs(salesKPI.change).toFixed(1)}%. Revisa tus estrategias de venta.`,
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
    if (profitKPI && profitKPI.value < 0) {
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
  calculateForecast(currentTotal: number, daysElapsed: number, totalDaysInPeriod: number): Forecast {
    const safeElapsed = Math.max(1, daysElapsed || 0);
    const safeTotalDays = Math.max(safeElapsed, totalDaysInPeriod || 0);
    const dailyAvg = currentTotal / safeElapsed;
    const projectedRevenue = dailyAvg * safeTotalDays;
    const ratio = Math.min(1, safeElapsed / safeTotalDays);
    const level = 0.5 + 0.45 * ratio;
    const margin = 0.15 * (1 - ratio);
    const min = projectedRevenue * (1 - margin);
    const max = projectedRevenue * (1 + margin);
    const projectedProfit = projectedRevenue * 0.25;
    const suggestions: string[] = [
      'Refuerza campañas en días de baja',
      'Impulsa productos con mayor margen',
      'Optimiza gastos fijos esta semana'
    ];
    return {
      projectedRevenue: Math.round(projectedRevenue),
      projectedProfit: Math.round(projectedProfit),
      confidence: { min: Math.round(min), max: Math.round(max), level: Math.round(level * 100) / 100 },
      trend: projectedRevenue >= currentTotal ? 'up' : 'down',
      suggestions
    };
  }

  // --- Export Methods ---

  /**
   * Generates a report and returns the download URL.
   * @param businessId 
   * @param reportType 'sales' | 'expenses' | 'combined'
   * @param params Query parameters (startDate, endDate, type for combined)
   */
  async getExportUrl(businessId: number, reportType: 'sales' | 'expenses' | 'combined', params: any = {}): Promise<string> {
    let endpoint = '';
    
    if (reportType === 'sales') {
        endpoint = `/businesses/${businessId}/export/sales`;
    } else if (reportType === 'expenses') {
        endpoint = `/businesses/${businessId}/export/expenses`;
    } else {
        endpoint = `/businesses/${businessId}/export/combined`;
    }

    try {
        const response = await api.get(endpoint, { params });
        // The backend returns { download_url: "/api/download/filename.xlsx" }
        const downloadPath = response.data.download_url;
        
        // If the path is already absolute, return it
        if (downloadPath.startsWith('http')) return downloadPath;
        
        // FIX: Ensure absolute URL for mobile downloads
        // Get baseURL from the current axios instance
        let baseURL = api.defaults.baseURL || '';
        
        // If baseURL is relative (e.g. '/api'), try to make it absolute using current window location
        // or stored configuration
        if (!baseURL.startsWith('http')) {
            // Check if we have a stored base URL (from login screen configuration)
            const storedBase = localStorage.getItem('API_BASE_URL');
            if (storedBase) {
                baseURL = storedBase;
            } else if (typeof window !== 'undefined') {
                 // Fallback to window origin if no config
                 baseURL = window.location.origin + (baseURL.startsWith('/') ? baseURL : `/${baseURL}`);
            }
        }
        
        // Clean trailing slash from base and leading slash from path to avoid double slashes
        const cleanBase = baseURL.replace(/\/$/, '');
        const cleanPath = downloadPath.startsWith('/') ? downloadPath : `/${downloadPath}`;
        
        console.log('🔗 Generated Export URL:', `${cleanBase}${cleanPath}`);
        
        return `${cleanBase}${cleanPath}`;

    } catch (error) {
        console.error('Error getting export URL:', error);
        throw error;
    }
  }
}

export const analyticsService = new AnalyticsService();
export type { KPI, Insight, Forecast, SalesTrendPoint, HealthScore, ExpenseCategory, TopProduct } from '../types/analytics';
