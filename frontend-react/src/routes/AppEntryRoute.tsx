import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { pushBootTrace } from '../debug/bootTrace';
import { getRuntimeModeSnapshot, isOfflineProductMode } from '../runtime/runtimeMode';

type AppEntryRouteProps = {
  fallbackPath?: string;
};

export const AppEntryRoute = ({ fallbackPath = '/login' }: AppEntryRouteProps) => {
  const { isHydrating, isAuthenticated, activeContext, accessibleContexts, fetchUser } = useAuthStore();
  const activeBusiness = useBusinessStore((state) => state.activeBusiness);
  const offlineProductMode = isOfflineProductMode();
  const [offlineBootstrapTimedOut, setOfflineBootstrapTimedOut] = useState(false);

  useEffect(() => {
    if (!offlineProductMode || !isHydrating) {
      setOfflineBootstrapTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      console.warn('[startup][AppEntryRoute] offline bootstrap timeout', {
        runtime: getRuntimeModeSnapshot(),
        hasActiveBusiness: Boolean(activeBusiness?.id),
        hasActiveContext: Boolean(activeContext?.business_id),
      });
      pushBootTrace('AppEntryRoute.offlineBootstrapTimeout', {
        hasActiveBusiness: Boolean(activeBusiness?.id),
        activeBusinessId: activeBusiness?.id ?? null,
        hasActiveContext: Boolean(activeContext?.business_id),
        activeContextBusinessId: activeContext?.business_id ?? null,
      });
      setOfflineBootstrapTimedOut(true);
    }, 4000);

    return () => window.clearTimeout(timeoutId);
  }, [activeBusiness?.id, activeContext?.business_id, isHydrating, offlineProductMode]);

  const finalRoute = isHydrating
    ? (offlineProductMode && offlineBootstrapTimedOut ? '/dashboard' : 'hydrating')
    : offlineProductMode
      ? '/dashboard'
      : isAuthenticated && (activeContext?.business_id || activeBusiness?.id)
        ? '/dashboard'
        : isAuthenticated && accessibleContexts.length > 0
          ? '/select-context'
          : fallbackPath;

  const finalComponent = isHydrating
    ? (offlineProductMode && offlineBootstrapTimedOut ? 'AppEntryRouteOfflineTimeoutNavigate' : 'AppEntryRouteLoading')
    : 'AppEntryRouteNavigate';

  useEffect(() => {
    if (!isHydrating) return;
    pushBootTrace('AppEntryRoute.fetchUserRequested', {
      offlineProductMode,
      hasActiveBusiness: Boolean(activeBusiness?.id),
      hasActiveContext: Boolean(activeContext?.business_id),
    });
    void fetchUser();
  }, [fetchUser, isHydrating]);

  useEffect(() => {
    pushBootTrace('AppEntryRoute.render', {
      finalRoute,
      finalComponent,
      isHydrating,
      isAuthenticated,
      activeBusinessId: activeBusiness?.id ?? null,
      activeContextBusinessId: activeContext?.business_id ?? null,
      accessibleContextsCount: accessibleContexts.length,
    });
    console.info('[startup][AppEntryRoute] render', {
      runtime: getRuntimeModeSnapshot(),
      finalRoute,
      isHydrating,
      isAuthenticated,
      hasActiveBusiness: Boolean(activeBusiness?.id),
      hasActiveContext: Boolean(activeContext?.business_id),
      accessibleContextsCount: accessibleContexts.length,
      finalComponent,
    });
  }, [accessibleContexts.length, activeBusiness?.id, activeContext?.business_id, finalComponent, finalRoute, isAuthenticated, isHydrating]);

  if (isHydrating) {
    if (offlineProductMode && offlineBootstrapTimedOut) {
      return <Navigate to="/dashboard" replace />;
    }

    return (
      <div className="app-canvas flex min-h-[100dvh] items-center justify-center text-sm font-medium app-text">
        Preparando tu espacio local...
      </div>
    );
  }

  if (offlineProductMode) {
    return <Navigate to="/dashboard" replace />;
  }

  if (isAuthenticated) {
    if (activeContext?.business_id || activeBusiness?.id) {
      return <Navigate to="/dashboard" replace />;
    }

    if (accessibleContexts.length > 0) {
      return <Navigate to="/select-context" replace />;
    }
  }

  return <Navigate to={fallbackPath} replace />;
};

export const DesktopAwareLoginRoute = () => {
  if (isOfflineProductMode()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/auth/login" replace />;
};

export const WebOnlyAuthRoute = ({ children }: { children: ReactNode }) => {
  if (isOfflineProductMode()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
