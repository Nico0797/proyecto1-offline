import React from 'react';
import { Search, Settings } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

interface ClientsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  onOpenSettings: () => void;
}

export const ClientsToolbar: React.FC<ClientsToolbarProps> = ({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onOpenSettings,
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-3 w-full" data-tour="customers.search">
      {/* Search Bar */}
      <div className="relative w-full md:w-auto md:flex-1">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Buscar cliente..."
          className="pl-10 w-full"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      {/* Filters and Actions Row */}
      <div className="flex flex-wrap gap-2 items-center justify-between md:justify-end">
        <div className="flex gap-2 flex-grow md:flex-grow-0">
            <select
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 flex-grow min-w-[120px]"
              value={filter}
              onChange={(e) => onFilterChange(e.target.value)}
              data-tour="customers.filterInactive"
            >
              <option value="all">Todos</option>
              <option value="debt">Con Deuda</option>
              <option value="clean">Paz y Salvo</option>
              <option value="due_soon">Por Vencer</option>
              <option value="overdue">Vencidos</option>
              <option value="inactive">Inactivos</option>
            </select>
        </div>
        
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onOpenSettings} title="Configurar Fiados" className="shrink-0 px-3" data-tour="customers.creditLimit">
                <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
