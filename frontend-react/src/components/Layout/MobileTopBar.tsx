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
    <header className="app-mobile-topbar app-shell-gutter z-30 shrink-0 py-1 lg:hidden">
      <div className="flex min-h-8 min-w-0 items-center justify-between gap-2">
        <button
          type="button"
          onClick={onMenuClick}
          className="app-icon-button inline-flex h-8 w-8 items-center justify-center rounded-lg transition"
          aria-label="Abrir menu"
        >
          <Menu className="h-[18px] w-[18px]" />
        </button>

        <div className="min-w-0 flex flex-1 items-center gap-2 overflow-hidden">
          <div className="min-w-0 truncate text-[13px] font-medium tracking-tight app-text">
            {activeBusiness?.name || 'Tu negocio'}
          </div>
        </div>

        <div className="shrink-0">
          <MobileUtilityChips />
        </div>
      </div>
    </header>
  );
};
