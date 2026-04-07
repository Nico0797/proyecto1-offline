import React from 'react';
import { DateRange } from '../../utils/dateRange.utils';
import { FilterBar, FilterPeriod, FilterSearch, FilterSelect } from '../ui/FilterBar';

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
    <FilterBar
      className="lg:gap-4"
      search={(
        <div data-tour="sales.filters.search">
          <FilterSearch
            value={search}
            onChange={onSearchChange}
            placeholder="Buscar por cliente, nota o numero de venta"
          />
        </div>
      )}
      primary={(
        <FilterSelect
          value={statusFilter}
          onChange={onStatusFilterChange}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'paid', label: 'Pagadas' },
            { value: 'pending', label: 'Fiadas / Pendientes' },
            { value: 'cancelled', label: 'Anuladas' },
          ]}
          placeholder="Estado"
          sheetTitle="Estado de ventas"
        />
      )}
      period={(
        <FilterPeriod
          moduleId="sales"
          value={dateRange}
          onChange={onDateRangeChange}
        />
      )}
    />
  );
};
