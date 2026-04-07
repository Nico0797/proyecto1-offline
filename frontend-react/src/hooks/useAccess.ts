import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { useAccountAccessStore } from '../store/accountAccessStore';
import { canAccess as checkPlanAccess, canAccessModule, FeatureKey } from '../auth/plan';
import { hasPermissionMatch } from '../auth/permissions';
import { BusinessModuleKey, isBusinessModuleEnabled } from '../types';

const buildAccessSnapshot = (
  user: ReturnType<typeof useAuthStore.getState>['user'],
  activeBusiness: ReturnType<typeof useBusinessStore.getState>['activeBusiness'],
  access: ReturnType<typeof useAccountAccessStore.getState>['access']
) => {
  const accountType = user?.account_type || (activeBusiness?.user_id === user?.id ? 'personal' : 'team_member');
  const isPersonal = accountType === 'personal';
  const isTeamMember = !isPersonal;
  const isOwner = activeBusiness?.user_id === user?.id;
  const isDemoPreview = Boolean(access?.demo_preview_active);
  const resolvedPlan = isPersonal
    ? (access?.plan || access?.plan_code || user?.membership_plan || user?.plan || activeBusiness?.plan || 'basic')
    : (activeBusiness?.plan || 'basic');
  const subscriptionPlan = isDemoPreview
    ? 'business'
    : resolvedPlan;
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
    return hasPermissionMatch(permissions, permission);
  };

  const hasAnyPermission = (requestedPermissions: Array<string | undefined | null>): boolean => {
    return requestedPermissions
      .filter((permission): permission is string => permission != null && permission !== '')
      .some((permission) => hasPermission(permission));
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
  const canManageBusinessExperience = !!activeBusiness && (isOwner || hasAnyPermission(['settings.edit', 'business.update']));
  const canViewAudit = !!activeBusiness && (isOwner || hasAnyPermission(['settings.edit', 'business.update', 'team.manage_team', 'team.manage']));
  const canViewTeamWorkspace = !!activeBusiness;
  const canManageTeam = !!activeBusiness && (isOwner || hasAnyPermission(['team.manage_team', 'team.manage', 'team.invite', 'team.edit_roles', 'team.remove']));
  const canManageRoles = !!activeBusiness && (isOwner || hasAnyPermission(['team.edit_roles', 'team.manage_team', 'team.manage']));

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
    hasAnyPermission,
    hasModule,
    isModuleDisabled,
    canShow,
    isLocked,
    canUpgrade,
    canManageBusinessExperience,
    canViewAudit,
    canViewTeamWorkspace,
    canManageTeam,
    canManageRoles,
  };
};

export const getAccessSnapshot = () => {
  const { user } = useAuthStore.getState();
  const { activeBusiness } = useBusinessStore.getState();
  const { access } = useAccountAccessStore.getState();
  return buildAccessSnapshot(user, activeBusiness, access);
};

export const useAccess = () => {
  const { user } = useAuthStore();
  const { activeBusiness } = useBusinessStore();
  const access = useAccountAccessStore((state) => state.access);
  return buildAccessSnapshot(user, activeBusiness, access);
};
