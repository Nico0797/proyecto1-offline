import React from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useContextualFloatingActionStore } from '../../store/contextualFloatingActionStore';

export const ContextualFloatingFab: React.FC = () => {
  const action = useContextualFloatingActionStore((state) => state.action);
  const headerVisible = useContextualFloatingActionStore((state) => state.headerVisible);

  if (!action) return null;

  const Icon = action.icon || Plus;
  const isVisible = !headerVisible;

  const content = (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 z-[56] px-[max(0.9rem,env(safe-area-inset-left))] pr-[max(0.9rem,env(safe-area-inset-right))] lg:hidden',
        'bottom-[calc(var(--app-mobile-bottom-nav-height)+var(--app-mobile-bottom-nav-overhang)+1rem+var(--app-safe-area-bottom))]',
      )}
    >
      <div className="mx-auto flex w-full max-w-xl justify-end">
        <button
          type="button"
          onClick={action.onClick}
          className={cn(
            'pointer-events-auto inline-flex min-h-12 max-w-[min(80vw,19rem)] items-center gap-2.5 rounded-full px-4.5 py-3 text-sm font-semibold text-white',
            'bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 shadow-[0_20px_36px_-22px_rgba(37,99,235,0.52)] ring-1 ring-white/12',
            'transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-canvas)] active:scale-[0.98]',
            isVisible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0 pointer-events-none',
          )}
          aria-hidden={!isVisible}
          tabIndex={isVisible ? 0 : -1}
        >
          <Icon className="h-[1.125rem] w-[1.125rem] shrink-0" />
          <span className="truncate whitespace-nowrap">{action.label}</span>
        </button>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};
