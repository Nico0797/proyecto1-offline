import React, { useState, useEffect } from 'react';
import { useProductStore } from '../../store/productStore';
import { useBusinessStore } from '../../store/businessStore';
import { useAuthStore } from '../../store/authStore';
import { ProductKpiStrip } from './ProductKpiStrip';
import { ProductFilters } from './ProductFilters';
import { ProductList } from './ProductList';
import { InventoryTab } from './InventoryTab';
import { PricingToolsTab } from './PricingToolsTab';
import { ProductModal } from './ProductModal';
import { UpgradeModal } from '../ui/UpgradeModal';
import { Button } from '../ui/Button';
import { Plus, Download, Archive } from 'lucide-react';
import { Product } from '../../types';
import { getStockStatus } from './helpers';
import { useCategoryStore } from './categoryStore';
import { DateRange, getPeriodPreference } from '../../utils/dateRange.utils';
import { DataTableContainer } from '../ui/DataTableContainer';
import { FEATURES, FREE_LIMITS } from '../../auth/plan';

export const ProductCatalog: React.FC = () => {
  const { activeBusiness } = useBusinessStore();
  const { products, fetchProducts, deleteProduct, updateProduct } = useProductStore();
  const { user } = useAuthStore();
  const { getCategory } = useCategoryStore();
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'inventory' | 'pricing'>('catalog');
  const [viewMode] = useState<'list' | 'grid'>('list');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(() => getPeriodPreference('products'));
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    if (activeBusiness) {
      fetchProducts(activeBusiness.id);
    }
  }, [activeBusiness]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || 
                          (product.sku && product.sku.toLowerCase().includes(search.toLowerCase()));
    const matchesType = typeFilter === 'all' || product.type === typeFilter;
    const matchesStatus = statusFilter === 'active' ? product.active : !product.active;
    
    // Stock Filter
    let matchesStock = true;
    if (stockFilter !== 'all') {
        const status = getStockStatus(product);
        matchesStock = status === stockFilter || (stockFilter === 'out' && status === 'out_of_stock') || (stockFilter === 'low' && status === 'low_stock');
        // Helper returns 'out_of_stock' but filter value is 'out'. 'low_stock' vs 'low'.
        // Let's fix the comparison.
        if (stockFilter === 'ok') matchesStock = status === 'ok';
        if (stockFilter === 'low') matchesStock = status === 'low_stock';
        if (stockFilter === 'out') matchesStock = status === 'out_of_stock';
    }

    // Category Filter
    let matchesCategory = true;
    if (categoryFilter) {
        const cat = getCategory(product.id);
        matchesCategory = cat?.id === categoryFilter;
    }

    // Date Filter (Created At)
    let matchesDate = true;
    // Only filter if product has created_at (it should)
    if (product.created_at) {
        if (dateRange.start) {
            matchesDate = matchesDate && new Date(product.created_at) >= new Date(dateRange.start);
        }
        if (dateRange.end) {
            // End of day
            const endDate = new Date(dateRange.end);
            endDate.setHours(23, 59, 59, 999);
            matchesDate = matchesDate && new Date(product.created_at) <= endDate;
        }
    }
    
    return matchesSearch && matchesType && matchesStatus && matchesStock && matchesCategory && matchesDate;
  });

  const handleExport = () => {
    const headers = ['ID', 'Nombre', 'Tipo', 'SKU', 'Precio', 'Costo', 'Stock', 'Estado'];
    const csvContent = [
      headers.join(','),
      ...filteredProducts.map(p => [
        p.id,
        `"${p.name}"`,
        p.type,
        p.sku || '',
        p.price,
        p.cost || 0,
        p.stock,
        p.active ? 'Activo' : 'Archivado'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `productos_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleSelect = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredProducts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredProducts.map((p) => p.id));
    }
  };

  const handleDelete = async (product: Product) => {
    if (!activeBusiness) return;
    if (window.confirm(`¿Estás seguro de que deseas ${product.active ? 'archivar' : 'eliminar'} este producto?`)) {
      if (product.active) {
          await updateProduct(activeBusiness.id, product.id, { active: false });
      } else {
          // If already archived, maybe delete permanently? Or just keep it archived.
          // For now let's just assume we only archive.
          // But user asked for "Archivar/Eliminar".
          // Let's toggle active status.
          await deleteProduct(activeBusiness.id, product.id);
      }
      setSelectedIds(selectedIds.filter(id => id !== product.id));
    }
  };

  const handleBulkArchive = async () => {
    if (!activeBusiness) return;
    if (window.confirm(`¿Archivar ${selectedIds.length} productos seleccionados?`)) {
      await Promise.all(selectedIds.map(id => updateProduct(activeBusiness.id, id, { active: false })));
      setSelectedIds([]);
      fetchProducts(activeBusiness.id);
    }
  };

  const handleNewProduct = () => {
    if (user?.plan === 'free' && products.length >= FREE_LIMITS.PRODUCTS) {
      setShowUpgradeModal(true);
      return;
    }
    setEditingProduct(undefined);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6 h-full flex flex-col px-4 sm:px-6 lg:px-8 py-4">
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        feature={FEATURES.LIMIT_PRODUCTS}
      />
      {/* Header & KPIs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Productos y Servicios</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Gestiona tu catálogo, inventario y precios.</p>
        </div>
        <div className="flex gap-2">
           {/* Actions Dropdown could go here */}
           <Button variant="secondary" onClick={handleExport} data-tour="products.export">
             <Download className="w-4 h-4 mr-2" /> Exportar
           </Button>
           <Button onClick={handleNewProduct} data-tour="products.primaryAction">
             <Plus className="w-4 h-4 mr-2" /> Nuevo
           </Button>
        </div>
      </div>

      <div data-tour="products.kpis" className="flex-shrink-0">
        <ProductKpiStrip products={products} />
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700 flex-shrink-0" data-tour="products.tabs">
        <div className="flex gap-6 overflow-x-auto">
          <button
            data-tour="products.tabs.catalog"
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'catalog' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('catalog')}
          >
            Catálogo
          </button>
          <button
            data-tour="products.tabs.inventory"
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'inventory' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('inventory')}
          >
            Inventario
          </button>
          <button
            data-tour="products.tabs.pricing"
            className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'pricing' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('pricing')}
          >
            Herramientas de Precios
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 flex flex-col">
        {activeTab === 'catalog' && (
          <>
            <div className="flex-shrink-0" data-tour="products.filters">
              <ProductFilters
                search={search}
                onSearchChange={setSearch}
                typeFilter={typeFilter}
                onTypeFilterChange={setTypeFilter}
                statusFilter={statusFilter}
                onStatusFilterChange={setStatusFilter}
                stockFilter={stockFilter}
                onStockFilterChange={setStockFilter}
                categoryFilter={categoryFilter}
                onCategoryFilterChange={setCategoryFilter}
                dateRange={dateRange}
                onDateRangeChange={setDateRange}
              />
            </div>
            
            {/* Bulk Actions Bar */}
            {selectedIds.length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-center justify-between mb-4 border border-blue-100 dark:border-blue-800 animate-in fade-in slide-in-from-top-2 flex-shrink-0">
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100 ml-2">
                        {selectedIds.length} seleccionados
                    </span>
                    <div className="flex gap-2">
                        <Button size="sm" variant="secondary" onClick={handleBulkArchive} className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-red-200 dark:border-red-900/30">
                            <Archive className="w-4 h-4 mr-2" /> Archivar
                        </Button>
                    </div>
                </div>
            )}

            <div className="flex-1 min-h-0" data-tour="products.table">
            <DataTableContainer>
            <ProductList
              products={filteredProducts}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onEdit={(p) => { setEditingProduct(p); setIsModalOpen(true); }}
              onDuplicate={(p) => {
                  const duplicated = { ...p, name: `${p.name} (Copia)` } as any; 
                  setEditingProduct(undefined); // Reset ID
                  setIsModalOpen(true);
              }}
              onDelete={handleDelete}
            />
            </DataTableContainer>
            </div>
          </>
        )}

        {activeTab === 'inventory' && (
          <DataTableContainer>
          <InventoryTab products={filteredProducts} />
          </DataTableContainer>
        )}

        {activeTab === 'pricing' && (
          <PricingToolsTab 
            products={products} // Pass all products, let tab handle filtering/selection logic if needed or pass filtered
            selectedIds={selectedIds} // Pass selection from catalog if user wants to operate on selection
            onRefresh={() => activeBusiness && fetchProducts(activeBusiness.id)}
          />
        )}
      </div>

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        onSuccess={() => activeBusiness && fetchProducts(activeBusiness.id)}
      />
    </div>
  );
};
