import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useForcedTheme } from '../providers/ThemeProvider';
import { clearDerivedSessionArtifacts, useAuthStore } from '../../store/authStore';

export const AuthThemeLayout = () => {
  useForcedTheme('dark');
  const { isAuthenticated, token } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated && !token) {
      clearDerivedSessionArtifacts();
    }
  }, [isAuthenticated, token]);

  return (
    <div className="auth-theme-scope min-h-screen bg-gray-950 text-white">
      <Outlet />
    </div>
  );
};
