import { Menu } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { useDemoPreview } from '../../hooks/useDemoPreview';
import { MobileUtilityChips } from './MobileUtilityChips';
import { isOfflineProductMode } from '../../runtime/runtimeMode';

type MobileTopBarProps = {
  onMenuClick: () => void;
};

export const MobileTopBar = ({ onMenuClick }: MobileTopBarProps) => {
  const activeBusiness = useBusinessStore((state) => state.activeBusiness);
  const { isDemoPreview } = useDemoPreview();
  const offlineProductMode = isOfflineProductMode();

  return (
    <header data-mobile-top-chrome className="app-mobile-topbar app-shell-gutter z-30 shrink-0 lg:hidden">
      <div className="flex min-h-10 min-w-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="app-icon-button inline-flex h-9 w-9 items-center justify-center rounded-xl transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)]"
          aria-label="Abrir menu"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>

        <div className="min-w-0 flex flex-1 items-center gap-2 overflow-hidden">
          <div className="min-w-0 truncate text-[14px] font-semibold tracking-tight app-text">
            {activeBusiness?.name || 'Tu negocio'}
          </div>
          <div className="shrink-0">
            {isDemoPreview && !offlineProductMode ? (
              <span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                Preview
              </span>
            ) : null}
          </div>
        </div>

        <div className="shrink-0">
          <MobileUtilityChips />
        </div>
      </div>
    </header>
  );
};
