import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBusinessStore } from '../store/businessStore';
import { useAuthStore } from '../store/authStore';
import { useAlertsSnoozeStore } from '../store/alertsSnooze.store';
import { useAlertsStore } from '../store/alertsStore';
import { pushBootTrace } from '../debug/bootTrace';
import { useDebugFlag } from '../debug/debugFlags';
import { getRuntimeModeSnapshot, isOfflineProductMode } from '../runtime/runtimeMode';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { CreateSaleModal } from '../components/Sales/CreateSaleModal';
import { CreateExpenseModal } from '../components/Expenses/CreateExpenseModal';
import { CreateBusinessModal } from '../components/Business/CreateBusinessModal';
import { RemindersTab } from '../components/Dashboard/RemindersTab';
import { BalanceTab } from '../components/Dashboard/BalanceTab';
import { ServiceKpisPanel } from '../components/Dashboard/ServiceKpisPanel';
import { AnalyticsTab } from '../components/Analytics/AnalyticsTab';
import { ProGate } from '../components/ui/ProGate';
import { FEATURES } from '../auth/plan';
import { SwipePager } from '../components/ui/SwipePager';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { PageHeader, PageLayout } from '../components/Layout/PageLayout';
import {
  MobileSummaryDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
} from '../components/mobile/MobileContentFirst';
import { isBackendCapabilitySupported } from '../config/backendCapabilities';
import { ProfitabilitySummary } from '../types';
import { buildInfo } from '../generated/buildInfo';
import { resolveApiBaseUrl } from '../services/apiBase';
import { getPeriodRange } from '../utils/dateRange.utils';
import { cn } from '../utils/cn';
import { getBusinessBaseState, getBusinessInitialSetup } from '../config/businessPersonalization';
import { useNavigationPreferences } from '../store/navigationPreferences.store';
import { resolveBusinessNavigationState, resolveDashboardHomeState } from '../navigation/navigationPersonalization';
import { useAccess } from '../hooks/useAccess';
import { dashboardRepository } from '../repositories/dashboardRepository';
import {
  AlertTriangle,
  ShoppingCart,
  Wallet,
  Save,
  BarChart2,
  Calendar,
  Bell,
  TrendingUp,
  ArrowRight,
  Sparkles
} from 'lucide-react';

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString();
};

export const Dashboard = () => {
  const DASHBOARD_LOAD_WATCHDOG_MS = 4500;
  const { activeBusiness, fetchBusinesses } = useBusinessStore();
  const { hasPermission, hasModule, canAccess } = useAccess();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [dashboardDebug, setDashboardDebug] = useState<{
    loaded: boolean;
    failed: boolean;
    error: string;
    salesCount: number;
    expensesCount: number;
    recentSalesCount: number;
    topProductsCount: number;
  }>({
    loaded: false,
    failed: false,
    error: '',
    salesCount: 0,
    expensesCount: 0,
    recentSalesCount: 0,
    topProductsCount: 0,
  });
  const { user } = useAuthStore();
  const { alerts } = useAlertsStore();
  const snooze = useAlertsSnoozeStore();
  // Tabs
  const [activeTab, setActiveTab] = useState<string>('hoy');
  const [activeRemindersCount, setActiveRemindersCount] = useState(0);
  const [rawInventoryLowStockCount, setRawInventoryLowStockCount] = useState(0);
  const [profitabilitySummary, setProfitabilitySummary] = useState<ProfitabilitySummary | null>(null);
  const currentLoadRequestIdRef = useRef(0);
  const loadWatchdogTimeoutRef = useRef<number | null>(null);

  // Modals
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCreateBusinessModalOpen, setIsCreateBusinessModalOpen] = useState(false);
  const showDashboardDebug = useDebugFlag('dashboard');

  // Cash Register (Caja Hoy)
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [tempBalance, setTempBalance] = useState('');
  const offlineProductMode = isOfflineProductMode();
  const hasSalesModule = hasModule('sales');
  const hasAccountsReceivableModule = hasModule('accounts_receivable');
  const hasReportsModule = hasModule('reports');
  const hasRawInventoryModule = hasModule('raw_inventory');
  const canAccessDashboardAnalytics = hasReportsModule && hasPermission('analytics.view') && canAccess(FEATURES.DASHBOARD_ANALYTICS);
  const canIncludeDashboardAnalyticsInHome = offlineProductMode
    ? canAccess(FEATURES.DASHBOARD_ANALYTICS)
    : canAccessDashboardAnalytics;
  const canViewSummary = hasPermission('reports.view');
  const canViewExpenses = hasPermission('expenses.view');
  const canViewSales = hasSalesModule && hasPermission('sales.view');
  const canViewRawInventory = hasRawInventoryModule && hasPermission('raw_inventory.view') && isBackendCapabilitySupported('raw_inventory');
  const canViewProfitability = canAccessDashboardAnalytics && hasPermission('sales.view') && isBackendCapabilitySupported('profitability');
  const businessBaseState = getBusinessBaseState(activeBusiness);
  const initialSetup = useMemo(() => getBusinessInitialSetup(activeBusiness), [activeBusiness]);
  const getScopeKey = useNavigationPreferences((state) => state.getScopeKey);
  const preferencesByScope = useNavigationPreferences((state) => state.preferencesByScope);
  const getPreferences = useNavigationPreferences((state) => state.getPreferences);
  const scopeKey = useMemo(() => getScopeKey(user?.id, activeBusiness?.id), [activeBusiness?.id, getScopeKey, user?.id]);
  const storedNavigationPreferences = preferencesByScope[scopeKey];
  const resolvedNavigationPreferences = useMemo(
    () => getPreferences(scopeKey),
    [getPreferences, preferencesByScope, scopeKey]
  );

  const navigationState = useMemo(
    () =>
      resolveBusinessNavigationState({
        business: activeBusiness,
        storedPreferences: storedNavigationPreferences ?? resolvedNavigationPreferences,
        hasPermission,
        hasModule,
        canAccessFeature: canAccess,
      }),
    [activeBusiness, canAccess, hasModule, hasPermission, resolvedNavigationPreferences, storedNavigationPreferences]
  );
  const { availableItems, visibleItems } = navigationState;

  const canManageReminders = hasPermission('reminders.manage');
  const dashboardHomeState = useMemo(
    () =>
      resolveDashboardHomeState({
        navigationState,
        initialDashboardTab: initialSetup.initial_dashboard_tab || 'hoy',
        canManageReminders,
        additionalAvailablePanels: canIncludeDashboardAnalyticsInHome ? ['analiticas'] : [],
      }),
    [canIncludeDashboardAnalyticsInHome, canManageReminders, initialSetup.initial_dashboard_tab, navigationState]
  );
  const { availableTabs, canViewBalance, canViewAnalytics, initialTab: resolvedDashboardTab, priorityPanels } = dashboardHomeState;
  const canQuickCreateSale = hasSalesModule && hasPermission('sales.create') && visibleItems.some((item) => item.path === '/sales');
  const canQuickCreateExpense = hasPermission('expenses.create') && visibleItems.some((item) => item.path === '/expenses');
  const canOpenAlertsPanel = visibleItems.some((item) => item.path === '/alerts');
  const canOpenReportsPanel = visibleItems.some((item) => item.path === '/reports');
  const canOpenPaymentsPanel = visibleItems.some((item) => item.path === '/payments');
  const canOpenRawInventoryPanel = visibleItems.some((item) => item.path === '/raw-inventory');
  const canOpenProfitabilityReport = canOpenReportsPanel && isBackendCapabilitySupported('profitability');
  const needsBaseConfigurationReview = businessBaseState.needsReview;

  useEffect(() => {
    if (!activeBusiness) return;
    setActiveTab(resolvedDashboardTab);
  }, [
    activeBusiness?.id,
    resolvedDashboardTab,
  ]);

  const priorityAlerts = useMemo(() => {
    const now = new Date();
    return alerts
      .filter((alert) => {
        const state = snooze.getStatus(alert.id);
        if (state?.status === 'resolved') return false;
        if (state?.status === 'snoozed' && state.until && new Date(state.until) > now) return false;
        return true;
      })
      .slice(0, 3);
  }, [alerts, snooze]);

  const dashboardQuickActions = useMemo(() => {
    const actions: Array<{
      id: string;
      label: string;
      description: string;
      onClick: () => void;
      tone: 'primary' | 'secondary';
    }> = [];

    if (canQuickCreateSale) {
      actions.push({
        id: 'sale',
        label: 'Registrar venta',
        description: 'Úsalo cuando ya vendiste y quieres dejar el movimiento listo.',
        onClick: () => setIsSaleModalOpen(true),
        tone: 'primary',
      });
    }

    if (canQuickCreateExpense) {
      actions.push({
        id: 'expense',
        label: 'Registrar gasto',
        description: 'Guarda una salida de dinero sin entrar a todo el módulo.',
        onClick: () => setIsExpenseModalOpen(true),
        tone: actions.length === 0 ? 'primary' : 'secondary',
      });
    }

    if (canOpenPaymentsPanel && hasAccountsReceivableModule) {
      actions.push({
        id: 'payments',
        label: 'Revisar cobros',
        description: 'Mira quién te debe y registra abonos pendientes.',
        onClick: () => navigate('/payments'),
        tone: actions.length === 0 ? 'primary' : 'secondary',
      });
    }

    if (canViewBalance) {
      actions.push({
        id: 'balance',
        label: 'Abrir caja',
        description: 'Consulta el estado general del dinero del negocio.',
        onClick: () => setActiveTab('balance'),
        tone: actions.length === 0 ? 'primary' : 'secondary',
      });
    }

    if (!actions.length && canOpenAlertsPanel) {
      actions.push({
        id: 'alerts',
        label: 'Ver alertas',
        description: 'Revisa pendientes u oportunidades importantes del negocio.',
        onClick: () => navigate('/alerts'),
        tone: 'primary',
      });
    }

    return actions.slice(0, 3);
  }, [
    canOpenAlertsPanel,
    canOpenPaymentsPanel,
    canQuickCreateExpense,
    canQuickCreateSale,
    canViewBalance,
    hasAccountsReceivableModule,
    navigate,
  ]);

  const homeQuickActions = useMemo(() => {
    const operational = dashboardQuickActions.filter((action) => action.id !== 'balance');
    return (operational.length > 0 ? operational : dashboardQuickActions).slice(0, 2);
  }, [dashboardQuickActions]);

  const loadDashboardData = async (businessId?: number | null) => {
    if (!activeBusiness || !businessId) return;

    const requestId = currentLoadRequestIdRef.current + 1;
    currentLoadRequestIdRef.current = requestId;

    if (loadWatchdogTimeoutRef.current != null) {
      window.clearTimeout(loadWatchdogTimeoutRef.current);
    }

    loadWatchdogTimeoutRef.current = window.setTimeout(() => {
      if (currentLoadRequestIdRef.current !== requestId) {
        return;
      }

      pushBootTrace('Dashboard.load.watchdogTimeout', {
        businessId,
        requestId,
      });

      setStats((current: any) => current ?? {
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
      });
      setDashboardDebug({
        loaded: false,
        failed: true,
        error: 'La carga del dashboard tardó demasiado. Se mostró un resumen seguro.',
        salesCount: 0,
        expensesCount: 0,
        recentSalesCount: 0,
        topProductsCount: 0,
      });
      setLoading(false);
    }, DASHBOARD_LOAD_WATCHDOG_MS);

    pushBootTrace('Dashboard.load.start', {
      businessId,
      requestId,
      canViewSummary,
      canManageReminders,
      canViewRawInventory,
      canViewProfitability,
      canViewSales,
      canViewExpenses,
    });
    setLoading(true);
    setDashboardDebug((current) => ({ ...current, loaded: false, failed: false, error: '' }));
    try {
      const monthRange = canViewProfitability ? getPeriodRange('month') : null;

      const { dashboardData, remindersData, lowStockCount, profitSummary } = await dashboardRepository.load({
        businessId,
        canViewSummary,
        canManageReminders,
        canViewRawInventory,
        canViewProfitability,
        canViewSales,
        canViewExpenses,
        monthRange,
      });

      const safeDashboardData = {
        summary: {
          sales: {
            total: Number(dashboardData?.summary?.sales?.total || 0),
            count: Number(dashboardData?.summary?.sales?.count || 0),
          },
          expenses: {
            total: Number(dashboardData?.summary?.expenses?.total || 0),
            count: Number(dashboardData?.summary?.expenses?.count || 0),
          },
          cash_flow: {
            in: Number(dashboardData?.summary?.cash_flow?.in || 0),
            out: Number(dashboardData?.summary?.cash_flow?.out || 0),
          },
          accounts_receivable: Number(dashboardData?.summary?.accounts_receivable || 0),
        },
        dashboard: {
          recent_sales: Array.isArray(dashboardData?.dashboard?.recent_sales) ? dashboardData.dashboard.recent_sales : [],
          fiados_alerts: {
            customers_count: Number(dashboardData?.dashboard?.fiados_alerts?.customers_count || 0),
          },
          top_products: Array.isArray(dashboardData?.dashboard?.top_products) ? dashboardData.dashboard.top_products : [],
        },
      };

      if (currentLoadRequestIdRef.current !== requestId) {
        pushBootTrace('Dashboard.load.staleResolvedIgnored', {
          businessId,
          requestId,
        });
        return;
      }

      setRawInventoryLowStockCount(lowStockCount);
      setProfitabilitySummary(profitSummary);
      setStats(safeDashboardData);
      setDashboardDebug({
        loaded: true,
        failed: false,
        error: '',
        salesCount: safeDashboardData.summary.sales.count,
        expensesCount: safeDashboardData.summary.expenses.count,
        recentSalesCount: safeDashboardData.dashboard.recent_sales.length,
        topProductsCount: safeDashboardData.dashboard.top_products.length,
      });

      // Load opening balance from local storage
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;
      const storedBalance = localStorage.getItem(`openingBalance_${businessId}_${todayStr}`);
      if (storedBalance) {
        setOpeningBalance(parseFloat(storedBalance));
      } else {
        setOpeningBalance(0);
      }

      setActiveRemindersCount(remindersData.length);
      pushBootTrace('Dashboard.load.resolved', {
        businessId,
        requestId,
        salesCount: safeDashboardData.summary.sales.count,
        expensesCount: safeDashboardData.summary.expenses.count,
        recentSalesCount: safeDashboardData.dashboard.recent_sales.length,
        topProductsCount: safeDashboardData.dashboard.top_products.length,
      });

    } catch (error) {
      console.error('Error loading dashboard:', error);
      if (currentLoadRequestIdRef.current !== requestId) {
        pushBootTrace('Dashboard.load.staleErrorIgnored', {
          businessId,
          requestId,
          message: error instanceof Error ? error.message : 'Error desconocido cargando el dashboard',
        });
        return;
      }
      pushBootTrace('Dashboard.load.error', {
        businessId,
        requestId,
        message: error instanceof Error ? error.message : 'Error desconocido cargando el dashboard',
      });
      setStats({
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
      });
      setDashboardDebug({
        loaded: false,
        failed: true,
        error: error instanceof Error ? error.message : 'Error desconocido cargando el dashboard',
        salesCount: 0,
        expensesCount: 0,
        recentSalesCount: 0,
        topProductsCount: 0,
      });
    } finally {
      if (loadWatchdogTimeoutRef.current != null) {
        window.clearTimeout(loadWatchdogTimeoutRef.current);
        loadWatchdogTimeoutRef.current = null;
      }
      if (currentLoadRequestIdRef.current !== requestId) {
        pushBootTrace('Dashboard.load.finallyIgnored', {
          businessId,
          requestId,
        });
        return;
      }
      setLoading(false);
      pushBootTrace('Dashboard.load.end', {
        businessId,
        requestId,
      });
    }
  };

  useEffect(() => {
    return () => {
      if (loadWatchdogTimeoutRef.current != null) {
        window.clearTimeout(loadWatchdogTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activeBusiness?.id) {
      currentLoadRequestIdRef.current += 1;
      if (loadWatchdogTimeoutRef.current != null) {
        window.clearTimeout(loadWatchdogTimeoutRef.current);
        loadWatchdogTimeoutRef.current = null;
      }
      setStats(null);
      setDashboardDebug({
        loaded: false,
        failed: false,
        error: '',
        salesCount: 0,
        expensesCount: 0,
        recentSalesCount: 0,
        topProductsCount: 0,
      });
      setLoading(false);
      return;
    }

    pushBootTrace('Dashboard.effect.loadRequested', {
      businessId: activeBusiness.id,
      canViewSummary,
      canManageReminders,
      canViewRawInventory,
      canViewProfitability,
      canViewSales,
      canViewExpenses,
    });
    void loadDashboardData(activeBusiness.id);
  }, [activeBusiness?.id, canManageReminders, canViewExpenses, canViewProfitability, canViewRawInventory, canViewSales, canViewSummary]);

  const refreshDashboardData = () => {
    void loadDashboardData(activeBusiness?.id);
  };

  useEffect(() => {
    const normalizedActiveTab = activeTab as 'hoy' | 'balance' | 'analiticas' | 'recordatorios';
    if (!availableTabs.has(normalizedActiveTab)) {
      setActiveTab(resolvedDashboardTab);
    }
  }, [activeTab, availableTabs, resolvedDashboardTab]);

  const saveOpeningBalance = () => {
    if (!activeBusiness) return;
    const currentDate = new Date();
    const today = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
    const val = parseFloat(tempBalance);
    if (!isNaN(val)) {
      setOpeningBalance(val);
      localStorage.setItem(`openingBalance_${activeBusiness.id}_${today}`, val.toString());
      setIsEditingBalance(false);
    }
  };

  const openProfitabilityReport = (options?: {
    focus?: string;
    status?: string;
    productQuery?: string;
  }) => {
    if (!canOpenProfitabilityReport) return;
    const monthRange = getPeriodRange('month');
    const params = new URLSearchParams({
      tab: 'native',
      subtab: 'profitability',
      start_date: monthRange.start,
      end_date: monthRange.end,
    });
    if (options?.focus) params.set('focus', options.focus);
    if (options?.status) params.set('status', options.status);
    if (options?.productQuery) params.set('product_query', options.productQuery);
    navigate(`/reports?${params.toString()}`);
  };



  // Calculate derived values and mainGuidance BEFORE any conditional returns
  const { summary, dashboard } = stats || {};
  
  // Calculate Cash Box
  const cashIn = summary?.cash_flow?.in || 0;
  const cashOut = summary?.cash_flow?.out || 0;
  const cashOnHand = openingBalance + cashIn - cashOut;
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
  const hasMeaningfulActivity =
    (summary?.sales?.count || 0) > 0 ||
    (summary?.expenses?.count || 0) > 0 ||
    (summary?.accounts_receivable || 0) > 0 ||
    activeRemindersCount > 0;

  const firstSteps = useMemo(() => {
    const steps: Array<{
      id: string;
      title: string;
      description: string;
      onClick: () => void;
    }> = [];

    if (canQuickCreateSale) {
      steps.push({
        id: 'sale',
        title: 'Registra tu primera venta',
        description: 'Empieza por el movimiento más importante del día para que el inicio empiece a cobrar sentido.',
        onClick: () => setIsSaleModalOpen(true),
      });
    }

    if (canQuickCreateExpense) {
      steps.push({
        id: 'expense',
        title: 'Registra un gasto real',
        description: 'Úsalo cuando ya salió dinero y quieras verlo reflejado de inmediato en tu resumen.',
        onClick: () => setIsExpenseModalOpen(true),
      });
    }

    if (canViewBalance) {
      steps.push({
        id: 'balance',
        title: 'Mira cómo va tu caja',
        description: 'Después del primer movimiento, esta vista te ayuda a entender rápido cómo quedó el día.',
        onClick: () => setActiveTab('balance'),
      });
    }

    if (canOpenPaymentsPanel && hasAccountsReceivableModule) {
      steps.push({
        id: 'payments',
        title: 'Ten claro quién te debe',
        description: 'Si vendes a crédito, revisa aquí qué clientes necesitan seguimiento.',
        onClick: () => navigate('/payments'),
      });
    }

    return steps.slice(0, 3);
  }, [
    canOpenPaymentsPanel,
    canQuickCreateExpense,
    canQuickCreateSale,
    canViewBalance,
    hasAccountsReceivableModule,
    navigate,
  ]);

  const mainGuidance = useMemo(() => {
    if (priorityAlerts.length > 0) {
      const firstAlert = priorityAlerts[0];
      return {
        eyebrow: 'Qué conviene resolver primero',
        title: firstAlert.title,
        description: firstAlert.description,
        actionLabel: firstAlert.action?.label || 'Abrir detalle',
        onAction: () => navigate(firstAlert.action?.path || (canOpenAlertsPanel ? '/alerts' : '/dashboard')),
      };
    }

    if (!hasMeaningfulActivity && firstSteps.length > 0) {
      return {
        eyebrow: 'Tus primeros 5 minutos',
        title: firstSteps[0].title,
        description: 'Empieza por una sola acción. Luego la app te mostrará qué cambió y cuál conviene hacer después.',
        actionLabel: 'Empezar ahora',
        onAction: firstSteps[0].onClick,
      };
    }

    if ((summary?.sales?.count || 0) > 0) {
      return {
        eyebrow: 'Así va tu día',
        title: `Ya llevas ${summary?.sales?.count || 0} venta(s) registradas hoy`,
        description: 'Sigue registrando lo importante o revisa cómo se está moviendo tu caja.',
        actionLabel: dashboardQuickActions[0]?.label || 'Abrir caja',
        onAction: dashboardQuickActions[0]?.onClick || (() => setActiveTab('balance')),
      };
    }

    if (dashboardQuickActions.length > 0) {
      return {
        eyebrow: 'Siguiente mejor acción',
        title: 'Empieza por el movimiento más importante del día',
        description: 'Desde aquí puedes registrar rápido lo esencial sin perderte entre secciones.',
        actionLabel: dashboardQuickActions[0].label,
        onAction: dashboardQuickActions[0].onClick,
      };
    }

    return {
      eyebrow: 'Inicio del día',
      title: 'Tu resumen está listo',
      description: 'Cuando empieces a mover ventas, gastos o cobros, este inicio te mostrará lo importante primero.',
      actionLabel: canOpenAlertsPanel ? 'Ver alertas' : 'Abrir ayuda',
      onAction: () => navigate(canOpenAlertsPanel ? '/alerts' : '/help'),
    };
  }, [
    canOpenAlertsPanel,
    dashboardQuickActions,
    firstSteps,
    hasMeaningfulActivity,
    navigate,
    priorityAlerts,
    summary?.sales?.count,
  ]);

  const recentSalesPreview = useMemo(() => (dashboard?.recent_sales || []).slice(0, 3), [dashboard?.recent_sales]);

  const topSummaryCards = useMemo(() => {
    return [
      {
        id: 'cash',
        label: 'Caja del dia',
        value: formatCurrency(cashOnHand),
        helper: `Entro ${formatCurrency(cashIn)} | Salio ${formatCurrency(cashOut)}`,
        icon: Wallet,
        emphasis: true,
      },
      {
        id: 'sales',
        label: 'Ventas hoy',
        value: formatCurrency(summary?.sales?.total || 0),
        helper: `${summary?.sales?.count || 0} venta(s) registradas`,
        icon: ShoppingCart,
      },
      {
        id: 'focus',
        label: hasAccountsReceivableModule ? 'Por cobrar' : 'Gastos hoy',
        value: hasAccountsReceivableModule
          ? formatCurrency(summary?.accounts_receivable || 0)
          : formatCurrency(summary?.expenses?.total || 0),
        helper: hasAccountsReceivableModule
          ? `${dashboard?.fiados_alerts?.customers_count || 0} cliente(s) con saldo`
          : `${summary?.expenses?.count || 0} gasto(s) registrados`,
        icon: hasAccountsReceivableModule ? AlertTriangle : Wallet,
      },
      {
        id: 'pending',
        label: 'Pendientes',
        value: `${priorityAlerts.length + activeRemindersCount + rawInventoryLowStockCount}`,
        helper: priorityAlerts.length > 0
          ? `${priorityAlerts.length} alerta(s) para revisar`
          : activeRemindersCount > 0
            ? `${activeRemindersCount} recordatorio(s) activos`
            : rawInventoryLowStockCount > 0
              ? `${rawInventoryLowStockCount} alerta(s) de inventario`
              : 'Sin pendientes urgentes',
        icon: Bell,
      },
    ];
  }, [
    activeRemindersCount,
    cashIn,
    cashOnHand,
    cashOut,
    dashboard?.fiados_alerts?.customers_count,
    hasAccountsReceivableModule,
    priorityAlerts.length,
    rawInventoryLowStockCount,
    summary?.accounts_receivable,
    summary?.expenses?.count,
    summary?.expenses?.total,
    summary?.sales?.count,
    summary?.sales?.total,
  ]);

  const mobilePriorityCards = useMemo(() => {
    const cards: Array<{
      id: string;
      title: string;
      value: string;
      helper: string;
      icon: typeof Wallet;
      accent: string;
      onClick: () => void;
    }> = [];

    if (canViewBalance) {
      cards.push({
        id: 'balance',
        title: 'Caja',
        value: formatCurrency(cashOnHand),
        helper: `Entró ${formatCurrency(cashIn)} y salió ${formatCurrency(cashOut)}`,
        icon: Wallet,
        accent: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300',
        onClick: () => setActiveTab('balance'),
      });
    }

    if (canViewAnalytics) {
      const hasReliableProfitability = (profitabilitySummary?.complete_sales_count || 0) > 0;
      const hasAnyAnalyticalActivity = (profitabilitySummary?.sales_count || 0) > 0 || (summary?.sales?.count || 0) > 0 || (summary?.expenses?.count || 0) > 0;
      const analyticsValue = hasReliableProfitability
        ? formatCurrency(profitabilitySummary?.gross_margin_total || 0)
        : formatCurrency(profitabilitySummary?.revenue_total ?? summary?.sales?.total ?? 0);
      const analyticsHelper = hasReliableProfitability
        ? `${profitabilitySummary?.complete_sales_count || 0} venta(s) con costo calculado`
        : hasAnyAnalyticalActivity
          ? `Visible aunque falte costeo confiable. ${((profitabilitySummary?.incomplete_sales_count || 0) + (profitabilitySummary?.no_consumption_sales_count || 0) + (profitabilitySummary?.missing_cost_sales_count || 0)) || 0} venta(s) requieren revisión`
          : 'Disponible aunque todavía no haya datos suficientes';

      cards.push({
        id: 'analiticas',
        title: 'Análisis',
        value: analyticsValue,
        helper: analyticsHelper,
        icon: BarChart2,
        accent: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300',
        onClick: () => setActiveTab('analiticas'),
      });
    }

    const panelOrder = priorityPanels.map((panel) => panel.id);
    return cards.sort((left, right) => panelOrder.indexOf(left.id as 'balance' | 'analiticas') - panelOrder.indexOf(right.id as 'balance' | 'analiticas'));
  }, [
    canViewAnalytics,
    canViewBalance,
    cashIn,
    cashOnHand,
    cashOut,
    priorityPanels,
    profitabilitySummary,
    summary?.expenses?.count,
    summary?.expenses?.total,
    summary?.sales?.count,
    summary?.sales?.total,
  ]);

  const mobileHomeDiagnostics = useMemo(() => {
    try {
      const resolvedHomeModules = Array.isArray(priorityPanels)
        ? priorityPanels.map((panel) => {
            if (panel?.id === 'balance') return 'treasury';
            if (panel?.id === 'analiticas') return 'analiticas';
            return String(panel?.path || '').replace('/', '');
          }).filter(Boolean)
        : [];
      const runtime = getRuntimeModeSnapshot();
      const offlineRuntime = Boolean(runtime?.offlineProductMode);
      return {
        buildLabel: `${buildInfo?.builtAtDisplay || 'unknown'} · ${buildInfo?.gitCommitShort || 'unknown'}`,
        buildIso: buildInfo?.builtAtIso || 'unknown',
        embeddedApiBase: offlineRuntime ? 'offline-local' : (buildInfo?.apiBaseUrl || '/api'),
        resolvedApiBase: offlineRuntime ? 'offline-local' : (resolveApiBaseUrl() || '/api'),
        runtime: runtime || {
          desktopShell: false,
          mobileNativeShell: false,
          desktopOfflineMode: false,
          offlineProductMode: false,
        },
        resolvedHomeModules,
        availablePaths: Array.isArray(availableItems) ? availableItems.map((item) => item.path) : [],
        visiblePaths: Array.isArray(visibleItems) ? visibleItems.map((item) => item.path) : [],
      };
    } catch (error) {
      console.warn('[Dashboard] mobile diagnostics fallback', error);
      return {
        buildLabel: 'unknown · unknown',
        buildIso: 'unknown',
        embeddedApiBase: '/api',
        resolvedApiBase: '/api',
        runtime: {
          desktopShell: false,
          mobileNativeShell: false,
          desktopOfflineMode: false,
          offlineProductMode: false,
        },
        resolvedHomeModules: [] as string[],
        availablePaths: [] as string[],
        visiblePaths: [] as string[],
      };
    }
  }, [availableItems, priorityPanels, visibleItems]);

  const attentionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      description: string;
      actionLabel: string;
      onClick: () => void;
      tone: 'red' | 'amber' | 'blue';
    }> = [];

    priorityAlerts.slice(0, 2).forEach((alert) => {
      items.push({
        id: `alert-${alert.id}`,
        title: alert.title,
        description: alert.description,
        actionLabel: alert.action?.label || 'Abrir detalle',
        onClick: () => navigate(alert.action?.path || (canOpenAlertsPanel ? '/alerts' : '/dashboard')),
        tone: alert.severity === 'critical' ? 'red' : alert.severity === 'warning' ? 'amber' : 'blue',
      });
    });

    if ((summary?.accounts_receivable || 0) > 0 && canOpenPaymentsPanel) {
      items.push({
        id: 'receivables',
        title: 'Hay cobros pendientes',
        description: `Tienes ${formatCurrency(summary?.accounts_receivable || 0)} por recuperar.`,
        actionLabel: 'Ir a cobros',
        onClick: () => navigate('/payments'),
        tone: 'amber',
      });
    }

    if (rawInventoryLowStockCount > 0 && canOpenRawInventoryPanel) {
      items.push({
        id: 'inventory',
        title: 'Bodega con stock bajo',
        description: `${rawInventoryLowStockCount} material(es) estan por debajo del minimo.`,
        actionLabel: 'Revisar bodega',
        onClick: () => navigate('/raw-inventory'),
        tone: 'amber',
      });
    }

    if (activeRemindersCount > 0 && canManageReminders) {
      items.push({
        id: 'reminders',
        title: 'Tienes pendientes activos',
        description: `${activeRemindersCount} recordatorio(s) siguen abiertos hoy.`,
        actionLabel: 'Ver pendientes',
        onClick: () => setActiveTab('recordatorios'),
        tone: 'blue',
      });
    }

    if (needsBaseConfigurationReview) {
      items.push({
        id: 'personalization',
        title: 'Revisa la base del negocio',
        description: 'Hay una configuracion sugerida lista para confirmar o ajustar.',
        actionLabel: 'Abrir personalizacion',
        onClick: () => navigate('/settings?tab=personalization'),
        tone: 'blue',
      });
    }

    return items
      .filter((item, index, list) => list.findIndex((entry) => entry.id === item.id) === index)
      .slice(0, 3);
  }, [
    activeRemindersCount,
    canManageReminders,
    canOpenAlertsPanel,
    canOpenPaymentsPanel,
    canOpenRawInventoryPanel,
    navigate,
    needsBaseConfigurationReview,
    priorityAlerts,
    rawInventoryLowStockCount,
    summary?.accounts_receivable,
  ]);

  const viewShortcuts = useMemo(() => {
    const items: Array<{ id: string; label: string; description: string; onClick: () => void }> = [];

    if (canViewBalance) {
      items.push({
        id: 'balance',
        label: 'Caja',
        description: 'Ver dinero del dia',
        onClick: () => setActiveTab('balance'),
      });
    }

    if (canViewAnalytics) {
      items.push({
        id: 'analytics',
        label: 'Analisis',
        description: 'Profundizar despues',
        onClick: () => setActiveTab('analiticas'),
      });
    }

    if (canOpenReportsPanel) {
      items.push({
        id: 'reports',
        label: 'Reportes',
        description: 'Abrir detalle',
        onClick: () => navigate('/reports'),
      });
    }

    if (canOpenAlertsPanel) {
      items.push({
        id: 'alerts',
        label: 'Alertas',
        description: 'Ver prioridades',
        onClick: () => navigate('/alerts'),
      });
    }

    return items.slice(0, 3);
  }, [canOpenAlertsPanel, canOpenReportsPanel, canViewAnalytics, canViewBalance, navigate]);

  const finalComponent = !activeBusiness && !loading
    ? 'DashboardEmptyState'
    : loading
      ? 'DashboardLoading'
      : 'DashboardContent';

  useEffect(() => {
    pushBootTrace('Dashboard.render', {
      activeBusinessId: activeBusiness?.id ?? null,
      loading,
      finalComponent,
      dashboardReady: dashboardDebug.loaded,
      dashboardFailed: dashboardDebug.failed,
      activeTab,
    });
    console.info('[startup][Dashboard] render', {
      runtime: getRuntimeModeSnapshot(),
      hasActiveBusiness: Boolean(activeBusiness?.id),
      activeBusinessId: activeBusiness?.id ?? null,
      loading,
      finalComponent,
    });
  }, [activeBusiness?.id, finalComponent, loading]);

  useEffect(() => {
    if (!activeBusiness && !loading && isOfflineProductMode()) {
      setIsCreateBusinessModalOpen(true);
    }
  }, [activeBusiness, loading]);



  if (!activeBusiness && !loading) {
    return (
      <>
        <CreateBusinessModal
          isOpen={isCreateBusinessModalOpen}
          onClose={() => setIsCreateBusinessModalOpen(false)}
          onSuccess={() => {
            fetchBusinesses();
          }}
        />
        <div className="app-canvas p-6">
          <TeachingEmptyState
            icon={Sparkles}
            title="Aún no tienes un negocio"
            description="Crea tu primer negocio y te dejaremos lista la app con secciones, menú y experiencias acordes a tu operación."
            nextStep="Te preguntaremos lo mínimo útil para aplicar una base coherente desde el primer ingreso."
            primaryActionLabel="Crear negocio"
            onPrimaryAction={() => setIsCreateBusinessModalOpen(true)}
          />
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="app-canvas space-y-6 animate-pulse p-6">
        <div className="h-8 w-48 rounded bg-gray-200 dark:bg-gray-800"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
          ))}
        </div>
        <div className="h-96 rounded-xl bg-gray-200 dark:bg-gray-800"></div>
      </div>
    );
  }

  // Remove the problematic blocking return
  // if (!activeBusiness) return null;

  const dashboardOverviewContent = (
    <div className="space-y-5">
      {needsBaseConfigurationReview && (
        <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4 shadow-sm dark:border-blue-900/30 dark:from-blue-900/10 dark:to-indigo-900/10 sm:px-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                <Sparkles className="h-4 w-4" />
                Personalizacion sugerida
              </div>
              <h3 className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                Ajusta la base del negocio cuando quieras
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                Revisa tu configuracion para que el menu y las vistas sigan tu operacion real.
              </p>
            </div>
            <Button onClick={() => navigate('/settings?tab=personalization')} className="w-full sm:w-auto">
              Abrir personalizacion
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <div className="app-surface rounded-[28px] p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-blue-600 dark:text-blue-400">
              {mainGuidance.eyebrow}
            </div>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              {mainGuidance.title}
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-gray-600 dark:text-gray-300">
              {mainGuidance.description}
            </p>
          </div>
          <Button onClick={mainGuidance.onAction} className="w-full sm:w-auto lg:min-w-[220px]">
            {mainGuidance.actionLabel}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {!hasMeaningfulActivity && firstSteps.length > 0 && (
          <div className="app-soft-surface mt-4 rounded-2xl border-dashed p-4">
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Empieza por aqui</div>
            <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
              Haz una accion y vuelve para ver que cambio.
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2.5 md:grid-cols-3">
              {firstSteps.slice(0, 3).map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  onClick={step.onClick}
                  className="app-surface flex items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-colors hover:border-gray-300 dark:hover:border-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 active:scale-[0.99]"
                >
                  <div className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                    {index + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{step.title}</div>
                    <div className="mt-1 text-xs text-gray-600 dark:text-gray-300">{step.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" data-tour="dashboard.kpis">
        {topSummaryCards.map((card) => (
          <div
            key={card.id}
            className={cn(
              'app-surface rounded-[24px] p-4 shadow-sm',
              card.emphasis && 'border border-blue-200 bg-gradient-to-br from-white via-white to-blue-50/70 dark:border-blue-900/30 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950/20'
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  {card.label}
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">{card.value}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.helper}</div>
              </div>
              {card.icon && (
                <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                  <card.icon className="h-5 w-5" />
                </div>
              )}
            </div>

            {card.id === 'cash' && (
              <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-800">
                {isEditingBalance ? (
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={tempBalance}
                      onChange={(e) => setTempBalance(e.target.value)}
                      className="h-9 bg-gray-50 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      placeholder="Base del dia"
                      autoFocus
                    />
                    <Button size="sm" onClick={saveOpeningBalance}>
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Base del dia: {formatCurrency(openingBalance)}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setTempBalance(openingBalance.toString());
                        setIsEditingBalance(true);
                      }}
                      className="text-xs font-medium text-blue-600 transition-colors hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900"
                    >
                      Editar base
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <ServiceKpisPanel />
    </div>
  );

  const dashboardShortcutsContent = (
    <div className="space-y-4">
      {homeQuickActions.length > 0 && (
        <div className="app-surface rounded-[24px] p-4 shadow-sm sm:p-5">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Acciones rapidas</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Las tareas que mas se usan durante el dia.
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
            {homeQuickActions.slice(0, 4).map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className={cn(
                  'rounded-2xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 active:scale-[0.99]',
                  action.tone === 'primary'
                    ? 'border-blue-200 bg-blue-50 hover:border-blue-300 dark:border-blue-900/30 dark:bg-blue-900/10'
                    : 'app-soft-surface hover:border-gray-300 dark:hover:border-slate-600'
                )}
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{action.label}</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{action.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {viewShortcuts.length > 0 && (
        <div className="app-surface rounded-[24px] p-4 shadow-sm sm:p-5">
          <div>
            <div className="text-sm font-semibold text-gray-900 dark:text-white">Abrir una vista</div>
            <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Usa estas entradas cuando quieras profundizar sin recorrer todo el menu.
            </div>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3 xl:grid-cols-1">
            {viewShortcuts.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={item.onClick}
                className="app-soft-surface rounded-2xl px-4 py-3.5 text-left transition-colors hover:border-gray-300 dark:hover:border-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 active:scale-[0.99]"
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.label}</div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.description}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const HoyContent = (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 lg:space-y-5">
      <div className="hidden lg:block">{dashboardOverviewContent}</div>

      <MobileUnifiedPageShell
        utilityBar={(
          <MobileUtilityBar>
            <MobileSummaryDrawer summary="Resumen de hoy">
              {dashboardOverviewContent}
            </MobileSummaryDrawer>
          </MobileUtilityBar>
        )}
      >
      {showDashboardDebug ? (
        <>
          <div className={cn(
            'rounded-[20px] border px-3.5 py-3 text-xs lg:hidden',
            dashboardDebug.failed
              ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900/30 dark:bg-red-950/20 dark:text-red-100'
              : 'border-emerald-200 bg-emerald-50/80 text-emerald-900 dark:border-emerald-900/30 dark:bg-emerald-950/20 dark:text-emerald-100'
          )}>
            <div className="font-semibold">Debug dashboard</div>
            <div className="mt-1">loaded={dashboardDebug.loaded ? 'yes' : 'no'} failed={dashboardDebug.failed ? 'yes' : 'no'}</div>
            <div className="mt-1 break-words">error={dashboardDebug.error || 'none'}</div>
            <div className="mt-1">sales={dashboardDebug.salesCount} expenses={dashboardDebug.expensesCount} recent={dashboardDebug.recentSalesCount} topProducts={dashboardDebug.topProductsCount}</div>
          </div>
          <div className="rounded-[20px] border border-dashed border-blue-200 bg-blue-50/80 px-3.5 py-3 text-xs text-blue-900 dark:border-blue-900/30 dark:bg-blue-950/20 dark:text-blue-100 lg:hidden">
            <div className="font-semibold">Build movil: {mobileHomeDiagnostics.buildLabel}</div>
            <div className="mt-1">API build: {mobileHomeDiagnostics.embeddedApiBase}</div>
            <div className="mt-1">API runtime: {mobileHomeDiagnostics.resolvedApiBase}</div>
            <div className="mt-1">Runtime: native={mobileHomeDiagnostics.runtime.mobileNativeShell ? 'yes' : 'no'} offline={mobileHomeDiagnostics.runtime.offlineProductMode ? 'yes' : 'no'}</div>
            <div className="mt-1">Home resolved modules: {mobileHomeDiagnostics.resolvedHomeModules.length > 0 ? mobileHomeDiagnostics.resolvedHomeModules.join(', ') : 'none'}</div>
          </div>
        </>
      ) : null}
      {mobilePriorityCards.length > 0 && (
        <div className="grid grid-cols-1 gap-3 lg:hidden">
          {mobilePriorityCards.map((card) => (
            <button
              key={card.id}
              type="button"
              onClick={card.onClick}
              className="app-surface flex items-start gap-3 rounded-[22px] px-4 py-3.5 text-left shadow-sm transition-colors hover:border-gray-300 dark:hover:border-slate-700 active:scale-[0.99]"
            >
              <div className={cn('rounded-2xl p-2.5', card.accent)}>
                <card.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">{card.title}</div>
                  <span className="text-xs font-medium text-blue-600 dark:text-blue-300">Abrir</span>
                </div>
                <div className="mt-1 text-lg font-bold text-gray-900 dark:text-white">{card.value}</div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">{card.helper}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div className="app-surface rounded-[24px] p-4 shadow-sm sm:p-5" data-tour="dashboard.alerts">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Atencion primero</div>
              <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Resuelve esto antes de pasar a revisar mas detalle.
              </div>
            </div>
            {canOpenAlertsPanel && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/alerts')}>
                Ver alertas
              </Button>
            )}
          </div>

          {attentionItems.length > 0 ? (
            <div className="mt-4 space-y-2.5">
              {attentionItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className={cn(
                    'w-full rounded-2xl border px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-900 active:scale-[0.99]',
                    item.tone === 'red'
                      ? 'border-red-200 bg-red-50 hover:border-red-300 dark:border-red-900/30 dark:bg-red-900/10'
                      : item.tone === 'amber'
                        ? 'border-amber-200 bg-amber-50 hover:border-amber-300 dark:border-amber-900/30 dark:bg-amber-900/10'
                        : 'border-blue-200 bg-blue-50 hover:border-blue-300 dark:border-blue-900/30 dark:bg-blue-900/10'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</div>
                      <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.description}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
                      {item.actionLabel}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="mt-4">
              <TeachingEmptyState
                compact
                icon={Bell}
                title="Nada urgente por ahora"
                description="Cuando aparezca algo importante, lo veras aqui con un acceso directo."
                primaryActionLabel={canOpenAlertsPanel ? 'Abrir alertas' : undefined}
                onPrimaryAction={canOpenAlertsPanel ? () => navigate('/alerts') : undefined}
              />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="hidden lg:block">{dashboardShortcutsContent}</div>
        </div>
      </div>

      <div className="mt-1 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]" data-tour="dashboard.charts">
        <div className="app-surface rounded-[24px] p-4 shadow-sm sm:p-5" data-tour="dashboard.topProducts">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Ultimas ventas</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Un vistazo corto para confirmar ritmo y montos del dia.
              </p>
            </div>
            {hasSalesModule && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/sales')}>
                Ir a ventas
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-2.5">
            {recentSalesPreview.length > 0 ? (
              recentSalesPreview.map((sale: any) => (
                <div
                  key={sale.id}
                  className="app-soft-surface flex items-center justify-between gap-3 rounded-2xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">
                      {sale.customer_name || 'Cliente casual'}
                    </div>
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(sale.sale_date)}
                    </div>
                  </div>
                  <div className="shrink-0 text-sm font-semibold text-gray-900 dark:text-white">
                    ${sale.total.toLocaleString()}
                  </div>
                </div>
              ))
            ) : dashboardDebug.failed ? (
              <TeachingEmptyState
                compact
                icon={AlertTriangle}
                title="El resumen falló, pero la app sigue activa"
                description={dashboardDebug.error || 'No fue posible preparar las ventas recientes.'}
                primaryActionLabel="Reintentar"
                onPrimaryAction={refreshDashboardData}
              />
            ) : (
              <TeachingEmptyState
                compact
                icon={ShoppingCart}
                title="Todavia no hay ventas hoy"
                description="Cuando registres ventas veras aqui las mas recientes."
                primaryActionLabel={hasSalesModule ? 'Registrar venta' : undefined}
                onPrimaryAction={hasSalesModule ? () => setIsSaleModalOpen(true) : undefined}
              />
            )}
          </div>
        </div>

        <div className="space-y-4">
          {profitabilitySummary && canOpenProfitabilityReport && (
            <button
              type="button"
              onClick={() => openProfitabilityReport()}
              className="app-surface w-full rounded-[24px] p-4 text-left shadow-sm transition-colors hover:border-gray-300 dark:hover:border-slate-700 sm:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Rentabilidad del mes</div>
                  <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Una lectura corta antes de abrir el reporte completo.
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-300">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-gray-50 px-3.5 py-3 dark:bg-slate-900/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Margen estimado
                  </div>
                  <div className="mt-1.5 text-lg font-bold text-gray-900 dark:text-white">
                    {formatCurrency(profitabilitySummary.gross_margin_total)}
                  </div>
                </div>
                <div className="rounded-2xl bg-gray-50 px-3.5 py-3 dark:bg-slate-900/70">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Ventas con costo
                  </div>
                  <div className="mt-1.5 text-lg font-bold text-gray-900 dark:text-white">
                    {profitabilitySummary.complete_sales_count}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
                <span>
                  {profitabilitySummary.incomplete_sales_count + profitabilitySummary.no_consumption_sales_count} venta(s) requieren revision
                </span>
                <span className="font-medium text-blue-600 dark:text-blue-300">Abrir reporte</span>
              </div>
            </button>
          )}

          <div className="app-surface rounded-[24px] p-4 shadow-sm sm:p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-900/20 dark:text-blue-300">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold text-gray-900 dark:text-white">Pendientes</div>
                <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Lo justo para no perder seguimiento.
                </div>
              </div>
            </div>
            <div className="app-muted-panel mt-4 rounded-2xl p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Activos
              </div>
              <div className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">{activeRemindersCount}</div>
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {activeRemindersCount > 0
                  ? 'Revisalos para no dejar tareas importantes pendientes.'
                  : 'Cuando crees recordatorios apareceran aqui.'}
              </div>
            </div>
            {canManageReminders && (
              <Button onClick={() => setActiveTab('recordatorios')} className="mt-4 w-full" variant="secondary">
                Revisar pendientes
              </Button>
            )}
          </div>
        </div>
      </div>
      </MobileUnifiedPageShell>
    </div>
  );
  // Move components with hooks outside of conditional arrays
  const balanceTabContent = canViewBalance ? <BalanceTab onOpenAnalytics={() => setActiveTab('analiticas')} /> : null;
  const analyticsTabContent = canViewAnalytics ? (
    <ProGate feature={FEATURES.DASHBOARD_ANALYTICS} mode="block">
      <AnalyticsTab />
    </ProGate>
  ) : null;
  const remindersTabContent = canManageReminders ? (
    <ProGate feature={FEATURES.DASHBOARD_REMINDERS} mode="block">
      <RemindersTab />
    </ProGate>
  ) : null;

  // Swipe Pager Items
  const swipePages = [
    { 
      id: 'hoy', 
      title: 'Resumen', 
      icon: Calendar, 
      content: HoyContent,
      'data-tour': 'dashboard.tabs.hoy'
    },
    // Only show Balance if user has permission
    ...(canViewBalance ? [{
      id: 'balance', 
      title: 'Caja', 
      icon: Wallet, 
      content: balanceTabContent,
      'data-tour': 'dashboard.tabs.balance'
    }] : []),
    // Only show Analytics if user has permission
    ...(canViewAnalytics ? [{
      id: 'analiticas', 
      title: 'Análisis', 
      icon: BarChart2, 
      content: analyticsTabContent,
      'data-tour': 'dashboard.tabs.analytics'
    }] : []),
    ...(canManageReminders ? [{
      id: 'recordatorios', 
      title: 'Pendientes', 
      icon: Bell, 
      content: remindersTabContent,
      badge: activeRemindersCount > 0 ? activeRemindersCount : undefined,
      'data-tour': 'dashboard.tabs.reminders'
    }] : [])
  ];

  return (
    <PageLayout data-tour="dashboard.panel">
      <PageHeader
        title="Inicio"
        description={activeBusiness?.name
          ? `Tu dia en ${activeBusiness.name}, en un vistazo.`
          : 'Tu dia, ventas y alertas en un vistazo.'}
      />

      <SwipePager 
        activePageId={activeTab}
        onPageChange={setActiveTab}
        pages={swipePages}
        className="flex-1 dashboard-swipe-pager"
        desktopNavClassName="dashboard-swipe-pager-nav"
        desktopContentClassName="dashboard-swipe-pager-content"
      />

      <CreateSaleModal 
        isOpen={isSaleModalOpen} 
        onClose={() => setIsSaleModalOpen(false)} 
        onSuccess={refreshDashboardData}
      />
      <CreateExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        onSuccess={refreshDashboardData}
      />
    </PageLayout>
  );
};
