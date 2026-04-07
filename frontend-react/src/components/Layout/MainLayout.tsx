import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { useOfflineSyncStore } from '../../store/offlineSyncStore';
import { useAccountAccessStore } from '../../store/accountAccessStore';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { DemoPreviewBanner } from './DemoPreviewBanner';
import { SyncAlertBanner } from './OfflineSyncBanner';
import { MobileTopBar } from './MobileTopBar';
import { PreviewActionGuard } from './PreviewActionGuard';
import { SyncToastFeedback } from '../Sync/SyncToastFeedback';

export const MainLayout = () => {
  const location = useLocation();
  const { isAuthenticated, isHydrating, activeContext, accessibleContexts, fetchUser, user } = useAuthStore();
  const { activeBusiness, fetchAuthBootstrap } = useBusinessStore();
  const { initialize, setTrackedBusiness } = useOfflineSyncStore();
  const {
    access,
    hasLoaded: hasLoadedAccountAccess,
    isLoading: isLoadingAccountAccess,
    fetchStatus: fetchAccountAccessStatus,
    clear: clearAccountAccess,
  } = useAccountAccessStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const isDemoPreview = Boolean(access?.demo_preview_active);
  const showSyncIncidentBanner =
    location.pathname !== '/invoices/sync'
    && !(location.pathname === '/settings' && new URLSearchParams(location.search).get('section') === 'sync');
  const shouldResolveAccountAccess = isAuthenticated && user?.account_type !== 'team_member' && !user?.is_admin;

  // Refresh user data on mount to ensure permissions/roles are up to date
  useEffect(() => {
      fetchUser();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      clearAccountAccess();
      return;
    }

    if (!shouldResolveAccountAccess || !user?.id) {
      return;
    }

    void fetchAccountAccessStatus().catch(() => undefined);
  }, [clearAccountAccess, fetchAccountAccessStatus, isAuthenticated, shouldResolveAccountAccess, user?.id]);

  useEffect(() => {
    void initialize(activeContext?.business_id ?? activeBusiness?.id ?? null);
  }, [activeBusiness?.id, activeContext?.business_id, initialize]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (isDemoPreview) {
      if (activeBusiness?.id) {
        return;
      }
      void fetchAuthBootstrap(access?.demo_business_id ?? null);
      return;
    }

    if (!activeContext?.business_id) {
      return;
    }
    if (activeBusiness?.id === activeContext.business_id) {
      return;
    }
    void fetchAuthBootstrap(activeContext.business_id);
  }, [access?.demo_business_id, activeBusiness?.id, activeContext?.business_id, fetchAuthBootstrap, isAuthenticated, isDemoPreview]);

  useEffect(() => {
    if (activeBusiness?.id) {
        setTrackedBusiness(activeBusiness.id);
    }
  }, [activeBusiness?.id, setTrackedBusiness]);

  // Check auth and context
  if (isHydrating) {
    return (
      <div className="app-canvas flex min-h-[100dvh] items-center justify-center text-sm font-medium app-text">
        Restaurando tu sesión...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (shouldResolveAccountAccess && !hasLoadedAccountAccess && isLoadingAccountAccess) {
    return (
      <div className="app-canvas flex min-h-[100dvh] items-center justify-center text-sm font-medium app-text">
        Preparando tu acceso...
      </div>
    );
  }

  if (
    shouldResolveAccountAccess &&
    hasLoadedAccountAccess &&
    (!access || (!access.active && !access.existing_access && !access.demo_preview_active))
  ) {
    return <Navigate to="/account-access" replace />;
  }

  // If authenticated but no active context
  if (!activeContext) {
    // If has accessible contexts, go to selection
    if (accessibleContexts && accessibleContexts.length > 0) {
      return <Navigate to="/select-context" replace />;
    }
    // Brand-new accounts may not have a business yet.
    // Let them reach the dashboard empty state to create their first one.
  }

  return (
    <div className="app-canvas app-text flex h-full min-h-[100dvh] overflow-hidden transition-colors duration-300">
      <SyncToastFeedback />
      <PreviewActionGuard />
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Wrapper */}
      <div className="flex min-h-0 h-full w-full flex-1 flex-col transition-all duration-300 lg:pl-64">
        <MobileTopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <DemoPreviewBanner />
        {showSyncIncidentBanner ? <SyncAlertBanner /> : null}

        {/* Main Content Area */}
        <main className="app-page custom-scrollbar relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[calc(5rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden">
            <MobileBottomNav onMenuClick={() => setIsSidebarOpen(true)} />
        </div>
      </div>
    </div>
  );
};
