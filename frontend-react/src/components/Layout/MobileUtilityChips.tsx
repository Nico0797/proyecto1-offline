import { Building2 } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';
import { SyncStatusIndicator } from '../Sync/SyncStatusIndicator';

const getBusinessInitials = (name?: string | null) => {
  if (!name) return 'EN';

  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((chunk) => chunk[0]?.toUpperCase() || '')
    .join('');
};

export const MobileUtilityChips = () => {
  const activeBusiness = useBusinessStore((state) => state.activeBusiness);

  return (
    <div className="flex items-center gap-2">
      <SyncStatusIndicator compact />
      <div className="app-utility-chip hidden min-[430px]:inline-flex">
        <span className="app-utility-chip__icon">
          <Building2 className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-[11px] font-semibold">{getBusinessInitials(activeBusiness?.name)}</span>
      </div>
    </div>
  );
};
