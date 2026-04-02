import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FeatureKey } from '../auth/plan';
import { BusinessCommercialSectionKey, getBusinessBaseState, isBusinessCommercialSectionEnabled } from '../config/businessPersonalization';
import { isBackendCapabilitySupported, type BackendCapability } from '../config/backendCapabilities';
import { useAccess } from '../hooks/useAccess';
import { resolveBusinessNavigationState } from '../navigation/navigationPersonalization';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { useNavigationPreferences } from '../store/navigationPreferences.store';
import { useTourStore } from './tourStore';
import type { BusinessModuleKey } from '../types';

export type TutorialSettingsSectionId =
  | 'profile'
  | 'business'
  | 'personalization'
  | 'audit'
  | 'team'
  | 'roles'
  | 'notifications'
  | 'templates'
  | 'membership'
  | 'sync';

export type TutorialRuntimeContext = {
  plan: string | null | undefined;
  role: string | null;
  businessId: number | null;
  businessType: string | null;
  userId: number | null;
  isOwner: boolean;
  isAdmin: boolean;
  isFirstVisit: boolean;
  isRepeatVisit: boolean;
  modules: Set<BusinessModuleKey>;
  visibleRoutes: Set<string>;
  visibleSettingsSections: Set<TutorialSettingsSectionId>;
  dashboardVisibleTabs: Set<'hoy' | 'balance' | 'analiticas' | 'recordatorios'>;
  supportedCapabilities: Set<BackendCapability>;
  hasModule: (moduleKey?: BusinessModuleKey) => boolean;
  hasPermission: (permission?: string) => boolean;
  canAccessFeature: (feature?: FeatureKey) => boolean;
  hasRoute: (route?: string) => boolean;
  hasSettingsSection: (section?: TutorialSettingsSectionId) => boolean;
  hasCapability: (capability?: BackendCapability) => boolean;
  hasCommercialSection: (section?: BusinessCommercialSectionKey) => boolean;
};

const KNOWN_BACKEND_CAPABILITIES: BackendCapability[] = [
  'raw_inventory',
  'raw_purchases',
  'suppliers',
  'recipes',
  'supplier_payables',
  'profitability',
  'invoices',
  'treasury',
  'recurring_expenses',
];

const normalizeRouteKey = (route?: string) => {
  if (!route) return '';
  return String(route).trim();
};

export const useTutorialRuntimeContext = (): TutorialRuntimeContext => {
  const { user } = useAuthStore();
  const { activeBusiness } = useBusinessStore();
  const location = useLocation();
  const { hasPermission, hasModule, canAccess, isOwner, isAdmin, subscriptionPlan } = useAccess();
  const perTour = useTourStore((state) => state.perTour);
  const getScopeKey = useNavigationPreferences((state) => state.getScopeKey);
  const storedNavigationPreferences = useNavigationPreferences((state) => {
    const scopeKey = getScopeKey(user?.id, activeBusiness?.id);
    return state.preferencesByScope[scopeKey];
  });

  return useMemo(() => {
    const navigation = resolveBusinessNavigationState({
      business: activeBusiness,
      storedPreferences: storedNavigationPreferences,
      hasPermission,
      hasModule,
      canAccessFeature: (feature) => (!feature ? true : canAccess(feature)),
    });

    const visibleRoutes = new Set<string>([
      '/dashboard',
      '/settings',
      '/help',
      ...navigation.visibleItems.map((item) => item.path),
    ]);

    const canManageBusinessExperience = !!activeBusiness && (isOwner || hasPermission('business.update'));
    const canViewAudit = !!activeBusiness && (isOwner || hasPermission('business.update') || hasPermission('team.manage'));

    const visibleSettingsSections = new Set<TutorialSettingsSectionId>([
      'profile',
      'business',
      'team',
      'notifications',
      'templates',
      'sync',
    ]);
    if (canManageBusinessExperience) visibleSettingsSections.add('personalization');
    if (canViewAudit) visibleSettingsSections.add('audit');
    if (isOwner) {
      visibleSettingsSections.add('roles');
      visibleSettingsSections.add('membership');
    }

    const supportedCapabilities = new Set<BackendCapability>(
      KNOWN_BACKEND_CAPABILITIES.filter((capability) => isBackendCapabilitySupported(capability))
    );

    const hasReportsModule = hasModule('reports');
    const canOpenReportsPanel = hasReportsModule && hasPermission('summary.dashboard');
    const dashboardVisibleTabs = new Set<'hoy' | 'balance' | 'analiticas' | 'recordatorios'>(['hoy']);

    if (hasReportsModule && hasPermission('summary.financial') && supportedCapabilities.has('treasury')) {
      dashboardVisibleTabs.add('balance');
    }
    if (hasReportsModule && canOpenReportsPanel) {
      dashboardVisibleTabs.add('analiticas');
    }
    if (hasPermission('reminders.manage')) {
      dashboardVisibleTabs.add('recordatorios');
    }

    const moduleSet = new Set<BusinessModuleKey>(
      (activeBusiness?.modules || [])
        .filter((module) => module.enabled)
        .map((module) => module.module_key)
    );

    const businessType = activeBusiness ? getBusinessBaseState(activeBusiness).effectiveBusinessType : null;
    const storedTutorials = Object.keys(perTour || {});
    const isFirstVisit = storedTutorials.length === 0;

    const hasRoute = (route?: string) => {
      const normalized = normalizeRouteKey(route);
      if (!normalized) return true;
      if (normalized === '/settings') return visibleRoutes.has('/settings');
      if (normalized.startsWith('/settings?')) return visibleRoutes.has('/settings');
      return visibleRoutes.has(normalized);
    };

    return {
      plan: subscriptionPlan,
      role: activeBusiness?.role || null,
      businessId: activeBusiness?.id || null,
      businessType,
      userId: user?.id || null,
      isOwner,
      isAdmin,
      isFirstVisit,
      isRepeatVisit: !isFirstVisit,
      modules: moduleSet,
      visibleRoutes,
      visibleSettingsSections,
      dashboardVisibleTabs,
      supportedCapabilities,
      hasModule,
      hasPermission,
      canAccessFeature: (feature) => (!feature ? true : canAccess(feature)),
      hasRoute,
      hasSettingsSection: (section) => (!section ? true : visibleSettingsSections.has(section)),
      hasCapability: (capability) => (!capability ? true : supportedCapabilities.has(capability)),
      hasCommercialSection: (section) => (!section ? true : isBusinessCommercialSectionEnabled(activeBusiness, section)),
    };
  }, [
    activeBusiness,
    canAccess,
    getScopeKey,
    hasModule,
    hasPermission,
    isAdmin,
    isOwner,
    location.pathname,
    location.search,
    perTour,
    storedNavigationPreferences,
    subscriptionPlan,
    user?.id,
  ]);
};
