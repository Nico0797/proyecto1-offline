import React from 'react';
import { createPortal } from 'react-dom';
import { Plus } from 'lucide-react';
import { cn } from '../../utils/cn';
import { useContextualFloatingActionStore } from '../../store/contextualFloatingActionStore';

/**
 * LEGACY: CompactFloatingContextBar - mantenido por compatibilidad.
 * Usar ContextualFloatingFab en código nuevo.
 * La visibilidad se controla desde MainLayout (isFabVisible).
 */
export const CompactFloatingContextBar: React.FC = () => {
  const action = useContextualFloatingActionStore((state) => state.action);

  if (!action) return null;

  const Icon = action.icon || Plus;

  const content = (
    <div
      className={cn(
        'pointer-events-none fixed inset-x-0 top-0 z-[56] px-[max(0.75rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] pt-[max(0.45rem,env(safe-area-inset-top))] lg:hidden',
      )}
    >
      <div className="mx-auto w-full max-w-xl">
        <div
          className={cn(
            'pointer-events-auto flex items-center gap-3 rounded-[1.35rem] border app-divider bg-[color:var(--app-page-header)]/96 px-3.5 py-2.5 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.42)] backdrop-blur-xl transition-all duration-200 ease-out',
            'translate-y-0 opacity-100',
          )}
        >
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold tracking-tight app-text">{action.title}</div>
          </div>
          <button
            type="button"
            onClick={action.onClick}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 px-3.5 text-sm font-semibold text-white shadow-[0_14px_24px_-18px_rgba(37,99,235,0.45)] ring-1 ring-white/10 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-canvas)]"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{action.label}</span>
          </button>
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
};
