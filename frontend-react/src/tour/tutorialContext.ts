import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { FeatureKey } from '../auth/plan';
import {
  BusinessCommercialSectionKey,
  getBusinessBaseState,
  getBusinessInitialSetup,
  isBusinessCommercialSectionEnabled,
  type BusinessInitialSetupSettings,
  type BusinessTypeKey,
} from '../config/businessPersonalization';
import {
  getBusinessOperationalProfile,
  type BusinessFulfillmentMode,
  type BusinessOperationalProfile,
} from '../config/businessOperationalProfile';
import { isBackendCapabilitySupported, type BackendCapability } from '../config/backendCapabilities';
import { useAccess } from '../hooks/useAccess';
import { resolveBusinessNavigationState } from '../navigation/navigationPersonalization';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { useNavigationPreferences } from '../store/navigationPreferences.store';
import type { ActiveContext, BusinessModuleKey } from '../types';
import type { TutorialStatus } from './tourStore';
import { useTourStore } from './tourStore';

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
  businessType: BusinessTypeKey | null;
  userId: number | null;
  activeContext: ActiveContext | null;
  activeContextBusinessId: number | null;
  activeContextRole: string | null;
  isOwner: boolean;
  isAdmin: boolean;
  isFirstVisit: boolean;
  isRepeatVisit: boolean;
  initialSetup: BusinessInitialSetupSettings;
  operationalProfile: BusinessOperationalProfile;
  fulfillmentMode: BusinessFulfillmentMode | null;
  modules: Set<BusinessModuleKey>;
  visibleRoutes: Set<string>;
  visibleSettingsSections: Set<TutorialSettingsSectionId>;
  dashboardVisibleTabs: Set<'hoy' | 'balance' | 'analiticas' | 'recordatorios'>;
  supportedCapabilities: Set<BackendCapability>;
  recommendedTutorials: Set<string>;
  hasModule: (moduleKey?: BusinessModuleKey) => boolean;
  hasPermission: (permission?: string) => boolean;
  canAccessFeature: (feature?: FeatureKey) => boolean;
  isPlanAtLeast: (plan?: 'basic' | 'pro' | 'business') => boolean;
  hasRoute: (route?: string) => boolean;
  hasSettingsSection: (section?: TutorialSettingsSectionId) => boolean;
  hasCapability: (capability?: BackendCapability) => boolean;
  hasCommercialSection: (section?: BusinessCommercialSectionKey) => boolean;
  isRecommendedTutorial: (tutorialId?: string) => boolean;
  getTutorialStatus: (tutorialId?: string) => TutorialStatus | null;
  hasCompletedTutorial: (tutorialId?: string) => boolean;
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
  const { user, activeContext } = useAuthStore();
  const { activeBusiness } = useBusinessStore();
  const location = useLocation();
  const {
    hasPermission,
    hasModule,
    canAccess,
    isOwner,
    isAdmin,
    subscriptionPlan,
    workspaceRole,
    canManageBusinessExperience,
    canViewAudit,
    canManageRoles,
  } = useAccess();
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
    if (canManageRoles) {
      visibleSettingsSections.add('roles');
    }
    if (isOwner) {
      visibleSettingsSections.add('membership');
    }

    const supportedCapabilities = new Set<BackendCapability>(
      KNOWN_BACKEND_CAPABILITIES.filter((capability) => isBackendCapabilitySupported(capability))
    );

    const hasReportsModule = hasModule('reports');
    const canOpenReportsPanel = hasReportsModule && hasPermission('reports.view');
    const dashboardVisibleTabs = new Set<'hoy' | 'balance' | 'analiticas' | 'recordatorios'>(['hoy']);

    if (hasReportsModule && hasPermission('analytics.view') && supportedCapabilities.has('treasury')) {
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
    const initialSetup = getBusinessInitialSetup(activeBusiness);
    const operationalProfile = getBusinessOperationalProfile(activeBusiness);
    const recommendedTutorials = new Set(initialSetup.recommended_tutorials || []);
    const storedTutorials = Object.keys(perTour || {});
    const isFirstVisit = storedTutorials.length === 0;
    const activeContextBusinessId = activeContext?.business_id || activeBusiness?.id || null;
    const activeContextRole = activeContext?.role || workspaceRole || activeBusiness?.role || null;

    const hasRoute = (route?: string) => {
      const normalized = normalizeRouteKey(route);
      if (!normalized) return true;
      if (normalized === '/settings') return visibleRoutes.has('/settings');
      if (normalized.startsWith('/settings?')) return visibleRoutes.has('/settings');
      return visibleRoutes.has(normalized);
    };

    const getTutorialStatus = (tutorialId?: string) => {
      if (!tutorialId) return null;
      return perTour?.[tutorialId]?.status || null;
    };

    return {
      plan: subscriptionPlan,
      role: activeBusiness?.role || workspaceRole || null,
      businessId: activeBusiness?.id || null,
      businessType,
      userId: user?.id || null,
      activeContext: activeContext || null,
      activeContextBusinessId,
      activeContextRole,
      isOwner,
      isAdmin,
      isFirstVisit,
      isRepeatVisit: !isFirstVisit,
      initialSetup,
      operationalProfile,
      fulfillmentMode: operationalProfile.fulfillment_mode || null,
      modules: moduleSet,
      visibleRoutes,
      visibleSettingsSections,
      dashboardVisibleTabs,
      supportedCapabilities,
      recommendedTutorials,
      hasModule,
      hasPermission,
      canAccessFeature: (feature) => (!feature ? true : canAccess(feature)),
      isPlanAtLeast: (plan) =>
        (!plan ? true : subscriptionPlan === plan ||
          (plan === 'basic' && ['basic', 'pro', 'business'].includes(String(subscriptionPlan))) ||
          (plan === 'pro' && ['pro', 'business'].includes(String(subscriptionPlan))) ||
          (plan === 'business' && subscriptionPlan === 'business')),
      hasRoute,
      hasSettingsSection: (section) => (!section ? true : visibleSettingsSections.has(section)),
      hasCapability: (capability) => (!capability ? true : supportedCapabilities.has(capability)),
      hasCommercialSection: (section) => (!section ? true : isBusinessCommercialSectionEnabled(activeBusiness, section)),
      isRecommendedTutorial: (tutorialId) => (!tutorialId ? false : recommendedTutorials.has(tutorialId)),
      getTutorialStatus,
      hasCompletedTutorial: (tutorialId) => getTutorialStatus(tutorialId) === 'completed',
    };
  }, [
    activeContext,
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
