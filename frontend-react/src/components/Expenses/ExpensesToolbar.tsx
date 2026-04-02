import React from 'react';
import { DateRange } from '../../utils/dateRange.utils';
import { FilterBar, FilterPeriod, FilterSearch, FilterSelect } from '../ui/FilterBar';

interface ExpensesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  categories: string[];
}

export const ExpensesToolbar: React.FC<ExpensesToolbarProps> = ({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  dateRange,
  onDateRangeChange,
  categories,
}) => {
  return (
    <FilterBar
      search={(
        <FilterSearch
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar gasto, proveedor o categoria"
        />
      )}
      primary={(
        <FilterSelect
          value={categoryFilter}
          onChange={onCategoryFilterChange}
          options={[
            { value: 'all', label: 'Todas las categorias' },
            ...categories.map((category) => ({ value: category, label: category })),
          ]}
          placeholder="Categoria"
          sheetTitle="Categoria de gasto"
        />
      )}
      period={(
        <FilterPeriod
          moduleId="expenses"
          value={dateRange}
          onChange={onDateRangeChange}
        />
      )}
    />
  );
};
