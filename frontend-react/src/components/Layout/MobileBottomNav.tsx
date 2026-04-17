import React, { useMemo } from 'react';
import { createPortal } from 'react-dom';
import { NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useAccess } from '../../hooks/useAccess';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import { useNavigationPreferences } from '../../store/navigationPreferences.store';
import { resolveBusinessNavigationState } from '../../navigation/navigationPersonalization';

interface MobileBottomNavProps {
  isSidebarOpen: boolean;
  onMenuToggle: () => void;
}

const resolveCenterItemIndex = (items: Array<{ path: string }>) => {
  if (items.length >= 4) return 2;
  if (items.length === 3) return 1;
  if (items.length === 2) return 1;
  return 0;
};

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ isSidebarOpen, onMenuToggle }) => {
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

  const { centerItem, sideItems } = useMemo(() => {
    if (!mobileItems.length) {
      return { centerItem: null, sideItems: [] as typeof mobileItems };
    }

    const centerIndex = resolveCenterItemIndex(mobileItems);
    const nextCenterItem = mobileItems[centerIndex] || mobileItems[0];
    const nextSideItems = mobileItems.filter((item) => item.path !== nextCenterItem.path).slice(0, 3);

    return {
      centerItem: nextCenterItem,
      sideItems: nextSideItems,
    };
  }, [mobileItems]);

  const leftItems = sideItems.slice(0, 2);
  const rightItems = sideItems.slice(2);

  const renderStandardItem = (item: (typeof mobileItems)[number]) => (
    <NavLink
      key={item.path}
      to={item.path}
      className={({ isActive }) =>
        cn(
          'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface)] active:scale-[0.98]',
          isActive
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/24 dark:text-blue-200'
            : 'text-[color:var(--app-text-secondary)] hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]',
        )
      }
    >
      <item.icon className="h-[1.15rem] w-[1.15rem] shrink-0" />
      <span className="max-w-full truncate px-0.5 text-[10px] font-medium leading-none">
        {item.shortLabel || item.label}
      </span>
    </NavLink>
  );

  const content = (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-[45] border-t app-divider bg-[color:var(--app-surface)] shadow-[0_-1px_0_rgba(15,23,42,0.02)] transition-transform duration-200 lg:hidden',
        isSidebarOpen && 'pointer-events-none translate-y-full',
      )}
    >
      <nav className="grid min-h-[calc(var(--app-mobile-bottom-nav-height)+var(--app-safe-area-bottom))] grid-cols-5 items-stretch gap-1 px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.35rem,env(safe-area-inset-bottom))] pt-1.5">
        {leftItems.map(renderStandardItem)}
        {centerItem ? renderStandardItem(centerItem) : <div aria-hidden="true" />}
        {rightItems.map(renderStandardItem)}

        <button
          onClick={onMenuToggle}
          aria-pressed={isSidebarOpen}
          aria-label={isSidebarOpen ? 'Cerrar menu lateral' : 'Abrir menu lateral'}
          className={cn(
            'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-xl px-1.5 py-2 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface)] active:scale-[0.98]',
            isSidebarOpen
              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/24 dark:text-blue-200'
              : 'text-[color:var(--app-text-secondary)] hover:bg-[color:var(--app-surface-soft)] hover:text-[color:var(--app-text)]',
          )}
        >
          {isSidebarOpen ? (
            <X className="h-[1.15rem] w-[1.15rem] shrink-0" />
          ) : (
            <Menu className="h-[1.15rem] w-[1.15rem] shrink-0" />
          )}
          <span className="max-w-full truncate px-0.5 text-[10px] font-medium leading-none">Mas</span>
        </button>
      </nav>
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};
