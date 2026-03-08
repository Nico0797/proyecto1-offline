import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { PeriodFilter } from '../ui/PeriodFilter';
import { DateRange } from '../../utils/dateRange.utils';

interface OrdersToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  statusCounts?: {
    all: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
}

export const OrdersToolbar: React.FC<OrdersToolbarProps> = ({
  search,
  onSearchChange,
  dateRange,
  onDateRangeChange,
  statusFilter,
  onStatusFilterChange,
  statusCounts
}) => {
  return (
    <div className="flex flex-col gap-3 mb-4" data-tour="orders.search">
      {/* Controles */}
      <div className="flex flex-row flex-wrap items-center gap-3">
        <div className="relative flex-none w-40 sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input 
            placeholder="Buscar por cliente o ID..." 
            className="pl-10 w-full"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        <div className="flex-none">
          <PeriodFilter moduleId="orders" value={dateRange} onChange={onDateRangeChange} iconOnly />
        </div>
        
        {/* Status Filter */}
        <div className="flex-none">
            <select
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
            >
                <option value="all">Todos {statusCounts ? `(${statusCounts.all})` : ''}</option>
                <option value="pending">Pendientes {statusCounts ? `(${statusCounts.pending})` : ''}</option>
                <option value="completed">Completados {statusCounts ? `(${statusCounts.completed})` : ''}</option>
                <option value="cancelled">Cancelados {statusCounts ? `(${statusCounts.cancelled})` : ''}</option>
            </select>
        </div>
      </div>
    </div>
  );
};
