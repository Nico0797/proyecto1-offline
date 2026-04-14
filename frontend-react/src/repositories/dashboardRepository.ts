import api from '../services/api';
import { reminderService } from '../services/reminderService';
import { rawInventoryService } from '../services/rawInventoryService';
import { profitabilityService } from '../services/profitabilityService';
import { hasOfflineSessionSeed } from '../services/offlineSession';
import { isOfflineProductMode } from '../runtime/runtimeMode';
import {
  buildLocalReceivablesOverview,
  isPureOfflineRuntime,
  readCompatibleOfflineExpenses,
  readOfflineProducts,
  readOfflineSales,
} from '../services/offlineLocalData';
import type { ProfitabilitySummary, Product, Sale } from '../types';

type DashboardLoadOptions = {
  businessId: number;
  canViewSummary: boolean;
  canManageReminders: boolean;
  canViewRawInventory: boolean;
  canViewProfitability: boolean;
  canViewSales: boolean;
  canViewExpenses: boolean;
  monthRange: { start: string; end: string } | null;
};

type DashboardLoadResult = {
  dashboardData: any;
  remindersData: any[];
  lowStockCount: number;
  profitSummary: ProfitabilitySummary | null;
};

const DASHBOARD_LOCAL_LOAD_TIMEOUT_MS = 3500;
const DASHBOARD_REMOTE_LOAD_TIMEOUT_MS = 5000;

const shouldUseLocalOnly = () => isOfflineProductMode() || (!localStorage.getItem('token') && hasOfflineSessionSeed());

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });

const getTodayString = () => {
  const currentDate = new Date();
  return `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
};

const buildTopProducts = (sales: Sale[], products: Product[]) => {
  const productMap = new Map(products.map((product) => [product.id, product]));
  const totalsByProduct = new Map<number, { quantity: number; revenue: number; name: string }>();

  sales.forEach((sale) => {
    (sale.items || []).forEach((item: any) => {
      const productId = Number(item.product_id || item.id || 0);
      if (!productId) return;
      const current = totalsByProduct.get(productId) || {
        quantity: 0,
        revenue: 0,
        name: item.product_name || item.name || productMap.get(productId)?.name || 'Producto',
      };
      current.quantity += Number(item.quantity || 0);
      current.revenue += Number(item.subtotal || item.total || 0);
      totalsByProduct.set(productId, current);
    });
  });

  return Array.from(totalsByProduct.entries())
    .map(([productId, summary]) => ({
      product_id: productId,
      product_name: summary.name,
      quantity_sold: summary.quantity,
      total_sales: summary.revenue,
    }))
    .sort((left, right) => right.total_sales - left.total_sales)
    .slice(0, 5);
};

const buildLocalDashboardData = async (options: DashboardLoadOptions): Promise<DashboardLoadResult> => {
  const { businessId, canViewSummary } = options;
  const today = getTodayString();
  const [sales, products, receivablesOverview] = await Promise.all([
    readOfflineSales(businessId),
    readOfflineProducts(businessId),
    buildLocalReceivablesOverview(businessId),
  ]);
  const expenses = readCompatibleOfflineExpenses(businessId);

  const todaysSales = sales
    .filter((sale) => (sale.sale_date || '').startsWith(today))
    .sort((left, right) => new Date(right.sale_date).getTime() - new Date(left.sale_date).getTime());
  const todaysExpenses = expenses.filter((expense) => (expense.expense_date || '').startsWith(today));
  const todaysCollected = todaysSales.reduce((sum, sale) => sum + Number(sale.amount_paid ?? sale.collected_amount ?? sale.total ?? 0), 0);

  const summary = canViewSummary
    ? {
        sales: {
          total: todaysSales.reduce((sum, sale) => sum + Number(sale.total || 0), 0),
          count: todaysSales.length,
        },
        expenses: {
          total: todaysExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
          count: todaysExpenses.length,
        },
        cash_flow: {
          in: todaysCollected,
          out: todaysExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0),
        },
        accounts_receivable: receivablesOverview.summary.total_pending || 0,
      }
    : {};

  return {
    dashboardData: {
      summary,
      dashboard: {
        recent_sales: todaysSales.slice(0, 10),
        fiados_alerts: {
          customers_count: receivablesOverview.summary.customers_with_balance || 0,
        },
        top_products: buildTopProducts(sales, products),
      },
    },
    remindersData: [],
    lowStockCount: 0,
    profitSummary: null,
  };
};

const buildSafeDashboardResult = (): DashboardLoadResult => ({
  dashboardData: {
    summary: {
      sales: { total: 0, count: 0 },
      expenses: { total: 0, count: 0 },
      cash_flow: { in: 0, out: 0 },
      accounts_receivable: 0,
    },
    dashboard: {
      recent_sales: [],
      fiados_alerts: { customers_count: 0 },
      top_products: [],
    },
  },
  remindersData: [],
  lowStockCount: 0,
  profitSummary: null,
});

export const dashboardRepository = {
  async load(options: DashboardLoadOptions): Promise<DashboardLoadResult> {
    if (isPureOfflineRuntime() || shouldUseLocalOnly()) {
      try {
        return await withTimeout(
          buildLocalDashboardData(options),
          DASHBOARD_LOCAL_LOAD_TIMEOUT_MS,
          'Timed out loading dashboard local data'
        );
      } catch (error) {
        console.error('[dashboardRepository] local load failed', error);
        return buildSafeDashboardResult();
      }
    }

    try {
      const [dashboardData, remindersData, lowStockCount, profitSummary] = await withTimeout(
        Promise.all([
          options.canViewSummary
            ? api.get(`/businesses/${options.businessId}/dashboard`)
                .then((response) => response.data || {})
                .catch((error) => {
                  console.warn('Dashboard stats failed', error);
                  return {};
                })
            : Promise.resolve({}),
          options.canManageReminders
            ? reminderService.list(options.businessId)
                .then((reminders) => reminders.filter((reminder) => reminder.status === 'active'))
                .catch((error) => {
                  console.warn('Reminders failed', error);
                  return [] as any[];
                })
            : Promise.resolve([] as any[]),
          options.canViewRawInventory
            ? rawInventoryService.list(options.businessId, { low_stock_only: true }, { silenceNotFound: true })
                .then((lowStockMaterials) => lowStockMaterials.length)
                .catch((error) => {
                  console.warn('Raw inventory low stock failed', error);
                  return 0;
                })
            : Promise.resolve(0),
          options.canViewProfitability && options.monthRange
            ? profitabilityService.getSummary(options.businessId, {
                start_date: options.monthRange.start,
                end_date: options.monthRange.end,
              }, { silenceNotFound: true }).catch((error) => {
                console.warn('Profitability dashboard loading failed', error);
                return null;
              })
            : Promise.resolve(null),
        ]),
        DASHBOARD_REMOTE_LOAD_TIMEOUT_MS,
        'Timed out loading dashboard remote data'
      );

      const data = dashboardData || {};
      const today = getTodayString();

      if (!data.summary || typeof data.summary !== 'object') data.summary = {};
      const summary = data.summary;

      const needsSalesFallback = (summary.sales == null || typeof summary.sales.total !== 'number') && options.canViewSales;
      const needsExpensesFallback = (summary.expenses == null || typeof summary.expenses.total !== 'number') && options.canViewExpenses;

      const [salesFallback, expensesFallback] = await Promise.all([
        needsSalesFallback
          ? api.get(`/businesses/${options.businessId}/sales`, { params: { start_date: today, end_date: today } })
              .then((response) => response.data.sales || [])
              .catch((error) => {
                console.warn('Could not load sales for dashboard', error);
                return null;
              })
          : Promise.resolve(null),
        needsExpensesFallback
          ? api.get(`/businesses/${options.businessId}/expenses`, { params: { start_date: today, end_date: today } })
              .then((response) => response.data.expenses || [])
              .catch((error) => {
                console.warn('Could not load expenses for dashboard', error);
                return null;
              })
          : Promise.resolve(null),
      ]);

      if (needsSalesFallback) {
        if (salesFallback) {
          const todaysSales = salesFallback.filter((sale: any) => (sale.sale_date || '').startsWith(today));
          summary.sales = {
            total: todaysSales.reduce((sum: number, sale: any) => sum + (sale.total || 0), 0),
            count: todaysSales.length,
          };
          data.dashboard = data.dashboard || {};
          data.dashboard.recent_sales = todaysSales
            .sort((left: any, right: any) => new Date(right.sale_date).getTime() - new Date(left.sale_date).getTime())
            .slice(0, 10);
        } else {
          summary.sales = { total: 0, count: 0 };
        }
      }

      if (needsExpensesFallback) {
        summary.expenses = expensesFallback
          ? {
              total: expensesFallback.reduce((sum: number, expense: any) => sum + (expense.amount || 0), 0),
              count: expensesFallback.length,
            }
          : { total: 0, count: 0 };
      }

      if (summary.cash_flow == null) {
        summary.cash_flow = { in: 0, out: 0 };
      }

      return {
        dashboardData: data,
        remindersData,
        lowStockCount,
        profitSummary,
      };
    } catch (error: any) {
      if (error?.isOfflineRequestError || !error?.response) {
        try {
          return await withTimeout(
            buildLocalDashboardData(options),
            DASHBOARD_LOCAL_LOAD_TIMEOUT_MS,
            'Timed out loading dashboard local fallback data'
          );
        } catch (localError) {
          console.error('[dashboardRepository] offline fallback failed', localError);
          return buildSafeDashboardResult();
        }
      }
      console.error('[dashboardRepository] remote load failed', error);
      return buildSafeDashboardResult();
    }
  },
};
