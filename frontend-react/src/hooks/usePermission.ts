import { useBusinessStore } from '../store/businessStore';
import { useAuthStore } from '../store/authStore';

export const usePermission = (permission: string) => {
  const { activeBusiness } = useBusinessStore();
  const { user } = useAuthStore();

  if (!user || !activeBusiness) return false;

  const permissions = Array.from(new Set([
    ...(activeBusiness.permissions || []),
    ...(activeBusiness.permissions_canonical || []),
  ]));
  
  // Superuser / Owner check
  if (permissions.includes('*')) return true;
  
  // Admin wildcard check
  if (permissions.includes('admin.*')) return true;
  
  // Exact match
  if (permissions.includes(permission)) return true;
  
  // Scope wildcard check (e.g. products.* covers products.create)
  const [scope] = permission.split('.');
  if (permissions.includes(`${scope}.*`)) return true;
  
  return false;
};

export const useRole = () => {
    const { activeBusiness } = useBusinessStore();
    return activeBusiness?.role || 'MEMBER';
}
