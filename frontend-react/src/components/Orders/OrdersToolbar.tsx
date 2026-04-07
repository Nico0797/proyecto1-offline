import React from 'react';
import { DateRange } from '../../utils/dateRange.utils';
import { FilterBar, FilterPeriod, FilterSearch, FilterSelect } from '../ui/FilterBar';

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
  statusCounts,
}) => {
  return (
    <FilterBar
      search={(
        <FilterSearch
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por cliente o ID"
        />
      )}
      primary={(
        <FilterSelect
          value={statusFilter}
          onChange={onStatusFilterChange}
          options={[
            { value: 'all', label: `Todos${statusCounts ? ` (${statusCounts.all})` : ''}` },
            { value: 'pending', label: `Pendientes${statusCounts ? ` (${statusCounts.pending})` : ''}` },
            { value: 'completed', label: `Completados${statusCounts ? ` (${statusCounts.completed})` : ''}` },
            { value: 'cancelled', label: `Cancelados${statusCounts ? ` (${statusCounts.cancelled})` : ''}` },
          ]}
          placeholder="Estado"
          sheetTitle="Estado de pedidos"
        />
      )}
      period={(
        <FilterPeriod
          moduleId="orders"
          value={dateRange}
          onChange={onDateRangeChange}
        />
      )}
    />
  );
};
