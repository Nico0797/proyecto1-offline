import { Component, ErrorInfo, ReactNode, Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthThemeLayout } from './components/Layout/AuthThemeLayout';
import { MainLayout } from './components/Layout/MainLayout';
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const TeamLogin = lazy(() => import('./pages/TeamLogin').then(m => ({ default: m.TeamLogin })));
const ContextSelection = lazy(() => import('./pages/ContextSelection').then(m => ({ default: m.ContextSelection })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const AccountAccessPage = lazy(() => import('./pages/AccountAccessPage').then(m => ({ default: m.default })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Sales = lazy(() => import('./pages/Sales').then(m => ({ default: m.Sales })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Quotes = lazy(() => import('./pages/Quotes').then(m => ({ default: m.Quotes })));
const Invoices = lazy(() => import('./pages/Invoices').then(m => ({ default: m.Invoices })));
const InvoiceEditor = lazy(() => import('./pages/InvoiceEditor').then(m => ({ default: m.InvoiceEditor })));
const InvoiceDetail = lazy(() => import('./pages/InvoiceDetail').then(m => ({ default: m.InvoiceDetail })));
const InvoiceReceivables = lazy(() => import('./pages/InvoiceReceivables').then(m => ({ default: m.InvoiceReceivables })));
const InvoiceCustomerStatement = lazy(() => import('./pages/InvoiceCustomerStatement').then(m => ({ default: m.InvoiceCustomerStatement })));
const InvoiceSettings = lazy(() => import('./pages/InvoiceSettings').then(m => ({ default: m.InvoiceSettings })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const SalesGoals = lazy(() => import('./pages/SalesGoals').then(m => ({ default: m.SalesGoals })));
const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
const Agenda = lazy(() => import('./pages/Agenda').then(m => ({ default: m.Agenda })));
const Payments = lazy(() => import('./pages/Payments').then(m => ({ default: m.Payments })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const RawInventory = lazy(() => import('./pages/RawInventory').then(m => ({ default: m.RawInventory })));
const Suppliers = lazy(() => import('./pages/Suppliers').then(m => ({ default: m.Suppliers })));
const RawPurchases = lazy(() => import('./pages/RawPurchases').then(m => ({ default: m.RawPurchases })));
const SupplierPayables = lazy(() => import('./pages/SupplierPayables').then(m => ({ default: m.SupplierPayables })));
const Recipes = lazy(() => import('./pages/Recipes').then(m => ({ default: m.Recipes })));
const CostCalculator = lazy(() => import('./pages/CostCalculator').then(m => ({ default: m.CostCalculator })));
const Debts = lazy(() => import('./pages/Debts').then(m => ({ default: m.Debts })));
const Treasury = lazy(() => import('./pages/Treasury').then(m => ({ default: m.Treasury })));
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));

import { RequireAdmin } from './components/RequireAdmin';
import { AdminLayout } from './components/Admin/Layout/AdminLayout';
import { AdminDashboard } from './pages/Admin/OwnerOverview';
import { AdminRevenue } from './pages/Admin/OwnerRevenue';
import { AdminUsers } from './pages/Admin/Users';
import { AdminEmployees } from './pages/Admin/Employees';
import { AdminRoles } from './pages/Admin/Roles';
import { AdminSettings } from './pages/Admin/Settings';
import { AdminBanners } from './pages/Admin/Banners';
import { AdminPrices } from './pages/Admin/Prices';
import { AdminBusinesses } from './pages/Admin/OwnerBusinesses';
import { AdminSystemHealth } from './pages/Admin/OwnerSystemHealth';
import { AdminActivity } from './pages/Admin/OwnerActivity';
import { AdminAlerts } from './pages/Admin/OwnerAlerts';
import { AdminCustomers } from './pages/Admin/Customers';
import { AdminProducts } from './pages/Admin/Products';
import { AdminData } from './pages/Admin/Data';
import { AdminLogin } from './pages/Admin/Login';
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions').then(m => ({ default: m.TermsAndConditions })));
const AcceptInvite = lazy(() => import('./pages/AcceptInvite').then(m => ({ default: m.AcceptInvite })));
import { ProGate } from './components/ui/ProGate';
import { canAccessModule, FEATURES } from './auth/plan';
import { TourProvider } from './tour/TourProvider';
import { Toaster } from 'react-hot-toast';
import { NotificationController } from './components/NotificationController';
import { useBusinessStore } from './store/businessStore';
import { BusinessModuleKey, isBusinessModuleEnabled } from './types';
import { BusinessCommercialSectionKey, isBusinessCommercialSectionEnabled } from './config/businessPersonalization';
import { ThemeProvider, useEffectiveTheme } from './components/providers/ThemeProvider';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ScrollbarActivityController } from './components/ui/ScrollbarActivityController';
import { UnsupportedBackendFeature } from './components/Layout/UnsupportedBackendFeature';
import { BackendCapability, isBackendCapabilitySupported } from './config/backendCapabilities';
import { useAccess } from './hooks/useAccess';
import { AppEntryRoute, DesktopAwareLoginRoute, WebOnlyAuthRoute } from './routes/AppEntryRoute';
import { isOfflineProductMode } from './runtime/runtimeMode';

type GlobalAppErrorBoundaryProps = {
  children: ReactNode;
};

type GlobalAppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

class GlobalAppErrorBoundary extends Component<GlobalAppErrorBoundaryProps, GlobalAppErrorBoundaryState> {
  constructor(props: GlobalAppErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): GlobalAppErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : 'Error desconocido en la app',
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[App] uncaught render error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-canvas app-text flex min-h-[100dvh] items-center justify-center px-5">
          <div className="app-surface w-full max-w-lg rounded-3xl p-6 text-center shadow-sm">
            <div className="text-lg font-semibold">La app encontró un error al iniciar</div>
            <div className="mt-2 text-sm app-text-muted">
              En lugar de dejar la pantalla vacía, se muestra este estado de recuperación para identificar el fallo real.
            </div>
            <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-left text-xs text-red-900 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-100">
              <div>rootError=yes</div>
              <div className="mt-1 break-words">message={this.state.errorMessage || 'sin detalle'}</div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ModuleRouteGuard = ({
  moduleKey,
  children,
}: {
  moduleKey: BusinessModuleKey;
  children: ReactNode;
}) => {
  const { activeBusiness } = useBusinessStore();
  const { subscriptionPlan } = useAccess();
  if (isOfflineProductMode()) {
    return <>{children}</>;
  }

  if (!activeBusiness) {
    return <>{children}</>;
  }

  if (!isBusinessModuleEnabled(activeBusiness.modules, moduleKey) || !canAccessModule(subscriptionPlan, moduleKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const CommercialSectionRouteGuard = ({
  sectionKey,
  children,
}: {
  sectionKey: BusinessCommercialSectionKey;
  children: ReactNode;
}) => {
  const { activeBusiness } = useBusinessStore();
  if (isOfflineProductMode()) {
    return <>{children}</>;
  }

  if (!activeBusiness) {
    return <>{children}</>;
  }

  if (!isBusinessCommercialSectionEnabled(activeBusiness, sectionKey)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PermissionRouteGuard = ({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) => {
  const access = useAccess();
  if (isOfflineProductMode() && !permission.startsWith('team.')) {
    return <>{children}</>;
  }

  if (!access.hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const BackendCapabilityRouteGuard = ({
  capability,
  children,
}: {
  capability: BackendCapability;
  children: ReactNode;
}) => {
  if (isOfflineProductMode()) {
    return <>{children}</>;
  }
  if (!isBackendCapabilitySupported(capability)) {
    return <UnsupportedBackendFeature capability={capability} />;
  }

  return <>{children}</>;
};

const AppContent = () => {
  const effectiveTheme = useEffectiveTheme();
  
  useEffect(() => {
    const c: any = (navigator as any).connection;
    if (c?.saveData) return;
    if (c?.effectiveType && String(c.effectiveType).includes('2g')) return;
    const run = () => {
      const fns = [
        () => import('./pages/Dashboard'),
        () => import('./pages/Sales'),
        () => import('./pages/Products'),
        () => import('./pages/Customers')
      ];
      fns.forEach(fn => { try { fn(); } catch (_) {} });
    };
    const rid = (window as any).requestIdleCallback;
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      if (typeof rid === 'function') {
        rid(run, { timeout: 3000 });
      } else {
        setTimeout(run, 2000);
      }
    };
    const to = setTimeout(start, 2500);
    const once = () => { start(); cleanup(); };
    const cleanup = () => {
      window.removeEventListener('click', once);
      window.removeEventListener('keydown', once);
      window.removeEventListener('touchstart', once);
      clearTimeout(to);
    };
    window.addEventListener('click', once, { once: true } as any);
    window.addEventListener('keydown', once, { once: true } as any);
    window.addEventListener('touchstart', once, { once: true } as any);
    return cleanup;
  }, []);

  return (
    <>
      <ScrollbarActivityController />
      {isOfflineProductMode() ? null : <NotificationController />}
      <TourProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: effectiveTheme === 'dark' ? '#111827' : '#ffffff',
              color: effectiveTheme === 'dark' ? '#f3f4f6' : '#111827',
              border: `1px solid ${effectiveTheme === 'dark' ? '#374151' : '#e5e7eb'}`,
            },
          }}
        />
        <Suspense fallback={<div style={{display:'grid',placeItems:'center',height:'100dvh'}}>Cargando…</div>}>
        <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/select-context" element={<WebOnlyAuthRoute><ContextSelection /></WebOnlyAuthRoute>} />
        <Route path="/account-access" element={<WebOnlyAuthRoute><AccountAccessPage /></WebOnlyAuthRoute>} />
        <Route path="/" element={<AppEntryRoute />} />
        <Route path="/login" element={<DesktopAwareLoginRoute />} />
        <Route element={<AuthThemeLayout />}>
          <Route path="/auth/login" element={<WebOnlyAuthRoute><Login /></WebOnlyAuthRoute>} />
          <Route path="/team-login" element={<WebOnlyAuthRoute><TeamLogin /></WebOnlyAuthRoute>} />
          <Route path="/register" element={<WebOnlyAuthRoute><Register /></WebOnlyAuthRoute>} />
          <Route path="/accept-invite" element={<WebOnlyAuthRoute><AcceptInvite /></WebOnlyAuthRoute>} />
          <Route path="/admin/login" element={<WebOnlyAuthRoute><AdminLogin /></WebOnlyAuthRoute>} />
        </Route>
        
        {/* Admin Routes */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="revenue" element={<AdminRevenue />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="employees" element={<AdminEmployees />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="prices" element={<AdminPrices />} />
            <Route path="analytics" element={<AdminDashboard />} />
            <Route path="health" element={<AdminSystemHealth />} />
            <Route path="activity" element={<AdminActivity />} />
            <Route path="alerts" element={<AdminAlerts />} />
            
            {/* Fully Implemented Admin Pages */}
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="businesses" element={<AdminBusinesses />} />
            <Route path="data" element={<AdminData />} />
            <Route path="permissions" element={<AdminRoles />} /> {/* Permissions managed in Roles */}
            <Route path="security" element={<AdminSettings />} /> {/* Security in Settings */}
            <Route path="audit" element={<AdminActivity />} />
            <Route path="domains" element={<AdminSettings />} /> {/* Domains in Settings */}
            <Route path="integrations" element={<AdminSettings />} /> {/* Integrations in Settings */}
          </Route>
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pro" element={<Navigate to="/dashboard" replace />} />
          <Route path="/orders" element={
            <CommercialSectionRouteGuard sectionKey="orders">
              <PermissionRouteGuard permission="orders.view">
                <ModuleRouteGuard moduleKey="sales">
                  <ProGate feature={FEATURES.ORDERS} mode="block">
                    <Orders />
                  </ProGate>
                </ModuleRouteGuard>
              </PermissionRouteGuard>
            </CommercialSectionRouteGuard>
          } />
          <Route path="/agenda" element={
            <ModuleRouteGuard moduleKey="sales">
              <Agenda />
            </ModuleRouteGuard>
          } />
          <Route path="/sales" element={
            <PermissionRouteGuard permission="sales.view">
              <ModuleRouteGuard moduleKey="sales">
                <Sales />
              </ModuleRouteGuard>
            </PermissionRouteGuard>
          } />
          <Route path="/payments" element={
            <PermissionRouteGuard permission="receivables.view">
              <ModuleRouteGuard moduleKey="accounts_receivable">
                <Payments />
              </ModuleRouteGuard>
            </PermissionRouteGuard>
          } />
          <Route path="/customers" element={
            <PermissionRouteGuard permission="customers.view">
              <ModuleRouteGuard moduleKey="customers">
                <Customers />
              </ModuleRouteGuard>
            </PermissionRouteGuard>
          } />
          <Route path="/quotes" element={
            <PermissionRouteGuard permission="quotes.view">
              <ModuleRouteGuard moduleKey="sales">
                <Quotes />
              </ModuleRouteGuard>
            </PermissionRouteGuard>
          } />
          <Route path="/invoices" element={
            <BackendCapabilityRouteGuard capability="invoices">
              <CommercialSectionRouteGuard sectionKey="invoices">
                <PermissionRouteGuard permission="invoices.view">
                  <ModuleRouteGuard moduleKey="sales">
                    <Invoices />
                  </ModuleRouteGuard>
                </PermissionRouteGuard>
              </CommercialSectionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/invoices/receivables" element={
            <BackendCapabilityRouteGuard capability="invoices">
              <CommercialSectionRouteGuard sectionKey="invoices">
                <PermissionRouteGuard permission="receivables.view">
                  <ModuleRouteGuard moduleKey="sales">
                    <ModuleRouteGuard moduleKey="accounts_receivable">
                      <InvoiceReceivables />
                    </ModuleRouteGuard>
                  </ModuleRouteGuard>
                </PermissionRouteGuard>
              </CommercialSectionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/invoices/sync" element={
            <Navigate to="/invoices" replace />
          } />
          <Route path="/invoices/new" element={
            <BackendCapabilityRouteGuard capability="invoices">
              <CommercialSectionRouteGuard sectionKey="invoices">
                <PermissionRouteGuard permission="invoices.create">
                  <ModuleRouteGuard moduleKey="sales">
                    <InvoiceEditor />
                  </ModuleRouteGuard>
                </PermissionRouteGuard>
              </CommercialSectionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/invoices/settings" element={
            <BackendCapabilityRouteGuard capability="invoices">
              <CommercialSectionRouteGuard sectionKey="invoices">
                <PermissionRouteGuard permission="invoices.edit">
                  <ModuleRouteGuard moduleKey="sales">
                    <InvoiceSettings />
                  </ModuleRouteGuard>
                </PermissionRouteGuard>
              </CommercialSectionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/invoices/:invoiceId" element={
            <BackendCapabilityRouteGuard capability="invoices">
              <CommercialSectionRouteGuard sectionKey="invoices">
                <PermissionRouteGuard permission="invoices.view">
                  <ModuleRouteGuard moduleKey="sales">
                    <InvoiceDetail />
                  </ModuleRouteGuard>
                </PermissionRouteGuard>
              </CommercialSectionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/invoices/customers/:customerId/statement" element={
            <BackendCapabilityRouteGuard capability="invoices">
              <CommercialSectionRouteGuard sectionKey="invoices">
                <PermissionRouteGuard permission="receivables.view">
                  <ModuleRouteGuard moduleKey="sales">
                    <ModuleRouteGuard moduleKey="accounts_receivable">
                      <InvoiceCustomerStatement />
                    </ModuleRouteGuard>
                  </ModuleRouteGuard>
                </PermissionRouteGuard>
              </CommercialSectionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/invoices/:invoiceId/edit" element={
            <BackendCapabilityRouteGuard capability="invoices">
              <CommercialSectionRouteGuard sectionKey="invoices">
                <PermissionRouteGuard permission="invoices.edit">
                  <ModuleRouteGuard moduleKey="sales">
                    <InvoiceEditor />
                  </ModuleRouteGuard>
                </PermissionRouteGuard>
              </CommercialSectionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/products" element={
            <PermissionRouteGuard permission="products.view">
              <ModuleRouteGuard moduleKey="products">
                <Products />
              </ModuleRouteGuard>
            </PermissionRouteGuard>
          } />
          <Route path="/raw-inventory" element={
            <BackendCapabilityRouteGuard capability="raw_inventory">
              <PermissionRouteGuard permission="raw_inventory.view">
                <ModuleRouteGuard moduleKey="raw_inventory">
                  <RawInventory />
                </ModuleRouteGuard>
              </PermissionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/suppliers" element={
            <BackendCapabilityRouteGuard capability="suppliers">
              <PermissionRouteGuard permission="suppliers.view">
                <ModuleRouteGuard moduleKey="raw_inventory">
                  <Suppliers />
                </ModuleRouteGuard>
              </PermissionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/raw-purchases" element={
            <BackendCapabilityRouteGuard capability="raw_purchases">
              <PermissionRouteGuard permission="raw_purchases.view">
                <ModuleRouteGuard moduleKey="raw_inventory">
                  <RawPurchases />
                </ModuleRouteGuard>
              </PermissionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/supplier-payables" element={
            <BackendCapabilityRouteGuard capability="supplier_payables">
              <PermissionRouteGuard permission="supplier_payables.view">
                <ModuleRouteGuard moduleKey="raw_inventory">
                  <SupplierPayables />
                </ModuleRouteGuard>
              </PermissionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/recipes" element={
            <BackendCapabilityRouteGuard capability="recipes">
              <PermissionRouteGuard permission="recipes.view">
                <ModuleRouteGuard moduleKey="raw_inventory">
                  <Recipes />
                </ModuleRouteGuard>
              </PermissionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/cost-calculator" element={
            <BackendCapabilityRouteGuard capability="recipes">
              <PermissionRouteGuard permission="recipes.view">
                <ModuleRouteGuard moduleKey="raw_inventory">
                  <CostCalculator />
                </ModuleRouteGuard>
              </PermissionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/debts" element={
            <ProGate feature={FEATURES.DEBTS} mode="block">
              <PermissionRouteGuard permission="debts.view">
                <Debts />
              </PermissionRouteGuard>
            </ProGate>
          } />
          <Route path="/treasury" element={
            <BackendCapabilityRouteGuard capability="treasury">
              <PermissionRouteGuard permission="treasury.view">
                <Treasury />
              </PermissionRouteGuard>
            </BackendCapabilityRouteGuard>
          } />
          <Route path="/expenses" element={
            <PermissionRouteGuard permission="expenses.view">
              <Expenses />
            </PermissionRouteGuard>
          } />
          <Route path="/sales-goals" element={
            <CommercialSectionRouteGuard sectionKey="sales_goals">
              <PermissionRouteGuard permission="reports.view">
                <ModuleRouteGuard moduleKey="sales">
                  <ProGate feature={FEATURES.REPORTS} mode="block">
                    <SalesGoals />
                  </ProGate>
                </ModuleRouteGuard>
              </PermissionRouteGuard>
            </CommercialSectionRouteGuard>
          } />
          <Route path="/reports" element={
            <PermissionRouteGuard permission="reports.view">
              <ModuleRouteGuard moduleKey="reports">
                <ProGate feature={FEATURES.REPORTS} mode="block">
                  <Reports />
                </ProGate>
              </ModuleRouteGuard>
            </PermissionRouteGuard>
          } />
          <Route path="/alerts" element={
            <PermissionRouteGuard permission="reports.view">
              <ModuleRouteGuard moduleKey="reports">
                <ProGate feature={FEATURES.ALERTS} mode="block">
                  <Alerts />
                </ProGate>
              </ModuleRouteGuard>
            </PermissionRouteGuard>
          } />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
        </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </TourProvider>
    </>
  );
};

function App() {
  return (
    <BrowserRouter>
      <GlobalAppErrorBoundary>
        <ThemeProvider>
          <ConfirmProvider>
            <AppContent />
          </ConfirmProvider>
        </ThemeProvider>
      </GlobalAppErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
