import React, { useState, useRef, useEffect, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useBusinessStore } from '../../store/businessStore';
import api from '../../services/api';
import { useAlertsPreferences } from '../../store/alertsPreferences.store';
import { useAlertsSnoozeStore } from '../../store/alertsSnooze.store';
import { useAlertsStore } from '../../store/alertsStore';
import { useNavigationPreferences } from '../../store/navigationPreferences.store';
import { CreateBusinessModal } from '../Business/CreateBusinessModal';
import { UpgradeModal } from '../ui/UpgradeModal';
import { cn } from '../../utils/cn';
import { FEATURES, FeatureKey } from '../../auth/plan';
import { useAccess } from '../../hooks/useAccess';
import { useDemoPreview } from '../../hooks/useDemoPreview';
import {
  NavigationItemDefinition,
} from '../../navigation/businessNavigation';
import { resolveBusinessNavigationState } from '../../navigation/navigationPersonalization';
import {
  LogOut,
  Store,
  ChevronDown,
  Plus,
  Check,
  Loader2,
  Lock,
  Sparkles,
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { Business } from '../../types';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user, logout, accessibleContexts, login, selectContext, activeContext } = useAuthStore();
  const { businesses, activeBusiness, fetchBusinesses, fetchAuthBootstrap } = useBusinessStore();
  const navigate = useNavigate();
  const prefs = useAlertsPreferences();
  const snooze = useAlertsSnoozeStore();
  const { alerts, fetchAlerts } = useAlertsStore();

  const { isDemoPreview } = useDemoPreview();

  // Use centralized access hook
  const {
    hasPermission,
    hasModule,
    canAccess,
    isLocked,
    canUpgrade
  } = useAccess();

  const [isBusinessDropdownOpen, setIsBusinessDropdownOpen] = useState(false);
  const [isCreateBusinessModalOpen, setIsCreateBusinessModalOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<FeatureKey | undefined>(undefined);
  const [alertsCount, setAlertsCount] = useState(0);
  const [switchingBusinessId, setSwitchingBusinessId] = useState<number | null>(null);

  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);
  const getScopeKey = useNavigationPreferences((state) => state.getScopeKey);
  // Derive plan label for display
  const isOwner = activeBusiness?.user_id === user?.id;
  const planLabel = isDemoPreview
    ? 'Vista previa interactiva'
    : isOwner
    ? (user?.plan === 'business' ? 'Plan Business' : user?.plan === 'pro' ? 'Plan Pro' : 'Plan BÃƒÂ¡sica')
    : (activeBusiness?.role || 'Miembro de Equipo');
  const reportsModuleEnabled = hasModule('reports');
  const scopeKey = getScopeKey(user?.id, activeBusiness?.id);
  const storedNavigationPreferences = useNavigationPreferences((state) => state.preferencesByScope[scopeKey]);
  const { visibleSections } = useMemo(
    () =>
      resolveBusinessNavigationState({
        business: activeBusiness,
        storedPreferences: storedNavigationPreferences,
        hasPermission,
        hasModule,
        canAccessFeature: canAccess,
      }),
    [activeBusiness, canAccess, hasModule, hasPermission, storedNavigationPreferences]
  );

  // Helper to determine effective plan for UI logic
  const isBasicPlan = !['pro', 'business'].includes(activeBusiness?.plan || '');
  const switcherBusinesses = useMemo(() => {
    const merged = new Map<number, Business>();
    const inferredOwnerId = activeBusiness?.user_id ?? user?.id ?? 0;

    businesses.forEach((business) => {
      merged.set(business.id, business);
    });

    accessibleContexts.forEach((context) => {
      const existing = merged.get(context.business_id);
      if (existing) {
        merged.set(context.business_id, {
          ...existing,
          role: existing.role || context.role,
          plan: existing.plan || (context.plan as Business['plan']),
        });
        return;
      }

      merged.set(context.business_id, {
        id: context.business_id,
        user_id: context.context_type === 'owned' ? inferredOwnerId : 0,
        name: context.business_name,
        currency: activeBusiness?.currency || 'COP',
        created_at: activeBusiness?.created_at || '',
        role: context.role,
        plan: context.plan as Business['plan'],
        permissions: [],
        modules: activeBusiness?.modules,
      });
    });

    if (activeBusiness && !merged.has(activeBusiness.id)) {
      merged.set(activeBusiness.id, activeBusiness);
    }

    const orderedIds = [
      ...(accessibleContexts.map((context) => context.business_id)),
      ...businesses.map((business) => business.id),
      ...(activeBusiness ? [activeBusiness.id] : []),
    ];

    return Array.from(new Set(orderedIds))
      .map((businessId) => merged.get(businessId))
      .filter((business): business is Business => Boolean(business));
  }, [accessibleContexts, activeBusiness, businesses, user?.id]);

  useEffect(() => {
    const updateCount = () => {
      const now = new Date();
      const count = alerts.filter(a => {
        const st = snooze.getStatus(a.id);
        if (st?.status === 'resolved') return false;
        if (st?.status === 'snoozed' && st.until && new Date(st.until) > now) return false;
        if (!prefs.preferences.recurring && a.type === 'recurring') return false;
        if (!prefs.preferences.stockLow && a.type === 'inventory') return false;
        if (!prefs.preferences.arDueSoon && a.type === 'receivable' && a.severity === 'warning') return false;
        return true;
      }).length;
      setAlertsCount(count);
    };

    updateCount();
  }, [alerts, snooze, prefs.preferences]);

  useEffect(() => {
    if (activeBusiness) {
      if (!reportsModuleEnabled) {
        setAlertsCount(0);
        return;
      }
      fetchAlerts(activeBusiness);
      const interval = setInterval(() => fetchAlerts(activeBusiness), 60000);
      return () => clearInterval(interval);
    }
  }, [activeBusiness, prefs.preferences, reportsModuleEnabled]);

  useEffect(() => {
    if (!user || businesses.length > 0) return;
    void fetchBusinesses(activeContext?.business_id ?? activeBusiness?.id ?? null);
  }, [activeBusiness?.id, activeContext?.business_id, businesses.length, fetchBusinesses, user]);

  useEffect(() => {
    if (!isBusinessDropdownOpen) return;
    if (switcherBusinesses.length > 0) return;
    void fetchBusinesses(activeContext?.business_id ?? activeBusiness?.id ?? null);
  }, [activeBusiness?.id, activeContext?.business_id, fetchBusinesses, isBusinessDropdownOpen, switcherBusinesses.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsBusinessDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
  };

  const handleSwitchBusiness = async (business: Business) => {
    if (switchingBusinessId || activeBusiness?.id === business.id) {
      setIsBusinessDropdownOpen(false);
      return;
    }

    setSwitchingBusinessId(business.id);

    try {
      const response = await api.post('/auth/select-context', {
        business_id: business.id,
      });

      const { active_context, access_token, refresh_token, user: updatedUser } = response.data;

      if (!active_context) {
        return;
      }

      if (access_token) {
        login(updatedUser || user!, access_token, active_context, accessibleContexts);
        if (refresh_token) {
          localStorage.setItem('refresh_token', refresh_token);
        }
      } else {
        selectContext(active_context);
      }

      await fetchAuthBootstrap(active_context.business_id);
      setIsBusinessDropdownOpen(false);
      setIsOpen(false);
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('Error switching business:', error);
    } finally {
      setSwitchingBusinessId(null);
    }
  };

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const handleItemClick = (e: React.MouseEvent, item: NavigationItemDefinition) => {
    // If it's locked, logic depends on user type
    const locked = item.feature && isLocked(item.feature);

    if (locked) {
      // Only show upgrade modal if user is allowed to upgrade (Personal account)
      if (canUpgrade) {
          e.preventDefault();
          setSelectedFeature(item.feature);
          setShowUpgradeModal(true);
          return;
      }
      // If cannot upgrade (team member), allow navigation to show the ProGate UI
    }
    setIsOpen(false);
  };

  const handleCreateBusinessClick = () => {
    setIsBusinessDropdownOpen(false);

    // Check if user can create more businesses
    // For free plan, limit is 1 business
    const ownedBusinesses = accessibleContexts.length > 0
      ? accessibleContexts.filter((context) => context.context_type === 'owned')
      : businesses.filter((business) => business.user_id === user?.id);
    if (!['pro', 'business'].includes(user?.plan || '') && ownedBusinesses.length >= 1) {
      if (canUpgrade) {
          setSelectedFeature(FEATURES.MULTI_BUSINESS);
          setShowUpgradeModal(true);
      }
      return;
    }

    // Employees cannot create businesses
    if (!canUpgrade) return;

    setIsCreateBusinessModalOpen(true);
  };

  const renderBadge = (item: NavigationItemDefinition, locked: boolean) => {
    const badge =
      item.path === '/alerts' && alertsCount > 0
        ? { label: String(alertsCount), tone: 'red' as const }
        : item.feature && isBasicPlan
          ? { label: 'PRO', tone: 'default' as const }
          : null;

    if (!badge) return null;

    return (
      <span className={cn(
        'ml-auto',
        locked
          ? 'app-sidebar-badge-pro opacity-80'
          : badge.tone === 'red'
            ? 'app-sidebar-badge-alert'
            : 'app-sidebar-badge-pro'
      )}>
        {badge.label}
      </span>
    );
  };

  const renderNavigationItem = (item: NavigationItemDefinition) => {
    const locked = Boolean(item.feature && isLocked(item.feature));
    const Icon = item.icon;

    return (
      <NavLink
        key={`nav-${item.path}`}
        to={(locked && canUpgrade) ? '#' : item.path}
        className={({ isActive }) =>
          cn(
            'app-sidebar-nav-item relative group flex items-center rounded-xl px-2.5 py-2.5 text-sm font-medium transition-all lg:px-3',
            isActive && !locked
              ? 'app-sidebar-nav-item-active'
              : '',
            locked && 'opacity-75 hover:opacity-100'
          )
        }
        onClick={(e) => handleItemClick(e, item)}
      >
        <Icon
          className={cn(
            'app-sidebar-nav-icon mr-3 h-5 w-5 transition-colors'
          )}
        />

        <span className="flex-1">{item.label}</span>

        {renderBadge(item, locked)}

        {locked && (
          <Lock className="ml-2 h-3.5 w-3.5 text-[color:var(--app-sidebar-text-muted)]" />
        )}
      </NavLink>
    );
  };

  return (
    <>
      <CreateBusinessModal
        isOpen={isCreateBusinessModalOpen}
        onClose={() => setIsCreateBusinessModalOpen(false)}
        onSuccess={() => {
            fetchBusinesses();
        }}
      />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={selectedFeature}
      />

      {/* Mobile Overlay */}
      <div
        className={cn(
          'fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <div
        className={cn(
          'app-sidebar fixed top-0 left-0 bottom-0 z-50 flex w-[86vw] max-w-xs flex-col border-r app-divider transition-colors duration-300 transition-transform lg:w-64 lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="app-sidebar-header-shell shrink-0">
          <div className="app-sidebar-brand" aria-label="Marca EnCaja">
            <img src={logo} alt="EnCaja" className="app-sidebar-brand-logo" />
          </div>

          <div className="app-divider relative z-50 border-b px-3 pb-4 lg:px-4 lg:pb-5" ref={dropdownRef}>
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isBusinessDropdownOpen}
              className="app-sidebar-switcher relative flex min-w-0 w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-sidebar-surface-strong)] active:scale-[0.99]"
              onClick={() => setIsBusinessDropdownOpen(!isBusinessDropdownOpen)}
            >
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-[color:var(--app-sidebar-border)] bg-[color:var(--app-sidebar-surface-strong)]">
                <Store className="w-5 h-5 text-green-600 dark:text-green-500" />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="truncate text-sm font-bold text-[color:var(--app-sidebar-text)]">
                  {activeBusiness?.name || 'Seleccionar'}
                </p>
                <p className="truncate text-xs text-[color:var(--app-sidebar-text-muted)]">
                  {planLabel}
                </p>
              </div>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-[color:var(--app-sidebar-text-muted)] transition-transform duration-200", isBusinessDropdownOpen && "rotate-180")} />
            </button>

            {/* Dropdown Menu (Absolute) */}
            {isBusinessDropdownOpen && (
              <div className="app-surface absolute top-full left-0 right-0 z-50 mx-3 mt-2 max-w-full overflow-hidden rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-200 lg:mx-4">
                <div className="max-h-60 overflow-y-auto py-1 custom-scrollbar">
                  {switcherBusinesses.map((business) => (
                    <button
                      key={business.id}
                      disabled={switchingBusinessId !== null}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-[color:var(--app-surface-soft)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-70",
                        activeBusiness?.id === business.id && "bg-[color:var(--app-surface-soft)]"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleSwitchBusiness(business);
                      }}
                    >
                      <div className="app-muted-panel flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border">
                        <Store className="h-4 w-4 text-[color:var(--app-sidebar-icon)]" />
                      </div>
                      <span className="app-text-secondary flex-1 truncate text-sm font-medium">
                        {business.name}
                      </span>
                      {switchingBusinessId === business.id ? (
                        <Loader2 className="w-4 h-4 text-blue-500 flex-shrink-0 animate-spin" />
                      ) : activeBusiness?.id === business.id && (
                        <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {canUpgrade && !isDemoPreview && (
                <div className="app-divider border-t p-1">
                  <button
                    className="w-full flex items-center gap-3 px-3 py-2 text-left text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-inset active:scale-[0.99]"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCreateBusinessClick();
                    }}
                  >
                    <Plus className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Crear nuevo negocio</span>
                  </button>
                </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 lg:px-3 space-y-4 lg:space-y-6 custom-scrollbar">
          {visibleSections.map((section) => (
            <div key={section.id} className="space-y-1">
              <div
                className={cn(
                  'px-2.5 lg:px-3 flex items-center justify-between group py-1',
                  section.collapsible ? 'cursor-pointer' : 'cursor-default'
                )}
                onClick={() => section.collapsible && toggleSection(section.title)}
              >
                <h3 className="app-sidebar-section-label text-xs font-semibold uppercase tracking-[0.22em]">
                  {section.title}
                </h3>
                {section.collapsible && (
                  <ChevronDown
                    className={cn(
                      'h-3 w-3 text-[color:var(--app-sidebar-text-muted)] transition-transform duration-200 opacity-100',
                      collapsedSections[section.title] && '-rotate-90'
                    )}
                  />
                )}
              </div>

              <div
                className={cn(
                  'space-y-1 transition-all duration-200',
                  collapsedSections[section.title] ? 'hidden' : 'block'
                )}
              >
                {section.items.map((item) => renderNavigationItem(item))}
              </div>
            </div>
          ))}

    </nav>

    {/* Footer */}
      <div className="app-sidebar app-divider z-50 shrink-0 space-y-2 border-t p-4">
            {(isDemoPreview || (!['pro', 'business'].includes(user?.plan || '') && canUpgrade)) && (
              <button
                type="button"
                data-preview-allow="true"
                onClick={() => navigate(isDemoPreview ? '/account-access' : '/pro')}
                className="app-sidebar-upgrade-card mb-3 flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-3 text-left transition-colors hover:brightness-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-[color:var(--app-sidebar-upgrade-border)] bg-[color:var(--app-sidebar-surface-strong)] p-2 text-[color:var(--app-sidebar-upgrade-text)]">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{isDemoPreview ? 'Activar plan' : 'Actualizar plan'}</div>
                    <div className="app-sidebar-upgrade-muted text-xs">
                      {isDemoPreview
                        ? 'Sal del modo vista previa y empieza con tus datos reales.'
                        : 'Desbloquea reportes, alertas y multi-negocio.'}
                    </div>
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 shrink-0 -rotate-90 text-[color:var(--app-sidebar-upgrade-text)]" />
              </button>
            )}

            <button
            type="button"
            onClick={handleLogout}
            className="app-text-secondary flex w-full items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );
};

