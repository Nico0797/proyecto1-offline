import { Business, BusinessModuleKey } from '../types';
import { getBusinessNavigationDefaults, getBusinessTypePreset, isBusinessCommercialSectionEnabled, resolveBusinessType } from '../config/businessPersonalization';
import { buildDefaultNavigationPreferences, NavigationPreferences } from '../store/navigationPreferences.store';
import { toNavigationPreferences } from '../config/businessPresetApplication';
import { isBackendPathSupported } from '../config/backendCapabilities';
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

interface ResolvedNavigationState {
  appliedBusinessType: ReturnType<typeof resolveBusinessType>;
  defaultPreferences: NavigationPreferences;
  preferences: NavigationPreferences;
  visibleItems: NavigationItemDefinition[];
  visibleSections: NavigationSectionDefinition[];
  favoriteItems: NavigationItemDefinition[];
  prioritizedItems: NavigationItemDefinition[];
  mobileItems: NavigationItemDefinition[];
}

const sortByMobilePriority = (items: NavigationItemDefinition[]) => {
  return [...items].sort((a, b) => (a.mobilePriority ?? 999) - (b.mobilePriority ?? 999));
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
  const preferences = storedPreferences || defaultPreferences;

  const visibleItems = BUSINESS_NAVIGATION_ITEMS.filter((item) => {
    if (!hasPermission(item.permission)) return false;
    if (!hasModule(item.moduleKey)) return false;
    if (item.feature && canAccessFeature && !canAccessFeature(item.feature)) return false;
    if (item.commercialSectionKey && !isBusinessCommercialSectionEnabled(business, item.commercialSectionKey)) return false;
    if (!isBackendPathSupported(item.path)) return false;
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
    visibleItems,
    visibleSections,
    favoriteItems,
    prioritizedItems,
    mobileItems,
  };
};
