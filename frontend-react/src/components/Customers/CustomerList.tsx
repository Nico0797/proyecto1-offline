import React from 'react';
import { Customer } from '../../types';
import { Button } from '../ui/Button';
import { Plus, Search } from 'lucide-react';
import { Input } from '../ui/Input';

interface CustomerListProps {
  customers: Customer[];
  selectedId?: number;
  onSelect: (customer: Customer) => void;
  onAdd: () => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filter: 'all' | 'debt' | 'paid';
  onFilterChange: (filter: 'all' | 'debt' | 'paid') => void;
  sort: 'name' | 'debt' | 'recent';
  onSortChange: (sort: 'name' | 'debt' | 'recent') => void;
}

export const CustomerList: React.FC<CustomerListProps> = ({
  customers = [], // Default to empty array
  selectedId,
  onSelect,
  onAdd,
  searchTerm,
  onSearchChange,
  filter,
  onFilterChange,
  sort,
  onSortChange
}) => {
  const [showSortMenu, setShowSortMenu] = React.useState(false);

  const filtered = customers
    .filter(c => {
      if (!c) return false;
      if (filter === 'debt') return (c.balance || 0) > 0;
      if (filter === 'paid') return (c.balance || 0) <= 0;
      return true;
    })
    .filter(c => 
      (c.name || '').toLowerCase().includes((searchTerm || '').toLowerCase()) || 
      (c.phone || '').includes(searchTerm || '')
    )
    .sort((a, b) => {
      if (sort === 'debt') return (b.balance || 0) - (a.balance || 0);
      if (sort === 'recent') return ((b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0));
      return (a.name || '').localeCompare(b.name || '');
    });

  return (
    <div className="app-surface flex h-full w-full flex-col rounded-none border-0 shadow-none lg:rounded-[24px] lg:border">
      <div className="app-divider space-y-3 border-b p-4">
        <div className="flex justify-between items-center">
          <h2 className="app-text text-lg font-bold">Clientes</h2>
          <Button size="sm" onClick={onAdd}><Plus className="w-4 h-4" /></Button>
        </div>
        
        <div className="relative">
          <Search className="app-text-muted absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform" />
          <Input 
            placeholder="Buscar..." 
            value={searchTerm}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          <button 
            onClick={() => onFilterChange('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'app-chip'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => onFilterChange('debt')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === 'debt' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'app-chip'}`}
          >
            Con Deuda
          </button>
          <button 
            onClick={() => onFilterChange('paid')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'app-chip'}`}
          >
            Paz y Salvo
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="app-chip px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors"
            >
              Ordenar: {sort === 'name' ? 'Nombre' : sort === 'debt' ? 'Deuda' : 'Reciente'}
            </button>
            {showSortMenu && (
              <div className="app-surface absolute left-0 top-full z-10 mt-1 rounded-lg shadow-lg">
                <button 
                  onClick={() => { onSortChange('name'); setShowSortMenu(false); }}
                  className={`block w-full whitespace-nowrap px-3 py-2 text-left text-xs ${sort === 'name' ? 'font-medium text-blue-600 dark:text-blue-400' : 'app-text-secondary'}`}
                >
                  Nombre
                </button>
                <button 
                  onClick={() => { onSortChange('debt'); setShowSortMenu(false); }}
                  className={`block w-full whitespace-nowrap px-3 py-2 text-left text-xs ${sort === 'debt' ? 'font-medium text-blue-600 dark:text-blue-400' : 'app-text-secondary'}`}
                >
                  Deuda
                </button>
                <button 
                  onClick={() => { onSortChange('recent'); setShowSortMenu(false); }}
                  className={`block w-full whitespace-nowrap px-3 py-2 text-left text-xs ${sort === 'recent' ? 'font-medium text-blue-600 dark:text-blue-400' : 'app-text-secondary'}`}
                >
                  Reciente
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filtered.length > 0 ? (
          filtered.map(customer => (
            <div 
              key={customer.id}
              onClick={() => onSelect(customer)}
              className={`app-divider cursor-pointer border-b p-4 transition-colors hover:bg-gray-50 ${selectedId === customer.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`truncate pr-2 text-sm font-medium ${selectedId === customer.id ? 'text-blue-700 dark:text-blue-400' : 'app-text'}`}>
                  {customer.name}
                </h3>
                {customer.balance > 0 && (
                  <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    DEBE
                  </span>
                )}
              </div>
              <div className="flex justify-between items-end">
                <div className="app-text-muted text-xs">
                  {customer.phone || 'Sin teléfono'}
                </div>
                <div className={`text-sm font-semibold ${customer.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  ${(customer.balance || 0).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="app-text-muted p-8 text-center text-sm">
            No se encontraron clientes.
          </div>
        )}
      </div>
    </div>
  );
};
