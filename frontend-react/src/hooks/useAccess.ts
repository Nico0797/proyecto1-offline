import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { useAccountAccessStore } from '../store/accountAccessStore';
import { canAccess as checkPlanAccess, canAccessModule, FeatureKey } from '../auth/plan';
import { BusinessModuleKey, isBusinessModuleEnabled } from '../types';

const buildAccessSnapshot = (
  user: ReturnType<typeof useAuthStore.getState>['user'],
  activeBusiness: ReturnType<typeof useBusinessStore.getState>['activeBusiness'],
  isDemoPreview: boolean
) => {
  const accountType = user?.account_type || (activeBusiness?.user_id === user?.id ? 'personal' : 'team_member');
  const isPersonal = accountType === 'personal';
  const isTeamMember = !isPersonal;
  const isOwner = activeBusiness?.user_id === user?.id;
  const subscriptionPlan = isDemoPreview
    ? 'business'
    : isPersonal
    ? (user?.plan || 'basic')
    : (activeBusiness?.plan || 'basic');
  const workspaceRole = activeBusiness?.role || null;
  const permissions = Array.from(new Set([
    ...(activeBusiness?.permissions || []),
    ...(activeBusiness?.permissions_canonical || []),
  ]));
  const modules = activeBusiness?.modules || [];
  const isAdmin = user?.is_admin || user?.permissions?.admin || false;

  const canAccessFeature = (feature: FeatureKey): boolean => {
    if (!user) return false;
    return checkPlanAccess(feature, user, subscriptionPlan);
  };

  const hasPermission = (permission?: string): boolean => {
    if (!permission) return true;
    if (isOwner) return true;
    if (isAdmin) return true;
    if (permissions.includes('*')) return true;
    if (permissions.includes('admin.*')) return true;
    if (permissions.includes(permission)) return true;

    const [scope] = permission.split('.');
    if (permissions.includes(`${scope}.*`)) return true;

    return false;
  };

  const canShow = (_feature: FeatureKey | undefined, permission: string | undefined): boolean => {
    if (!hasPermission(permission)) return false;
    return true;
  };

  const hasModule = (moduleKey?: BusinessModuleKey): boolean => {
    if (!moduleKey) return true;
    return isBusinessModuleEnabled(modules, moduleKey) && canAccessModule(subscriptionPlan, moduleKey);
  };

  const isModuleDisabled = (moduleKey?: BusinessModuleKey): boolean => {
    return !hasModule(moduleKey);
  };

  const isLocked = (feature?: FeatureKey): boolean => {
    if (!feature) return false;
    return !canAccessFeature(feature);
  };

  const canUpgrade = isPersonal;

  return {
    user,
    activeBusiness,
    accountType,
    subscriptionPlan,
    workspaceRole,
    permissions,
    modules,
    isDemoPreview,
    isPersonal,
    isTeamMember,
    isOwner,
    isAdmin,
    canAccess: canAccessFeature,
    hasPermission,
    hasModule,
    isModuleDisabled,
    canShow,
    isLocked,
    canUpgrade,
  };
};

export const getAccessSnapshot = () => {
  const { user } = useAuthStore.getState();
  const { activeBusiness } = useBusinessStore.getState();
  const isDemoPreview = Boolean(useAccountAccessStore.getState().access?.demo_preview_active);
  return buildAccessSnapshot(user, activeBusiness, isDemoPreview);
};

export const useAccess = () => {
  const { user } = useAuthStore();
  const { activeBusiness } = useBusinessStore();
  const isDemoPreview = useAccountAccessStore((state) => Boolean(state.access?.demo_preview_active));
  return buildAccessSnapshot(user, activeBusiness, isDemoPreview);
};
