import { Business, BusinessModuleKey, BusinessType } from '../types';
import { getBusinessNavigationDefaults, getBusinessTypePreset, isBusinessCommercialSectionEnabled, resolveBusinessType } from '../config/businessPersonalization';
import { buildDefaultNavigationPreferences, NavigationPreferences } from '../store/navigationPreferences.store';
import { toNavigationPreferences } from '../config/businessPresetApplication';
import { isBackendPathSupported } from '../config/backendCapabilities';
import { resolveSimpleBusinessTypeFromBusiness } from '../config/businessOnboardingPresets';
import { normalizeNavigationPaths } from './navigationPathAliases';
import {
  BUSINESS_NAVIGATION_ITEMS,
  BUSINESS_NAVIGATION_SECTIONS,
  NavigationItemDefinition,
  NavigationSectionDefinition,
} from './businessNavigation';

interface ResolveNavigationStateInput {
  business?: Business | null;
  storedPreferences?: NavigationPreferences | null;
  hasPermission: (permission?: string) => boolean;
  hasModule: (moduleKey?: BusinessModuleKey) => boolean;
  canAccessFeature?: (feature: NonNullable<NavigationItemDefinition['feature']>) => boolean;
}

interface ResolveCustomizableNavigationItemsInput {
  business?: Business | null;
  hasPermission: (permission?: string) => boolean;
  hasModule: (moduleKey?: BusinessModuleKey) => boolean;
  canAccessFeature?: (feature: NonNullable<NavigationItemDefinition['feature']>) => boolean;
  businessTypeOverride?: BusinessType;
  includeHelp?: boolean;
  includeSettings?: boolean;
}

interface ResolvedNavigationState {
  appliedBusinessType: ReturnType<typeof resolveBusinessType>;
  defaultPreferences: NavigationPreferences;
  preferences: NavigationPreferences;
  availableItems: NavigationItemDefinition[];
  visibleItems: NavigationItemDefinition[];
  visibleSections: NavigationSectionDefinition[];
  favoriteItems: NavigationItemDefinition[];
  prioritizedItems: NavigationItemDefinition[];
  mobileItems: NavigationItemDefinition[];
}

export type DashboardPanelId = 'hoy' | 'balance' | 'analiticas' | 'recordatorios';

interface ResolvedDashboardHomeState {
  availableTabs: Set<DashboardPanelId>;
  priorityPanels: Array<{
    id: Exclude<DashboardPanelId, 'hoy' | 'recordatorios'>;
    path: '/treasury' | '/reports';
  }>;
  canViewBalance: boolean;
  canViewAnalytics: boolean;
  initialTab: DashboardPanelId;
}

const sortByMobilePriority = (items: NavigationItemDefinition[]) => {
  return [...items].sort((a, b) => (a.mobilePriority ?? 999) - (b.mobilePriority ?? 999));
};

const normalizeStoredNavigationPreferences = (storedPreferences?: NavigationPreferences | null): NavigationPreferences | null => {
  if (!storedPreferences) return null;

  return {
    hiddenPaths: normalizeNavigationPaths(storedPreferences.hiddenPaths),
    favoritePaths: normalizeNavigationPaths(storedPreferences.favoritePaths),
  };
};

export const resolveBusinessNavigationState = ({
  business,
  storedPreferences,
  hasPermission,
  hasModule,
  canAccessFeature,
}: ResolveNavigationStateInput): ResolvedNavigationState => {
  const appliedBusinessType = resolveBusinessType(business);
  const businessTypePreset = getBusinessTypePreset(appliedBusinessType);
  const persistedNavigationDefaults = getBusinessNavigationDefaults(business);
  const defaultPreferences = persistedNavigationDefaults
    ? toNavigationPreferences(persistedNavigationDefaults)
    : buildDefaultNavigationPreferences(businessTypePreset?.recommendedMenuPaths || []);
  const normalizedStoredPreferences = normalizeStoredNavigationPreferences(storedPreferences);
  const preferences = persistedNavigationDefaults
    ? toNavigationPreferences(persistedNavigationDefaults)
    : (normalizedStoredPreferences || defaultPreferences);

  const availableItems = resolveCustomizableNavigationItems({
    business,
    hasPermission,
    hasModule,
    canAccessFeature,
    includeHelp: true,
    includeSettings: true,
  });

  const visibleItems = availableItems.filter((item) => {
    if (preferences.hiddenPaths.includes(item.path) && item.allowHide !== false) return false;
    return true;
  });

  const favoriteItems = preferences.favoritePaths
    .map((path) => visibleItems.find((item) => item.path === path))
    .filter((item): item is NavigationItemDefinition => !!item);

  const prioritizedItems = [
    ...favoriteItems,
    ...visibleItems.filter((item) => !favoriteItems.some((favoriteItem) => favoriteItem.path === item.path)),
  ];

  const visibleSections: NavigationSectionDefinition[] = BUSINESS_NAVIGATION_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => prioritizedItems.some((visibleItem) => visibleItem.path === item.path)),
    }))
    .filter((section) => section.items.length > 0);

  const visibleMobileItems = sortByMobilePriority(
    visibleItems.filter((item) => item.path !== '/help' && item.path !== '/settings')
  );

  const favoriteMobileItems = preferences.favoritePaths
    .map((path) => visibleMobileItems.find((item) => item.path === path))
    .filter((item): item is NavigationItemDefinition => !!item);

  const mobileItems = [
    ...favoriteMobileItems,
    ...visibleMobileItems.filter((item) => !favoriteMobileItems.some((favoriteItem) => favoriteItem.path === item.path)),
  ].slice(0, 4);

  return {
    appliedBusinessType,
    defaultPreferences,
    preferences,
    availableItems,
    visibleItems,
    visibleSections,
    favoriteItems,
    prioritizedItems,
    mobileItems,
  };
};

export const resolveCustomizableNavigationItems = ({
  business,
  hasPermission,
  hasModule,
  canAccessFeature,
  businessTypeOverride,
  includeHelp = false,
  includeSettings = false,
}: ResolveCustomizableNavigationItemsInput): NavigationItemDefinition[] => {
  const currentBusinessType = businessTypeOverride ?? resolveSimpleBusinessTypeFromBusiness(business);

  return BUSINESS_NAVIGATION_ITEMS.filter((item) => {
    if (!includeHelp && item.path === '/help') return false;
    if (!includeSettings && item.path === '/settings') return false;
    if (!hasPermission(item.permission)) return false;
    if (!hasModule(item.moduleKey)) return false;
    if (item.feature && canAccessFeature && !canAccessFeature(item.feature)) return false;
    if (item.commercialSectionKey && !isBusinessCommercialSectionEnabled(business, item.commercialSectionKey)) return false;
    if (!isBackendPathSupported(item.path)) return false;
    if (item.businessTypeVisibility && !item.businessTypeVisibility.includes(currentBusinessType)) return false;
    return true;
  });
};

const DASHBOARD_PANEL_PATHS: Array<{
  id: Exclude<DashboardPanelId, 'hoy' | 'recordatorios'>;
  path: '/treasury' | '/reports';
}> = [
  { id: 'balance', path: '/treasury' },
  { id: 'analiticas', path: '/reports' },
];

export const resolveDashboardHomeState = ({
  navigationState,
  initialDashboardTab,
  canManageReminders,
  additionalAvailablePanels,
}: {
  navigationState: Pick<ResolvedNavigationState, 'availableItems' | 'visibleItems' | 'prioritizedItems'>;
  initialDashboardTab?: DashboardPanelId | null;
  canManageReminders: boolean;
  additionalAvailablePanels?: Array<Exclude<DashboardPanelId, 'hoy' | 'recordatorios'>>;
}): ResolvedDashboardHomeState => {
  const availablePathSet = new Set(navigationState.availableItems.map((item) => item.path));
  const priorityPanels = navigationState.prioritizedItems
    .filter((item) => DASHBOARD_PANEL_PATHS.some((panel) => panel.path === item.path))
    .map((item) => DASHBOARD_PANEL_PATHS.find((panel) => panel.path === item.path) || null)
    .filter((panel): panel is NonNullable<typeof panel> => !!panel)
    .filter((panel, index, panels) => panels.findIndex((candidate) => candidate.id === panel.id) === index);

  const missingPanels = DASHBOARD_PANEL_PATHS.filter(
    (panel) => availablePathSet.has(panel.path) && !priorityPanels.some((candidate) => candidate.id === panel.id)
  );

  const extraPanels = DASHBOARD_PANEL_PATHS.filter(
    (panel) => (additionalAvailablePanels || []).includes(panel.id) && !priorityPanels.some((candidate) => candidate.id === panel.id)
  );

  const orderedPanels = DASHBOARD_PANEL_PATHS.filter((panel) =>
    [...priorityPanels, ...missingPanels, ...extraPanels].some((candidate) => candidate.id === panel.id)
  );
  const availableTabs = new Set<DashboardPanelId>(['hoy']);

  if (orderedPanels.some((panel) => panel.id === 'balance')) {
    availableTabs.add('balance');
  }
  if (orderedPanels.some((panel) => panel.id === 'analiticas')) {
    availableTabs.add('analiticas');
  }
  if (canManageReminders) {
    availableTabs.add('recordatorios');
  }

  const preferredTab = (initialDashboardTab || 'hoy') as DashboardPanelId;

  return {
    availableTabs,
    priorityPanels: orderedPanels,
    canViewBalance: orderedPanels.some((panel) => panel.id === 'balance'),
    canViewAnalytics: orderedPanels.some((panel) => panel.id === 'analiticas'),
    initialTab: availableTabs.has(preferredTab) ? preferredTab : 'hoy',
  };
};
