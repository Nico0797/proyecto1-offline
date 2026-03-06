import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { Sidebar } from './Sidebar';
import { MobileBottomNav } from './MobileBottomNav';

export const MainLayout = () => {
  const { isAuthenticated } = useAuthStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="h-[100dvh] overflow-hidden bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 flex">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      {/* Main Content Wrapper */}
      <div className="flex-1 flex flex-col h-full lg:pl-64 transition-all duration-300 w-full">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shrink-0 z-30 pt-safe min-h-14">
          <span className="text-lg font-semibold text-gray-900 dark:text-white">EnCaja</span>
          {/* Optional: Add profile or notification icon here */}
        </header>

        {/* Main Content Area */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
          <Outlet />
        </main>

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden">
            <MobileBottomNav onMenuClick={() => setIsSidebarOpen(true)} />
        </div>
      </div>
    </div>
  );
};
