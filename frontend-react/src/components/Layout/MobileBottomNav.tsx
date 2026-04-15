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
          'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1.5 py-1.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)] active:scale-[0.98]',
          isActive
            ? 'bg-blue-50 text-blue-700 shadow-[0_8px_18px_-18px_rgba(37,99,235,0.28)] dark:bg-blue-900/20 dark:text-blue-200'
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
    <div className="fixed bottom-0 left-0 right-0 z-[50] px-[max(0.5rem,env(safe-area-inset-left))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.45rem,env(safe-area-inset-bottom))] lg:hidden">
      <div className="relative mx-auto w-full max-w-xl">
        <div className="relative pt-[calc(var(--app-mobile-bottom-nav-overhang)+0.08rem)]">
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 top-[0.72rem] rounded-[1.45rem] border app-divider app-page-header backdrop-blur-xl"
            aria-hidden="true"
          />

          <nav className="relative grid min-h-[var(--app-mobile-bottom-nav-height)] grid-cols-5 items-end gap-0.5 px-1.5 pb-0.75 pt-1.5">
            {leftItems.map(renderStandardItem)}

            <div className="relative flex justify-center">
              {centerItem ? (
                <NavLink
                  to={centerItem.path}
                  className={({ isActive }) =>
                    cn(
                      'absolute -top-[calc(var(--app-mobile-bottom-nav-overhang)+0.34rem)] z-20 flex h-[3.7rem] w-[3.7rem] aspect-square items-center justify-center rounded-full bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700 text-white ring-4 ring-[color:var(--app-canvas)] shadow-[0_16px_26px_-16px_rgba(29,78,216,0.38)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-canvas)] active:scale-[0.98]',
                      isActive ? 'ring-2 ring-blue-200/70 dark:ring-blue-300/30' : 'hover:-translate-y-0.5',
                    )
                  }
                  aria-label={centerItem.label}
                >
                  <centerItem.icon className="h-[1.4rem] w-[1.4rem] shrink-0" />
                </NavLink>
              ) : null}
              <div className="h-[2.4rem]" />
            </div>

            {rightItems.map(renderStandardItem)}

            <button
              onClick={onMenuToggle}
              aria-pressed={isSidebarOpen}
              aria-label={isSidebarOpen ? 'Cerrar menu lateral' : 'Abrir menu lateral'}
              className={cn(
                'flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1rem] px-1.5 py-1.5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)] active:scale-[0.98]',
                isSidebarOpen
                  ? 'bg-blue-50 text-blue-700 shadow-[0_8px_18px_-18px_rgba(37,99,235,0.28)] dark:bg-blue-900/20 dark:text-blue-200'
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
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};
