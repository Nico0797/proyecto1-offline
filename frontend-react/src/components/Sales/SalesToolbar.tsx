import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { PeriodFilter } from '../ui/PeriodFilter';
import { DateRange } from '../../utils/dateRange.utils';

interface SalesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const SalesToolbar: React.FC<SalesToolbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
}) => {
  return (
    <div className="flex flex-col gap-4 mb-2">
      <div className="flex items-center gap-3 w-full">
        {/* Search Bar - Flexible */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por cliente, #venta..."
            className="pl-10 w-full"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        {/* Period Filter - Compact Icon */}
        <div className="shrink-0">
          <PeriodFilter 
            moduleId="sales"
            value={dateRange}
            onChange={onDateRangeChange}
            iconOnly
          />
        </div>
      </div>

      {/* Secondary Filters - Row below */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          <select
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-auto"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
          >
            <option value="all">Todas</option>
            <option value="paid">Pagadas</option>
            <option value="pending">Fiadas / Pendientes</option>
            <option value="cancelled">Anuladas</option>
          </select>
      </div>
    </div>
  );
};
