import { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import { useOfflineSyncStore } from '../../store/offlineSyncStore';
import { useAccountAccessStore } from '../../store/accountAccessStore';
import { pushBootTrace } from '../../debug/bootTrace';
import { BootTracePanel } from '../../debug/BootTracePanel';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { MobileTopBar } from './MobileTopBar';
import { MobileShellDebugOverlay } from './MobileShellDebugOverlay';
import { CreateBusinessModal } from '../Business/CreateBusinessModal';
import { getRuntimeModeSnapshot, isDesktopOfflineMode, isOfflineProductMode } from '../../runtime/runtimeMode';
import { offlineSyncService } from '../../services/offlineSyncService';
import { downloadLocalBackupSnapshot, importLocalBackupSnapshot } from '../../services/localBackup';

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
  const [scrollTop, setScrollTop] = useState(0);
  const [localBusinessesCount, setLocalBusinessesCount] = useState(0);
  const [isCreateBusinessModalOpen, setIsCreateBusinessModalOpen] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const [isRecoveryBusy, setIsRecoveryBusy] = useState(false);
  const [hasAttemptedLocalRecovery, setHasAttemptedLocalRecovery] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const desktopOfflineMode = isDesktopOfflineMode();
  const offlineProductMode = isOfflineProductMode();
  const isDemoPreview = Boolean(access?.demo_preview_active);
  const allowsOfflineBootstrap = desktopOfflineMode || offlineProductMode;
  const [offlineBootstrapTimedOut, setOfflineBootstrapTimedOut] = useState(false);
  const shouldResolveAccountAccess =
    !offlineProductMode
    && isAuthenticated
    && user?.account_type !== 'team_member'
    && !user?.is_admin;

  // Refresh user data on mount to ensure permissions/roles are up to date
  useEffect(() => {
    if (offlineProductMode && !isHydrating) return;
    if (!offlineProductMode && isHydrating) return;
    pushBootTrace('MainLayout.fetchUserRequested', {
      path: `${location.pathname}${location.search}`,
      offlineProductMode,
      isHydrating,
      activeBusinessId: activeBusiness?.id ?? null,
      activeContextBusinessId: activeContext?.business_id ?? null,
    });
    void fetchUser();
  }, [activeBusiness?.id, activeContext?.business_id, fetchUser, isHydrating, location.pathname, location.search, offlineProductMode]);

  useEffect(() => {
    if (!offlineProductMode || !isHydrating) {
      setOfflineBootstrapTimedOut(false);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      console.warn('[startup][MainLayout] offline bootstrap timeout', {
        runtime: getRuntimeModeSnapshot(),
        path: `${location.pathname}${location.search}`,
        hasActiveBusiness: Boolean(activeBusiness?.id),
        hasActiveContext: Boolean(activeContext?.business_id),
      });
      pushBootTrace('MainLayout.offlineBootstrapTimeout', {
        path: `${location.pathname}${location.search}`,
        activeBusinessId: activeBusiness?.id ?? null,
        activeContextBusinessId: activeContext?.business_id ?? null,
      });
      setOfflineBootstrapTimedOut(true);
    }, 4500);

    return () => window.clearTimeout(timeoutId);
  }, [activeBusiness?.id, activeContext?.business_id, isHydrating, location.pathname, location.search, offlineProductMode]);

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
    if (offlineProductMode) return;
    void initialize(activeContext?.business_id ?? activeBusiness?.id ?? null);
  }, [activeBusiness?.id, activeContext?.business_id, initialize, offlineProductMode]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    if (isDemoPreview) {
      if (activeBusiness?.id) {
        return;
      }
      pushBootTrace('MainLayout.fetchAuthBootstrapRequested', {
        reason: 'demoPreview',
        preferredBusinessId: access?.demo_business_id ?? null,
        activeBusinessId: activeBusiness?.id ?? null,
        activeContextBusinessId: activeContext?.business_id ?? null,
      });
      void fetchAuthBootstrap(access?.demo_business_id ?? null);
      return;
    }

    if (!activeContext?.business_id) {
      return;
    }
    if (activeBusiness?.id === activeContext.business_id) {
      return;
    }
    pushBootTrace('MainLayout.fetchAuthBootstrapRequested', {
      reason: 'contextMismatch',
      preferredBusinessId: activeContext.business_id,
      activeBusinessId: activeBusiness?.id ?? null,
      activeContextBusinessId: activeContext?.business_id ?? null,
    });
    void fetchAuthBootstrap(activeContext.business_id);
  }, [access?.demo_business_id, activeBusiness?.id, activeContext?.business_id, fetchAuthBootstrap, isAuthenticated, isDemoPreview]);

  useEffect(() => {
    if (offlineProductMode) return;
    if (activeBusiness?.id) {
        setTrackedBusiness(activeBusiness.id);
    }
  }, [activeBusiness?.id, offlineProductMode, setTrackedBusiness]);

  useEffect(() => {
    if (!offlineProductMode) {
      setLocalBusinessesCount(0);
      setHasAttemptedLocalRecovery(false);
      return;
    }

    let cancelled = false;

    const loadLocalBusinesses = async () => {
      try {
        const localBusinesses = await offlineSyncService.getBusinessesFromLocal();
        if (!cancelled) {
          setLocalBusinessesCount(localBusinesses.length);
        }
      } catch {
        if (!cancelled) {
          setLocalBusinessesCount(0);
        }
      }
    };

    void loadLocalBusinesses();

    return () => {
      cancelled = true;
    };
  }, [offlineProductMode, activeBusiness?.id]);

  // FASE 1 LIMPIEZA: Reset explícito de scroll al cambiar de ruta
  useEffect(() => {
    const root = document.getElementById('app-main-scroll');
    if (root) {
      root.scrollTop = 0;
    }
  }, [location.pathname]);

  // FASE 1 LIMPIEZA: Solo trackear scroll para debug, NO controlar FAB
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const root = document.getElementById('app-main-scroll');
    if (!root) return undefined;

    let frameId: number | null = null;

    const updateScrollState = () => {
      setScrollTop(root.scrollTop);
    };

    const handleScroll = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        updateScrollState();
      });
    };

    updateScrollState();
    root.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      root.removeEventListener('scroll', handleScroll);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, []);

  useEffect(() => {
    if (!offlineProductMode || isHydrating || activeBusiness || hasAttemptedLocalRecovery || localBusinessesCount <= 0) {
      return;
    }

    setHasAttemptedLocalRecovery(true);
    void fetchAuthBootstrap(null);
  }, [activeBusiness, fetchAuthBootstrap, hasAttemptedLocalRecovery, isHydrating, localBusinessesCount, offlineProductMode]);

  const refreshLocalBusinessCount = useCallback(async () => {
    const localBusinesses = await offlineSyncService.getBusinessesFromLocal();
    setLocalBusinessesCount(localBusinesses.length);
    return localBusinesses;
  }, []);

  const handleRecoveryImport = useCallback(async (file: File) => {
    setRecoveryError(null);
    setIsRecoveryBusy(true);
    try {
      const restored = await importLocalBackupSnapshot(file);
      const nextBusinesses = await refreshLocalBusinessCount();
      setHasAttemptedLocalRecovery(false);
      await fetchUser();
      await fetchAuthBootstrap(restored.activeBusiness?.id ?? nextBusinesses[0]?.id ?? null);
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'No fue posible restaurar el respaldo local.');
      throw error;
    } finally {
      setIsRecoveryBusy(false);
    }
  }, [fetchAuthBootstrap, fetchUser, refreshLocalBusinessCount]);

  const handleRecoveryRetry = useCallback(async () => {
    setRecoveryError(null);
    setIsRecoveryBusy(true);
    try {
      const localBusinesses = await refreshLocalBusinessCount();
      await fetchUser();
      await fetchAuthBootstrap(activeContext?.business_id ?? activeBusiness?.id ?? localBusinesses[0]?.id ?? null);
    } catch (error) {
      setRecoveryError(error instanceof Error ? error.message : 'No fue posible reintentar la carga local.');
    } finally {
      setIsRecoveryBusy(false);
    }
  }, [activeBusiness?.id, activeContext?.business_id, fetchAuthBootstrap, fetchUser, refreshLocalBusinessCount]);

  const finalComponent = isHydrating
    ? (offlineProductMode && offlineBootstrapTimedOut ? 'MainLayoutOfflineTimeoutShell' : 'MainLayoutHydrating')
    : !isAuthenticated && !allowsOfflineBootstrap
      ? 'MainLayoutLoginRedirect'
      : shouldResolveAccountAccess && !hasLoadedAccountAccess && isLoadingAccountAccess
        ? 'MainLayoutAccountAccessLoading'
        : shouldResolveAccountAccess && hasLoadedAccountAccess && (!access || (!access.active && !access.existing_access && !access.demo_preview_active))
          ? 'MainLayoutAccountAccessRedirect'
          : !activeContext && accessibleContexts && accessibleContexts.length > 0 && !offlineProductMode
            ? 'MainLayoutContextRedirect'
            : 'MainLayoutShell';

  useEffect(() => {
    pushBootTrace('MainLayout.render', {
      path: `${location.pathname}${location.search}`,
      isHydrating,
      isAuthenticated,
      activeBusinessId: activeBusiness?.id ?? null,
      activeContextBusinessId: activeContext?.business_id ?? null,
      accessibleContextsCount: accessibleContexts?.length ?? 0,
      finalComponent,
      offlineBootstrapTimedOut,
    });
    console.info('[startup][MainLayout] render', {
      runtime: getRuntimeModeSnapshot(),
      path: `${location.pathname}${location.search}`,
      isHydrating,
      isAuthenticated,
      hasActiveBusiness: Boolean(activeBusiness?.id),
      hasActiveContext: Boolean(activeContext?.business_id),
      accessibleContextsCount: accessibleContexts?.length ?? 0,
      accountAccessLoaded: hasLoadedAccountAccess,
      accountAccessLoading: isLoadingAccountAccess,
      finalComponent,
    });
  }, [accessibleContexts, access, activeBusiness?.id, activeContext?.business_id, finalComponent, hasLoadedAccountAccess, isAuthenticated, isHydrating, isLoadingAccountAccess, location.pathname, location.search]);

  const retryOfflineBootstrap = () => {
    pushBootTrace('MainLayout.retryOfflineBootstrap', {
      path: `${location.pathname}${location.search}`,
      activeBusinessId: activeBusiness?.id ?? null,
      activeContextBusinessId: activeContext?.business_id ?? null,
    });
    setOfflineBootstrapTimedOut(false);
    void handleRecoveryRetry();
  };

  if (isHydrating) {
    if (offlineProductMode && offlineBootstrapTimedOut) {
      console.warn('[startup][MainLayout] rendering offline timeout fallback shell', {
        runtime: getRuntimeModeSnapshot(),
        path: `${location.pathname}${location.search}`,
        hasActiveBusiness: Boolean(activeBusiness?.id),
      });
      return (
        <div className="app-canvas app-text flex min-h-[100dvh] items-center justify-center px-5">
          <div className="app-surface w-full max-w-md rounded-3xl p-6 text-center shadow-sm">
            <div className="text-lg font-semibold">No pudimos abrir tu espacio local</div>
            <div className="mt-2 text-sm app-text-muted">
              El arranque offline tardó demasiado. La app no quedará en blanco: puedes reintentar desde aquí.
            </div>
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-100">
              <div>path={location.pathname}{location.search}</div>
              <div>hydrating=yes timeout=yes</div>
              <div>activeBusiness={activeBusiness?.id ?? 'none'}</div>
              <div>activeContext={activeContext?.business_id ?? 'none'}</div>
            </div>
            <button
              type="button"
              onClick={retryOfflineBootstrap}
              className="mt-4 inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Reintentar arranque local
            </button>
            <div className="mt-3 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => setIsCreateBusinessModalOpen(true)}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] px-4 text-sm font-semibold app-text transition hover:bg-[color:var(--app-surface-soft)]"
              >
                Crear negocio local
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] px-4 text-sm font-semibold app-text transition hover:bg-[color:var(--app-surface-soft)]"
              >
                Restaurar respaldo local
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleRecoveryImport(file);
                }
              }}
            />
            <CreateBusinessModal
              isOpen={isCreateBusinessModalOpen}
              onClose={() => setIsCreateBusinessModalOpen(false)}
              onSuccess={() => {
                setRecoveryError(null);
                setIsCreateBusinessModalOpen(false);
                void refreshLocalBusinessCount();
              }}
            />
          </div>
        </div>
      );
    }

    return (
      <div className="app-canvas flex min-h-[100dvh] items-center justify-center text-sm font-medium app-text">
        Preparando tu espacio local...
      </div>
    );
  }

  if (!isAuthenticated && !allowsOfflineBootstrap) {
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

  if (!activeContext) {
    if (accessibleContexts && accessibleContexts.length > 0 && !offlineProductMode) {
      return <Navigate to="/select-context" replace />;
    }
  }

  if (offlineProductMode && !activeBusiness) {
    return (
      <div className="app-canvas app-text flex min-h-[100dvh] items-center justify-center px-5">
        <div className="app-surface w-full max-w-md rounded-3xl p-6 text-center shadow-sm">
          <div className="text-lg font-semibold">No hay un negocio local activo</div>
          <div className="mt-2 text-sm app-text-muted">
            La app cargó en modo offline, pero no encontró un negocio para abrir. Elige una opción para continuar.
          </div>

          {/* Diagnóstico visible */}
          <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-xs text-blue-900 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-100 space-y-0.5">
            <div>path: {location.pathname}{location.search}</div>
            <div>hydrating: {isHydrating ? 'yes' : 'no'}</div>
            <div>authenticated: {isAuthenticated ? 'yes' : 'no'}</div>
            <div>accessibleContexts: {accessibleContexts?.length ?? 0}</div>
            <div>localBusinessesCount: {localBusinessesCount}</div>
            <div>offlineBootstrapTimedOut: {offlineBootstrapTimedOut ? 'yes' : 'no'}</div>
          </div>

          {/* Mensaje condicional */}
          {localBusinessesCount === 0 ? (
            <div className="mt-3 text-xs text-amber-700 dark:text-amber-300">
              No se detectaron negocios locales. Crea uno nuevo o restaura un respaldo.
            </div>
          ) : (
            <div className="mt-3 text-xs text-emerald-700 dark:text-emerald-300">
              Se encontraron {localBusinessesCount} negocio(s) local(es). Puedes abrirlo(s) directamente.
            </div>
          )}

          <div className="mt-4 flex flex-col gap-3">
            {/* Opción 1: Crear negocio (siempre disponible) */}
            <button
              type="button"
              onClick={() => setIsCreateBusinessModalOpen(true)}
              className="inline-flex h-11 items-center justify-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Crear negocio local
            </button>

            {/* Opción 2: Restaurar backup (siempre disponible) */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isRecoveryBusy}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-elevated)] px-4 text-sm font-semibold app-text transition hover:bg-[color:var(--app-surface-soft)] disabled:opacity-60"
            >
              Restaurar respaldo local (JSON)
            </button>

            {/* Opción 3: Abrir negocio existente (solo si hay) */}
            {localBusinessesCount > 0 ? (
              <button
                type="button"
                onClick={retryOfflineBootstrap}
                disabled={isRecoveryBusy}
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-[color:var(--app-border)] bg-[color:var(--app-surface-soft)] px-4 text-sm font-semibold app-text transition hover:bg-[color:var(--app-surface-muted)] disabled:opacity-60"
              >
                {isRecoveryBusy ? 'Abriendo...' : `Abrir negocio local (${localBusinessesCount})`}
              </button>
            ) : null}

            {/* Opción 4: Forzar bypass (emergencia) */}
            <button
              type="button"
              onClick={() => {
                // Bypass de emergencia: intenta crear sesión offline mínima
                pushBootTrace('MainLayout.emergencyOfflineBypass', { localBusinessesCount });
                void handleRecoveryRetry();
              }}
              disabled={isRecoveryBusy}
              className="inline-flex h-11 items-center justify-center rounded-2xl border border-dashed border-[color:var(--app-border)] bg-transparent px-4 text-xs font-medium app-text-muted transition hover:bg-[color:var(--app-surface-soft)] disabled:opacity-60"
            >
              {isRecoveryBusy ? 'Reintentando...' : 'Reintentar arranque automático'}
            </button>
          </div>

          {recoveryError ? (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-200">
              {recoveryError}
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                void handleRecoveryImport(file);
              }
            }}
          />
          <CreateBusinessModal
            isOpen={isCreateBusinessModalOpen}
            onClose={() => setIsCreateBusinessModalOpen(false)}
            onSuccess={() => {
              setRecoveryError(null);
              setIsCreateBusinessModalOpen(false);
              void refreshLocalBusinessCount();
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app-canvas app-text flex min-h-[100dvh] w-full overflow-hidden transition-colors duration-300 lg:min-h-full">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <BootTracePanel />

      {/* Status bar scrim – covers the system bar area on mobile with a gradient overlay */}
      <div className="app-status-bar-scrim lg:hidden" aria-hidden="true" />

      {/* Main Content Wrapper */}
      <div className="app-mobile-safe-frame flex min-h-[100dvh] w-full flex-1 flex-col overflow-hidden transition-all duration-300 lg:min-h-full lg:pl-64 lg:pt-0">
        {/* Main Content Area */}
        <main id="app-main-scroll" className="app-page custom-scrollbar relative flex-1 min-h-0 overflow-y-auto overflow-x-hidden pb-[calc(var(--app-mobile-bottom-nav-height)+var(--app-mobile-bottom-nav-overhang)+var(--app-safe-area-bottom))] lg:pb-0">
          <MobileTopBar onMenuClick={() => setIsSidebarOpen(true)} />
          <Outlet />
        </main>

        {/* FASE 1 LIMPIEZA: FAB contextual desactivado temporalmente */}
        {/* <ContextualFloatingFab /> */}
        <MobileShellDebugOverlay
          scrollTop={scrollTop}
          localBusinessesCount={localBusinessesCount}
          offlineMode={offlineProductMode}
          onExportBackup={downloadLocalBackupSnapshot}
          onImportBackup={handleRecoveryImport}
        />

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden">
            <MobileBottomNav
              isSidebarOpen={isSidebarOpen}
              onMenuToggle={() => setIsSidebarOpen((current) => !current)}
            />
        </div>
      </div>
    </div>
  );
};
