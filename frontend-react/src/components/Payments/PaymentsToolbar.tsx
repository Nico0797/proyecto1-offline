import React from 'react';
import { DateRange } from '../../utils/dateRange.utils';
import { FilterBar, FilterPeriod, FilterSearch } from '../ui/FilterBar';

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
  onDateRangeChange,
}) => {
  return (
    <FilterBar
      search={(
        <FilterSearch
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Buscar cliente o referencia"
        />
      )}
      period={(
        <FilterPeriod
          moduleId="payments"
          value={dateRange}
          onChange={onDateRangeChange}
        />
      )}
    />
  );
};
