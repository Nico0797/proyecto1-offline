import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useCategoryStore } from './categoryStore';
import {
  FilterActions,
  FilterBar,
  FilterMoreButton,
  FilterPanel,
  FilterSearch,
  FilterSelect,
} from '../ui/FilterBar';

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
}) => {
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const { categories } = useCategoryStore();
  const hasSecondaryFilters = stockFilter !== 'all' || categoryFilter !== '';

  return (
    <FilterBar
      className="lg:gap-5"
      search={(
        <div data-tour="products.search">
          <FilterSearch
            value={search}
            onChange={onSearchChange}
            placeholder="Buscar por nombre o SKU"
          />
        </div>
      )}
      primary={[
        <FilterSelect
          key="type"
          value={typeFilter}
          onChange={(value) => onTypeFilterChange(value as 'all' | 'product' | 'service')}
          options={[
            { value: 'all', label: 'Todos los tipos' },
            { value: 'product', label: 'Productos' },
            { value: 'service', label: 'Servicios' },
          ]}
          placeholder="Tipo"
          sheetTitle="Tipo de item"
        />,
        <FilterSelect
          key="status"
          value={statusFilter}
          onChange={(value) => onStatusFilterChange(value as 'active' | 'archived')}
          options={[
            { value: 'active', label: 'Activos' },
            { value: 'archived', label: 'Archivados' },
          ]}
          placeholder="Estado"
          sheetTitle="Estado del catalogo"
        />,
      ]}
      actions={(
        <FilterMoreButton
          open={showMoreFilters}
          onClick={() => setShowMoreFilters((current) => !current)}
          closedLabel="Mas filtros"
          openLabel="Menos filtros"
        />
      )}
      secondary={showMoreFilters ? (
        <FilterPanel>
          <FilterActions>
            <FilterSelect
              value={stockFilter}
              onChange={(value) => onStockFilterChange(value as 'all' | 'low' | 'out' | 'ok')}
              options={[
                { value: 'all', label: 'Todo el stock' },
                { value: 'ok', label: 'Stock OK' },
                { value: 'low', label: 'Stock bajo' },
                { value: 'out', label: 'Sin stock' },
              ]}
              label="Estado de stock"
              placeholder="Estado de stock"
              sheetTitle="Estado de stock"
            />
            <FilterSelect
              value={categoryFilter}
              onChange={onCategoryFilterChange}
              options={[
                { value: '', label: 'Todas las categorias' },
                ...categories.map((category) => ({ value: String(category.id), label: category.name })),
              ]}
              label="Categoria"
              placeholder="Categoria"
              sheetTitle="Categoria"
            />
            {hasSecondaryFilters ? (
              <Button
                variant="ghost"
                onClick={() => {
                  onStockFilterChange('all');
                  onCategoryFilterChange('');
                }}
                className="w-full text-red-500 hover:text-red-600 lg:w-auto"
              >
                <X className="h-4 w-4" />
                Limpiar
              </Button>
            ) : null}
          </FilterActions>
        </FilterPanel>
      ) : undefined}
    />
  );
};
