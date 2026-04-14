import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useBusinessStore } from '../store/businessStore';
import { clearBootTraceEntries, useBootTraceEntries } from './bootTrace';
import { isOfflineProductMode } from '../runtime/runtimeMode';
import { useDebugFlag } from './debugFlags';

export const BootTracePanel = () => {
  const location = useLocation();
  const { isHydrating, isAuthenticated, activeContext, accessibleContexts } = useAuthStore();
  const { activeBusiness, isLoading: isBusinessLoading } = useBusinessStore();
  const entries = useBootTraceEntries(16);
  const [isOpen, setIsOpen] = useState(true);
  const offlineProductMode = isOfflineProductMode();
  const debugBootTraceEnabled = useDebugFlag('boottrace');

  const routeLabel = useMemo(() => `${location.pathname}${location.search}`, [location.pathname, location.search]);

  if (!offlineProductMode || !debugBootTraceEnabled) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-2 bottom-2 z-[90] lg:left-auto lg:right-4 lg:w-[28rem]">
      <div className="pointer-events-auto rounded-2xl border border-slate-300/70 bg-white/95 shadow-xl backdrop-blur dark:border-slate-700 dark:bg-slate-950/95">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 px-3 py-2 text-[11px] dark:border-slate-800">
          <div className="min-w-0">
            <div className="font-semibold text-slate-900 dark:text-slate-100">Boot trace</div>
            <div className="truncate text-slate-500 dark:text-slate-400">route={routeLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => clearBootTraceEntries()}
              className="rounded-lg border border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setIsOpen((current) => !current)}
              className="rounded-lg border border-slate-300 px-2 py-1 text-[10px] font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
            >
              {isOpen ? 'Ocultar' : 'Mostrar'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-slate-200/80 px-3 py-2 text-[10px] text-slate-700 dark:border-slate-800 dark:text-slate-300">
          <div>hydrating={isHydrating ? 'yes' : 'no'}</div>
          <div>authenticated={isAuthenticated ? 'yes' : 'no'}</div>
          <div>activeBusiness={activeBusiness?.id ?? 'none'}</div>
          <div>activeContext={activeContext?.business_id ?? 'none'}</div>
          <div>contexts={accessibleContexts.length}</div>
          <div>businessLoading={isBusinessLoading ? 'yes' : 'no'}</div>
        </div>
        {isOpen ? (
          <div className="max-h-52 overflow-auto px-3 py-2 text-[10px]">
            {entries.length === 0 ? (
              <div className="text-slate-500 dark:text-slate-400">Sin eventos aún.</div>
            ) : (
              <div className="space-y-1.5">
                {entries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-slate-200/80 px-2 py-1 dark:border-slate-800">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{entry.label}</div>
                    <div className="text-slate-500 dark:text-slate-400">{entry.at}</div>
                    <div className="mt-0.5 break-words text-slate-700 dark:text-slate-300">{JSON.stringify(entry.data || {})}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};
