import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { PeriodFilter } from '../ui/PeriodFilter';
import { DateRange } from '../../utils/dateRange.utils';

interface ToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const PaymentsToolbar: React.FC<ToolbarProps> = ({
  searchTerm,
  onSearchChange,
  dateRange,
  onDateRangeChange
}) => {
  return (
    <div className="flex flex-row items-center gap-3 w-full" data-tour="payments.search">
      {/* Search Bar - Flexible width */}
      <div className="relative flex-1 min-w-0">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Buscar cliente..."
          className="pl-10 w-full"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      {/* Period Filter - Compact next to search */}
      <div className="shrink-0">
        <PeriodFilter 
          moduleId="payments"
          value={dateRange}
          onChange={onDateRangeChange}
          iconOnly
        />
      </div>
    </div>
  );
};
