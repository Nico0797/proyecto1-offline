import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '../ui/Input';
import { DateRange } from '../../utils/dateRange.utils';
import { PeriodFilter } from '../ui/PeriodFilter';

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
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row gap-3 md:gap-4 md:items-center justify-between">
        {/* Row: Period icon + Search (comparten espacio en móvil y desktop) */}
        <div className="flex items-center gap-2 w-full">
          <PeriodFilter 
            moduleId="expenses"
            value={dateRange}
            onChange={onDateRangeChange}
            iconOnly
            className="shrink-0"
          />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar gasto, proveedor..."
              className="pl-10 w-full"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 w-full items-center">
          <select
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
            value={categoryFilter}
            onChange={(e) => onCategoryFilterChange(e.target.value)}
            data-tour="expenses.category"
          >
            <option value="all">Todas las Categorías</option>
            {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
