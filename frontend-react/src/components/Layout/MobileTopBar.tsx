import { Menu } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useDemoPreview } from '../../hooks/useDemoPreview';
import { MobileUtilityChips } from './MobileUtilityChips';

type MobileTopBarProps = {
  onMenuClick: () => void;
};

export const MobileTopBar = ({ onMenuClick }: MobileTopBarProps) => {
  const activeBusiness = useBusinessStore((state) => state.activeBusiness);
  const { isDemoPreview } = useDemoPreview();

  return (
    <header className="app-mobile-topbar app-shell-gutter z-30 flex min-h-14 shrink-0 items-center justify-between gap-3 py-2 pt-safe lg:hidden">
      <button
        type="button"
        onClick={onMenuClick}
        className="app-icon-button inline-flex h-10 w-10 items-center justify-center rounded-2xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)]"
        aria-label="Abrir menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold uppercase tracking-[0.24em] app-text-muted">EnCaja</div>
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-semibold tracking-tight app-text">
            {activeBusiness?.name || 'Tu negocio'}
          </div>
          {isDemoPreview ? (
            <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
              Preview
            </span>
          ) : null}
        </div>
      </div>

      <MobileUtilityChips />
    </header>
  );
};
