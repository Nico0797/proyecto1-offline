import { Outlet } from 'react-router-dom';
import { useForcedTheme } from '../providers/ThemeProvider';

export const AuthThemeLayout = () => {
  useForcedTheme('dark');

  return (
    <div className="auth-theme-scope min-h-screen bg-gray-950 text-white">
      <Outlet />
    </div>
  );
};
