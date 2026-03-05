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
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 w-full">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Clientes</h2>
          <Button size="sm" onClick={onAdd}><Plus className="w-4 h-4" /></Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
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
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === 'all' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
          >
            Todos
          </button>
          <button 
            onClick={() => onFilterChange('debt')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === 'debt' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
          >
            Con Deuda
          </button>
          <button 
            onClick={() => onFilterChange('paid')}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === 'paid' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}
          >
            Paz y Salvo
          </button>
          <div className="relative">
            <button 
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
            >
              Ordenar: {sort === 'name' ? 'Nombre' : sort === 'debt' ? 'Deuda' : 'Reciente'}
            </button>
            {showSortMenu && (
              <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                <button 
                  onClick={() => { onSortChange('name'); setShowSortMenu(false); }}
                  className={`block w-full text-left px-3 py-2 text-xs whitespace-nowrap ${sort === 'name' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  Nombre
                </button>
                <button 
                  onClick={() => { onSortChange('debt'); setShowSortMenu(false); }}
                  className={`block w-full text-left px-3 py-2 text-xs whitespace-nowrap ${sort === 'debt' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  Deuda
                </button>
                <button 
                  onClick={() => { onSortChange('recent'); setShowSortMenu(false); }}
                  className={`block w-full text-left px-3 py-2 text-xs whitespace-nowrap ${sort === 'recent' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
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
              className={`p-4 border-b border-gray-100 dark:border-gray-700/50 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${selectedId === customer.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`font-medium text-sm truncate pr-2 ${selectedId === customer.id ? 'text-blue-700 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}>
                  {customer.name}
                </h3>
                {customer.balance > 0 && (
                  <span className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded">
                    DEBE
                  </span>
                )}
              </div>
              <div className="flex justify-between items-end">
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {customer.phone || 'Sin teléfono'}
                </div>
                <div className={`text-sm font-semibold ${customer.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                  ${(customer.balance || 0).toLocaleString()}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center text-gray-500 text-sm">
            No se encontraron clientes.
          </div>
        )}
      </div>
    </div>
  );
};
