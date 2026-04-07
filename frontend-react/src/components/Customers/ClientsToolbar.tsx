import React from 'react';
import { Settings } from 'lucide-react';
import { Button } from '../ui/Button';
import { FilterBar, FilterSearch, FilterSelect } from '../ui/FilterBar';

interface ClientsToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  filter: string;
  onFilterChange: (value: string) => void;
  onOpenSettings: () => void;
  showReceivables?: boolean;
}

export const ClientsToolbar: React.FC<ClientsToolbarProps> = ({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  onOpenSettings,
  showReceivables = true,
}) => {
  return (
    <div data-tour="customers.search">
      <FilterBar
        search={(
          <FilterSearch
            value={search}
            onChange={onSearchChange}
            placeholder="Buscar por nombre, celular o correo"
          />
        )}
        primary={(
          <div data-tour="customers.filterInactive">
            <FilterSelect
              value={filter}
              onChange={onFilterChange}
              options={[
                { value: 'all', label: 'Todos' },
                ...(showReceivables ? [{ value: 'debt', label: 'Con saldo' }] : []),
                { value: 'clean', label: 'Paz y salvo' },
                ...(showReceivables ? [{ value: 'due_soon', label: 'Por vencer' }] : []),
                ...(showReceivables ? [{ value: 'overdue', label: 'Vencidos' }] : []),
              ]}
              placeholder="Estado"
              sheetTitle="Estado del cliente"
            />
          </div>
        )}
        actions={showReceivables ? (
          <Button
            variant="secondary"
            onClick={onOpenSettings}
            title="Configurar fiados"
            className="w-full lg:w-auto"
            data-tour="customers.creditLimit"
          >
            <Settings className="h-4 w-4" />
            Configurar fiados
          </Button>
        ) : undefined}
      />
    </div>
  );
};
