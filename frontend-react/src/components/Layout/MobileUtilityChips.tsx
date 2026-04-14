import { Building2 } from 'lucide-react';
import { useBusinessStore } from '../../store/businessStore';

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
    <div className="flex items-center gap-2 pl-1">
      <div className="app-utility-chip inline-flex">
        <span className="app-utility-chip__icon">
          <Building2 className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-[11px] font-semibold">{getBusinessInitials(activeBusiness?.name)}</span>
      </div>
    </div>
  );
};
