import React from 'react';
import { Search, Download } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { DateRange } from '../../utils/dateRange.utils';
import { PeriodFilter } from '../ui/PeriodFilter';

interface ExpensesToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onExport: () => void;
  categories: string[];
}

export const ExpensesToolbar: React.FC<ExpensesToolbarProps> = ({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  dateRange,
  onDateRangeChange,
  onExport,
  categories,
}) => {
  return (
    <div className="flex flex-col gap-4 mb-6">
      <div className="flex flex-col md:flex-row gap-4 md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar gasto, proveedor..."
            className="pl-10"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full items-center">
          <PeriodFilter 
            moduleId="expenses"
            value={dateRange}
            onChange={onDateRangeChange}
            iconOnly
            mode="customOnly"
          />

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
          
          <Button variant="secondary" onClick={onExport} title="Exportar CSV" className="w-full sm:w-auto">
             <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
