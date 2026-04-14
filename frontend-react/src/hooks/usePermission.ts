import { useBusinessStore } from '../store/businessStore';
import { useAuthStore } from '../store/authStore';
import { hasPermissionMatch } from '../auth/permissions';
import { isOfflineProductMode } from '../runtime/runtimeMode';

export const usePermission = (permission: string) => {
  const { activeBusiness } = useBusinessStore();
  const { user } = useAuthStore();

  if (isOfflineProductMode()) {
    return !permission.startsWith('team.');
  }

  if (!user || !activeBusiness) return false;

  const permissions = Array.from(new Set([
    ...(activeBusiness.permissions || []),
    ...(activeBusiness.permissions_canonical || []),
  ]));

  if (activeBusiness.user_id === user.id || user.is_admin || user.permissions?.admin) {
    return true;
  }

  return hasPermissionMatch(permissions, permission);
};

export const useRole = () => {
  const { activeBusiness } = useBusinessStore();
  return activeBusiness?.role || 'MEMBER';
}
