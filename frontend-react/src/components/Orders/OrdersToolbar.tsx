import React from 'react';
import { Search, Download } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PeriodFilter } from '../ui/PeriodFilter';
import { DateRange } from '../../utils/dateRange.utils';

interface OrdersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onExport: () => void;
}

export const OrdersToolbar: React.FC<OrdersToolbarProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  dateRange,
  onDateRangeChange,
  onExport,
}) => {
  return (
    <div className="flex flex-col gap-4 mb-4" data-tour="orders.search">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            placeholder="Buscar por cliente o ID..." 
            className="pl-10 w-full"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-auto">
             <PeriodFilter moduleId="orders" value={dateRange} onChange={onDateRangeChange} />
        </div>
        <select
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
        >
          <option value="all">Todos</option>
          <option value="pending">Pendientes</option>
          <option value="completed">Completados</option>
          <option value="cancelled">Anulados</option>
        </select>
        <div className="w-full sm:w-auto">
            <Button variant="outline" onClick={onExport} data-tour="orders.export">
                <Download className="w-4 h-4" />
            </Button>
        </div>
      </div>
    </div>
  );
};
