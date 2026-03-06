import { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
const Login = lazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Register').then(m => ({ default: m.Register })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Sales = lazy(() => import('./pages/Sales').then(m => ({ default: m.Sales })));
const Customers = lazy(() => import('./pages/Customers').then(m => ({ default: m.Customers })));
const Expenses = lazy(() => import('./pages/Expenses').then(m => ({ default: m.Expenses })));
const SalesGoals = lazy(() => import('./pages/SalesGoals').then(m => ({ default: m.SalesGoals })));
const Orders = lazy(() => import('./pages/Orders').then(m => ({ default: m.Orders })));
const Payments = lazy(() => import('./pages/Payments').then(m => ({ default: m.Payments })));
const Products = lazy(() => import('./pages/Products').then(m => ({ default: m.Products })));
const Alerts = lazy(() => import('./pages/Alerts').then(m => ({ default: m.Alerts })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })));
import { useThemeStore } from './store/themeStore';

import { RequireAdmin } from './components/RequireAdmin';
import { AdminLayout } from './components/Admin/Layout/AdminLayout';
import { AdminDashboard } from './pages/Admin/Dashboard';
import { AdminUsers } from './pages/Admin/Users';
import { AdminRoles } from './pages/Admin/Roles';
import { AdminSettings } from './pages/Admin/Settings';
import { AdminBanners } from './pages/Admin/Banners';
import { AdminPrices } from './pages/Admin/Prices';
import { AdminBusinesses } from './pages/Admin/Businesses';
import { AdminCustomers } from './pages/Admin/Customers';
import { AdminProducts } from './pages/Admin/Products';
import { AdminAudit } from './pages/Admin/Audit';
import { AdminData } from './pages/Admin/Data';
import { AdminLogin } from './pages/Admin/Login';
const Help = lazy(() => import('./pages/Help').then(m => ({ default: m.Help })));
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy').then(m => ({ default: m.PrivacyPolicy })));
const TermsAndConditions = lazy(() => import('./pages/TermsAndConditions').then(m => ({ default: m.TermsAndConditions })));
const ProPage = lazy(() => import('./pages/ProPage').then(m => ({ default: m.default })));
import { ProGate } from './components/ui/ProGate';
import { FEATURES } from './auth/plan';
import { TourProvider } from './tour/TourProvider';

function App() {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    document.documentElement.classList.add('dark');
    if (theme !== 'dark') {
        setTheme('dark');
    }
  }, [theme, setTheme]);
  
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
    <BrowserRouter>
      <TourProvider>
      <Suspense fallback={<div style={{display:'grid',placeItems:'center',height:'100dvh'}}>Cargando…</div>}>
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/terms" element={<TermsAndConditions />} />
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        
        {/* Admin Routes */}
        <Route element={<RequireAdmin />}>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="banners" element={<AdminBanners />} />
            <Route path="prices" element={<AdminPrices />} />
            <Route path="analytics" element={<AdminDashboard />} />
            
            {/* Fully Implemented Admin Pages */}
            <Route path="customers" element={<AdminCustomers />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="businesses" element={<AdminBusinesses />} />
            <Route path="data" element={<AdminData />} />
            <Route path="permissions" element={<AdminRoles />} /> {/* Permissions managed in Roles */}
            <Route path="security" element={<AdminSettings />} /> {/* Security in Settings */}
            <Route path="audit" element={<AdminAudit />} />
            <Route path="domains" element={<AdminSettings />} /> {/* Domains in Settings */}
            <Route path="integrations" element={<AdminSettings />} /> {/* Integrations in Settings */}
          </Route>
        </Route>

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pro" element={<ProPage />} />
          <Route path="/orders" element={
            <ProGate feature={FEATURES.ORDERS} mode="redirect">
              <Orders />
            </ProGate>
          } />
          <Route path="/sales" element={<Sales />} />
          <Route path="/payments" element={<Payments />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/products" element={<Products />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/sales-goals" element={<SalesGoals />} />
          <Route path="/reports" element={
            <ProGate feature={FEATURES.REPORTS} mode="redirect">
              <Reports />
            </ProGate>
          } />
          <Route path="/alerts" element={
            <ProGate feature={FEATURES.ALERTS} mode="redirect">
              <Alerts />
            </ProGate>
          } />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<Help />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      </TourProvider>
    </BrowserRouter>
  );
}

export default App;
