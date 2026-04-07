import React from 'react';
import { NavLink } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAccess } from '../../hooks/useAccess';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigationPreferences } from '../../store/navigationPreferences.store';
import { resolveBusinessNavigationState } from '../../navigation/navigationPersonalization';

interface MobileBottomNavProps {
  onMenuClick: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ onMenuClick }) => {
  const { activeBusiness } = useBusinessStore();
  const { user } = useAuthStore();
  const { hasPermission, hasModule, canAccess } = useAccess();
  const getScopeKey = useNavigationPreferences((state) => state.getScopeKey);
  const scopeKey = getScopeKey(user?.id, activeBusiness?.id);
  const storedNavigationPreferences = useNavigationPreferences((state) => state.preferencesByScope[scopeKey]);
  const { mobileItems } = resolveBusinessNavigationState({
    business: activeBusiness,
    storedPreferences: storedNavigationPreferences,
    hasPermission,
    hasModule,
    canAccessFeature: canAccess,
  });

  return (
    <div className="app-page-header fixed bottom-0 left-0 right-0 z-40 border-t app-divider pb-[env(safe-area-inset-bottom)] shadow-[0_-12px_32px_-28px_rgba(15,23,42,0.45)] backdrop-blur lg:hidden">
      <nav className="flex h-[4.5rem] items-center justify-around px-2">
        {mobileItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'mx-0.5 flex h-[58px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)] active:scale-[0.99]',
                isActive
                  ? 'app-tab-active'
                  : 'app-tab-idle'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="max-w-full truncate px-1 text-[11px] font-medium leading-none">
              {item.shortLabel || item.label}
            </span>
          </NavLink>
        ))}

        <button
          onClick={onMenuClick}
          className="app-tab-idle mx-0.5 flex h-[58px] min-w-0 flex-1 basis-0 flex-col items-center justify-center gap-1 rounded-2xl px-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)] active:scale-[0.99]"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[11px] font-medium leading-none">Mas</span>
        </button>
      </nav>
    </div>
  );
};
