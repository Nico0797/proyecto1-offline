import React, { useState } from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useCategoryStore } from './categoryStore';
import { PeriodFilter } from '../ui/PeriodFilter';
import { DateRange } from '../../utils/dateRange.utils';

interface ProductFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  typeFilter: 'all' | 'product' | 'service';
  onTypeFilterChange: (value: 'all' | 'product' | 'service') => void;
  statusFilter: 'active' | 'archived';
  onStatusFilterChange: (value: 'active' | 'archived') => void;
  stockFilter: 'all' | 'low' | 'out' | 'ok';
  onStockFilterChange: (value: 'all' | 'low' | 'out' | 'ok') => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  dateRange?: DateRange;
  onDateRangeChange?: (range: DateRange) => void;
}

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  search,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  stockFilter,
  onStockFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  dateRange,
  onDateRangeChange,
}) => {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const { categories } = useCategoryStore();

  return (
    <div className="flex flex-col gap-4 mb-6" data-tour="products.search">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Buscar por nombre, SKU..."
            className="pl-10"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 items-center">
          {dateRange && onDateRangeChange && (
            <PeriodFilter 
              moduleId="products"
              value={dateRange}
              onChange={onDateRangeChange}
            />
          )}

          <select
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as any)}
          >
            <option value="all">Todos los Tipos</option>
            <option value="product">Productos</option>
            <option value="service">Servicios</option>
          </select>

          <select
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as any)}
          >
            <option value="active">Activos</option>
            <option value="archived">Archivados</option>
          </select>
          
          <Button 
            variant={showMoreFilters ? "primary" : "secondary"} 
            className="px-3 whitespace-nowrap"
            onClick={() => setShowMoreFilters(!showMoreFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            {showMoreFilters ? 'Menos Filtros' : 'Más Filtros'}
          </Button>
        </div>
      </div>

      {showMoreFilters && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 animate-in slide-in-from-top-2 fade-in">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Estado de Stock</label>
              <select
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={stockFilter}
                onChange={(e) => onStockFilterChange(e.target.value as any)}
              >
                <option value="all">Todos</option>
                <option value="ok">Stock OK</option>
                <option value="low">Stock Bajo</option>
                <option value="out">Sin Stock</option>
              </select>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Categoría</label>
              <select
                className="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={categoryFilter}
                onChange={(e) => onCategoryFilterChange(e.target.value)}
              >
                <option value="">Todas las Categorías</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            {(stockFilter !== 'all' || categoryFilter !== '') && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                        onStockFilterChange('all');
                        onCategoryFilterChange('');
                    }}
                    className="text-red-500 hover:text-red-600 h-9"
                >
                    <X className="w-4 h-4 mr-1" /> Limpiar
                </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
