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
      const [salesRes, expensesRes, customersRes] = await Promise.all([
        api.get(`/businesses/${businessId}/sales`),
        api.get(`/businesses/${businessId}/expenses`, { params: { start_date: startDate, end_date: endDate } }),
        api.get(`/businesses/${businessId}/customers`)
      ]);

      const allSales: Sale[] = salesRes.data.sales || [];
      const expenses: Expense[] = expensesRes.data.expenses || [];
      const customersRaw: Customer[] = customersRes.data.customers || [];

      // Filter sales by date client-side to be safe
      const start = new Date(startDate);
      const end = new Date(endDate);
      // Adjust end date to include the full day
      end.setHours(23, 59, 59, 999);

      const sales = allSales.filter(s => {
        const d = new Date(s.sale_date);
        return d >= start && d <= end;
      });

      // Filter expenses just in case backend didn't
      const filteredExpenses = expenses.filter(e => {
        const d = new Date(e.expense_date);
        return d >= start && d <= end;
      });

      // Enrich customers with receivable balances computed from allSales (lifetime outstanding)
      const balanceByCustomer = new Map<number, { balance: number; oldest?: string; is_overdue?: boolean }>();
      const today = new Date();
      allSales.forEach(s => {
        const cid = s.customer_id || 0;
        if (cid && s.balance > 0) {
          const entry = balanceByCustomer.get(cid) || { balance: 0 };
          const saleDate = new Date(s.sale_date);
          const oldest = entry.oldest && new Date(entry.oldest) < saleDate ? entry.oldest : s.sale_date;
          // Consider overdue if older than 30 days
          const days = Math.floor((today.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24));
          const isOverdue = days > 30;
          balanceByCustomer.set(cid, { 
            balance: entry.balance + s.balance, 
            oldest, 
            is_overdue: (entry.is_overdue || false) || isOverdue 
          });
        }
      });

      const customers: Customer[] = customersRaw.map(c => {
        const b = balanceByCustomer.get(c.id);
        return {
          ...c,
          balance: b?.balance || c.balance || 0,
          oldest_due_date: b?.oldest || c.oldest_due_date,
          is_overdue: typeof c.is_overdue === 'boolean' ? c.is_overdue : (b?.is_overdue || false),
        } as Customer;
      });

      return { sales, expenses: filteredExpenses, customers, allSales }; // Return allSales for lifetime stats if needed
    } catch (error) {
      console.error('Error fetching raw data:', error);
      return { sales: [], expenses: [], customers: [], allSales: [] };
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
     const { customers, allSales } = await this.fetchRawData(businessId, startDate, endDate);
     
     // Map customers to stats
     const customerStats = customers.map(c => {
         // Find all sales for this customer (ever, or in range? Usually LTV is better for "Client Stats")
         // But for "Active Clients (30d)" we need range check.
         // Let's attach metadata based on *all* sales for robust "Last Purchase" info.
         
         const customerSales = allSales.filter(s => s.customer_id === c.id);
         
         // Sort by date desc
         customerSales.sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
         
         const lastPurchase = customerSales.length > 0 ? customerSales[0].sale_date : null;
         const totalSpent = customerSales.reduce((sum, s) => sum + s.total, 0); // Lifetime value
         
         // Check if active in current range (optional, handled by UI filters if needed)
         
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
      if (prev === 0) return curr > 0 ? 100 : 0;
      return ((curr - prev) / prev) * 100;
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
}

export const analyticsService = new AnalyticsService();
export type { KPI, Insight, Forecast, SalesTrendPoint, HealthScore, ExpenseCategory, TopProduct } from '../types/analytics';
