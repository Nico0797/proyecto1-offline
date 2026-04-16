import React, { useState, useEffect } from 'react';
import { useProductStore } from '../../store/productStore';
import { useBusinessStore } from '../../store/businessStore';
import { ProductKpiStrip } from './ProductKpiStrip';
import { ProductFilters } from './ProductFilters';
import { ProductList } from './ProductList';
import { InventoryTab } from './InventoryTab';
import { AdvancedInventoryTab } from './AdvancedInventoryTab';
import { PricingToolsTab } from './PricingToolsTab';
import { CategoriesTab } from './CategoriesTab';
import { ProductModal } from './ProductModal';
import { Button } from '../ui/Button';
import { Plus, Archive, Package, ClipboardList, BarChart2, Calculator, Tags } from 'lucide-react';
import { Product } from '../../types';
import { getStockStatus } from './helpers';
import { useCategoryStore } from './categoryStore';
import { SwipePager } from '../ui/SwipePager';
import { usePermission } from '../../hooks/usePermission';
import { ContentAnchor, PageHeader, PageHeaderActionButton, PageLayout, PageNotice, PageStack, PageSummary, PageToolbarCard } from '../Layout/PageLayout';
import {
  MobileFilterDrawer,
  MobileHelpDisclosure,
  MobileSummaryDrawer,
  MobileUnifiedPageShell,
  MobileUtilityBar,
  useMobileFilterDraft,
} from '../mobile/MobileContentFirst';

export const ProductCatalog: React.FC = () => {
  const { activeBusiness } = useBusinessStore();
  const { products, fetchProducts, deleteProduct, updateProduct } = useProductStore();
  const { getCategory } = useCategoryStore();
  
  const canCreate = usePermission('products.create');
  const canUpdate = usePermission('products.edit');
  const canDelete = usePermission('products.delete');
  
  const [activeTab, setActiveTab] = useState<'catalog' | 'inventory' | 'advanced_inventory' | 'pricing' | 'categories'>('catalog');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'product' | 'service'>('all');
  const [statusFilter, setStatusFilter] = useState<'active' | 'archived'>('active');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'ok'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');
  // El filtro de periodos no es necesario en productos según solicitud
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>(undefined);

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

    return matchesSearch && matchesType && matchesStatus && matchesStock && matchesCategory;
  });


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
    if (!canDelete) return;
    
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
    if (!canCreate) return;
    setEditingProduct(undefined);
    setIsModalOpen(true);
  };

  const hasCatalogFilters =
    search.trim().length > 0 ||
    typeFilter !== 'all' ||
    statusFilter !== 'active' ||
    stockFilter !== 'all' ||
    categoryFilter !== '';
  const catalogFilterSummary = hasCatalogFilters ? 'Con filtros activos' : 'Buscar y filtrar';
  const catalogSummaryLabel = `${filteredProducts.length} elemento(s)`;
  const mobileCatalogFilters = useMobileFilterDraft({
    value: { search, typeFilter, statusFilter, stockFilter, categoryFilter },
    onApply: (nextValue) => {
      setSearch(nextValue.search);
      setTypeFilter(nextValue.typeFilter);
      setStatusFilter(nextValue.statusFilter);
      setStockFilter(nextValue.stockFilter);
      setCategoryFilter(nextValue.categoryFilter);
    },
    createEmptyValue: () => ({
      search: '',
      typeFilter: 'all' as 'all' | 'product' | 'service',
      statusFilter: 'active' as 'active' | 'archived',
      stockFilter: 'all' as 'all' | 'low' | 'out' | 'ok',
      categoryFilter: '',
    }),
  });

  return (
    <PageLayout>
      <PageHeader
        title="Productos y Servicios"
        description="Gestiona tu catálogo, inventario y precios."
        mobileFab={canCreate ? {
          label: 'Crear producto',
          icon: Plus,
          onClick: handleNewProduct,
        } : undefined}
        action={canCreate ? (
          <PageHeaderActionButton
            onClick={handleNewProduct}
            icon={Plus}
            label="Nuevo producto"
            mobileLabel="Crear"
            data-tour="products.primaryAction"
          />
        ) : undefined}
      />

      <ContentAnchor />

      <SwipePager
        activePageId={activeTab}
        onPageChange={(id) => setActiveTab(id as 'catalog'|'inventory'|'advanced_inventory'|'pricing'|'categories')}
        className="flex-1"
        contentScroll="visible"
        pages={[
          {
            id: 'catalog',
            title: 'Catálogo',
            mobileTitle: 'Catálogo',
            icon: Package,
            'data-tour': 'products.tabs.catalog',
            content: (
              <>
                <div className="hidden lg:block">
                  <PageStack>
                    <PageNotice
                      description="Mantén aquí tu catálogo activo y usa las demás pestañas para profundizar en inventario, precios y categorías."
                      dismissible
                    />
                    <PageSummary title="Resumen rápido" description="Una lectura corta antes de editar o filtrar productos.">
                      <div className="flex-shrink-0" data-tour="products.kpis">
                        <ProductKpiStrip products={products} />
                      </div>
                    </PageSummary>
                    <PageToolbarCard className="app-toolbar" data-tour="products.filters">
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
                      />
                    </PageToolbarCard>
                  </PageStack>
                </div>

                <MobileUnifiedPageShell
                  className="mt-4 lg:mt-5"
                  utilityBar={(
                    <MobileUtilityBar>
                      <MobileFilterDrawer summary={catalogFilterSummary} {...mobileCatalogFilters.sheetProps}>
                        <ProductFilters
                          search={mobileCatalogFilters.draft.search}
                          onSearchChange={(value) => mobileCatalogFilters.setDraft((current) => ({ ...current, search: value }))}
                          typeFilter={mobileCatalogFilters.draft.typeFilter}
                          onTypeFilterChange={(value) => mobileCatalogFilters.setDraft((current) => ({ ...current, typeFilter: value }))}
                          statusFilter={mobileCatalogFilters.draft.statusFilter}
                          onStatusFilterChange={(value) => mobileCatalogFilters.setDraft((current) => ({ ...current, statusFilter: value }))}
                          stockFilter={mobileCatalogFilters.draft.stockFilter}
                          onStockFilterChange={(value) => mobileCatalogFilters.setDraft((current) => ({ ...current, stockFilter: value }))}
                          categoryFilter={mobileCatalogFilters.draft.categoryFilter}
                          onCategoryFilterChange={(value) => mobileCatalogFilters.setDraft((current) => ({ ...current, categoryFilter: value }))}
                        />
                      </MobileFilterDrawer>
                      <MobileSummaryDrawer summary={catalogSummaryLabel}>
                        <ProductKpiStrip products={products} />
                      </MobileSummaryDrawer>
                      <MobileHelpDisclosure summary="Cómo usar catálogo">
                        <p className="text-sm text-gray-600 dark:text-gray-300">
                          Usa esta vista para crear, buscar y editar productos. Inventario, precios y categorías quedan como vistas separadas para no empujar el catálogo hacia abajo.
                        </p>
                      </MobileHelpDisclosure>
                    </MobileUtilityBar>
                  )}
                >
                  {selectedIds.length > 0 && (
                    <div className="mb-3 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-center justify-between border border-blue-100 dark:border-blue-800 flex-shrink-0">
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
                  <div className="min-h-0">
                    <ProductList
                      products={filteredProducts}
                      selectedIds={selectedIds}
                      onSelect={handleSelect}
                      onSelectAll={handleSelectAll}
                      onEdit={(p) => { setEditingProduct(p); setIsModalOpen(true); }}
                      onDuplicate={(p) => {
                        void p;
                        setEditingProduct(undefined);
                        setIsModalOpen(true);
                      }}
                      onDelete={handleDelete}
                      canUpdate={canUpdate}
                      canDelete={canDelete}
                    />
                  </div>
                </MobileUnifiedPageShell>
              </>
            )
          },
          {
            id: 'inventory',
            title: 'Inventario',
            mobileTitle: 'Inventario',
            icon: ClipboardList,
            'data-tour': 'products.tabs.inventory',
            content: (
              <div className="min-h-0">
                <InventoryTab products={filteredProducts} />
              </div>
            )
          },
          {
            id: 'advanced_inventory',
            title: 'Inventario Avanzado',
            mobileTitle: 'Avanzado',
            icon: BarChart2,
            'data-tour': 'products.tabs.pricing',
            content: (
              <div className="min-h-0">
                <AdvancedInventoryTab products={filteredProducts} />
              </div>
            )
          },
          {
            id: 'pricing',
            title: 'Precios',
            mobileTitle: 'Precios',
            icon: Calculator,
            'data-tour': 'products.tabs.pricing',
            content: (
              <div className="min-h-0">
                <PricingToolsTab 
                  products={products}
                  selectedIds={selectedIds}
                  onRefresh={() => activeBusiness && fetchProducts(activeBusiness.id)}
                />
              </div>
            )
          },
          {
            id: 'categories',
            title: 'Categorías',
            mobileTitle: 'Categorías',
            icon: Tags,
            content: (
              <div className="min-h-0">
                <CategoriesTab />
              </div>
            )
          }
        ]}
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        product={editingProduct}
        onSuccess={() => activeBusiness && fetchProducts(activeBusiness.id)}
        data-tour="products.modal.form"
      />
    </PageLayout>
  );
};
