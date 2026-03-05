import React from 'react';
import { Search, Download, RefreshCw } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PeriodFilter } from '../ui/PeriodFilter';
import { DateRange } from '../../utils/dateRange.utils';

interface ToolbarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onExport: () => void;
  currentTab: string;
  onTabChange: (tab: string) => void;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

export const PaymentsToolbar: React.FC<ToolbarProps> = ({
  searchTerm,
  onSearchChange,
  onRefresh,
  onExport,
  currentTab,
  onTabChange,
  dateRange,
  onDateRangeChange
}) => {
  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-1 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar cliente, referencia..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
        
        <PeriodFilter 
          moduleId="payments"
          value={dateRange}
          onChange={onDateRangeChange}
        />
      </div>

      {/* View Toggles & Actions */}
      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-lg flex items-center">
          <button
            onClick={() => onTabChange('clients')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              currentTab === 'clients'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Por Cliente
          </button>
          <button
            onClick={() => onTabChange('transactions')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              currentTab === 'transactions'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            Transacciones
          </button>
          <button
            onClick={() => onTabChange('overdue')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              currentTab === 'overdue'
                ? 'bg-white dark:bg-gray-700 text-red-500 dark:text-red-400 shadow-sm'
                : 'text-gray-500 hover:text-red-500'
            }`}
            data-tour="payments.tabs.overdue"
          >
            Vencidas
          </button>
        </div>

        <Button variant="ghost" size="icon" onClick={onRefresh} title="Recargar">
          <RefreshCw className="w-4 h-4" />
        </Button>
        
        <Button variant="outline" size="icon" onClick={onExport} title="Exportar CSV">
          <Download className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
