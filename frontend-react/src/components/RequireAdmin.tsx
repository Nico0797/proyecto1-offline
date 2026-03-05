import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export const RequireAdmin = () => {
  const { user, isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check if user has admin permission or is_admin flag
  // Based on backend/main.py, the user object has a permissions object
  // where 'admin' key is boolean for admin access
  const isAdmin = user?.is_admin || user?.permissions?.admin;

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};
