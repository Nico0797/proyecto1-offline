import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { MainLayout } from './components/Layout/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { Sales } from './pages/Sales';
import { Customers } from './pages/Customers';
import { Expenses } from './pages/Expenses';
import { SalesGoals } from './pages/SalesGoals';
import { Orders } from './pages/Orders';
import { Payments } from './pages/Payments';
import { Products } from './pages/Products';
import { Alerts } from './pages/Alerts';
import { Settings } from './pages/Settings';
import { Reports } from './pages/Reports';
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
import { Help } from './pages/Help';
import { LandingPage } from './pages/LandingPage';
import { PrivacyPolicy } from './pages/PrivacyPolicy';
import { TermsAndConditions } from './pages/TermsAndConditions';
import ProPage from './pages/ProPage';
import { ProGate } from './components/ui/ProGate';
import { FEATURES } from './auth/plan';
import { TourProvider } from './tour/TourProvider';

function App() {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    // Force dark mode always
    document.documentElement.classList.add('dark');
    if (theme !== 'dark') {
        setTheme('dark');
    }
  }, [theme, setTheme]);

  return (
    <BrowserRouter>
      <TourProvider>
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
      </TourProvider>
    </BrowserRouter>
  );
}

export default App;
