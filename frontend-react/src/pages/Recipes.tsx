import { useEffect, useMemo, useState } from 'react';
import { Archive, Eye, FlaskConical, Pencil, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { PageBody, PageHeader, PageLayout } from '../components/Layout/PageLayout';
import { useAccess } from '../hooks/useAccess';
import { recipesService } from '../services/recipesService';
import { useBusinessStore } from '../store/businessStore';
import { useRecipesStore } from '../store/recipesStore';
import { Recipe, RecipeConsumption, RecipeCosting, RecipeItem } from '../types';
import { cn } from '../utils/cn';

const formatCurrency = (value?: number | null, currency = 'COP') => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

const getCostStatusTone = (status?: string) => {
  if (status === 'complete') {
    return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300';
  }
  if (status === 'missing_cost') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300';
};

const emptyItem = (sortOrder = 0): RecipeItem => ({
  raw_material_id: 0,
  quantity_required: 0,
  notes: '',
  sort_order: sortOrder,
});

export const Recipes = () => {
  const { activeBusiness } = useBusinessStore();
  const { hasModule, hasPermission } = useAccess();
  const {
    recipes,
    references,
    selectedRecipe,
    recipeConsumptions,
    selectedConsumption,
    loading,
    saving,
    error,
    fetchReferences,
    fetchRecipes,
    fetchRecipeDetail,
    saveRecipe,
    deactivateRecipe,
    consumeRecipe,
    fetchRecipeConsumptions,
    fetchConsumption,
    setSelectedRecipe,
    setSelectedConsumption,
  } = useRecipesStore();

  const canRead = hasModule('raw_inventory') && hasPermission('recipes.read');
  const canCreate = hasModule('raw_inventory') && hasPermission('recipes.create');
  const canUpdate = hasModule('raw_inventory') && hasPermission('recipes.update');
  const canDelete = hasModule('raw_inventory') && hasPermission('recipes.delete');
  const canConsume = hasModule('raw_inventory') && hasPermission('recipes.consume');

  const [searchTerm, setSearchTerm] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isConsumeOpen, setIsConsumeOpen] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState<number | null>(null);
  const [formProductId, setFormProductId] = useState('');
  const [formName, setFormName] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formItems, setFormItems] = useState<RecipeItem[]>([emptyItem(0)]);
  const [consumeQuantity, setConsumeQuantity] = useState('1');
  const [consumeNotes, setConsumeNotes] = useState('');
  const [recipeCosting, setRecipeCosting] = useState<RecipeCosting | null>(null);
  const [recipeCostingLoading, setRecipeCostingLoading] = useState(false);

  useEffect(() => {
    if (!activeBusiness || !canRead) return;
    fetchReferences(activeBusiness.id);
  }, [activeBusiness, canRead]);

  useEffect(() => {
    if (!activeBusiness || !canRead) return;
    fetchRecipes(activeBusiness.id, {
      search: searchTerm || undefined,
      product_id: selectedProductId === 'all' ? undefined : Number(selectedProductId),
      include_inactive: includeInactive,
    });
  }, [activeBusiness, canRead, searchTerm, selectedProductId, includeInactive]);

  const products = references.products || [];
  const rawMaterials = references.raw_materials || [];
  const consumptionPreviewQuantity = Number(consumeQuantity || 0);
  const consumptionPreview = useMemo(() => {
    if (!selectedRecipe || Number.isNaN(consumptionPreviewQuantity) || consumptionPreviewQuantity <= 0) return [];
    return selectedRecipe.items.map((item) => ({
      ...item,
      quantity_consumed: Number((Number(item.quantity_required || 0) * consumptionPreviewQuantity).toFixed(4)),
    }));
  }, [selectedRecipe, consumptionPreviewQuantity]);

  const formTheoreticalCost = useMemo(() => {
    return formItems.reduce((total, item) => {
      const material = rawMaterials.find((entry) => entry.id === Number(item.raw_material_id));
      return total + (Number(item.quantity_required || 0) * Number(material?.reference_cost || 0));
    }, 0);
  }, [formItems, rawMaterials]);

  const recipeHasHistory = !!selectedRecipe && Number(selectedRecipe.consumptions_count || 0) > 0;
  const isConsumeQuantityInvalid = Number.isNaN(consumptionPreviewQuantity) || consumptionPreviewQuantity <= 0;
  const isConsumeDisabled = saving || !selectedRecipe || !selectedRecipe.is_active || isConsumeQuantityInvalid;

  const resetForm = () => {
    setEditingRecipeId(null);
    setSelectedRecipe(null);
    setFormProductId('');
    setFormName('');
    setFormNotes('');
    setFormIsActive(true);
    setFormItems([emptyItem(0)]);
  };

  const openCreate = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const openEdit = async (recipe: Recipe) => {
    if (!activeBusiness) return;
    const detail = await fetchRecipeDetail(activeBusiness.id, recipe.id);
    if (!detail) return;
    setEditingRecipeId(detail.id);
    setSelectedRecipe(detail);
    setFormProductId(String(detail.product_id));
    setFormName(detail.name);
    setFormNotes(detail.notes || '');
    setFormIsActive(detail.is_active);
    setFormItems(detail.items.length > 0 ? detail.items.map((item, index) => ({ ...item, sort_order: index })) : [emptyItem(0)]);
    setIsFormOpen(true);
  };

  const openDetails = async (recipe: Recipe) => {
    if (!activeBusiness) return;
    const detail = await fetchRecipeDetail(activeBusiness.id, recipe.id);
    if (!detail) return;
    await fetchRecipeConsumptions(activeBusiness.id, recipe.id);
    setRecipeCostingLoading(true);
    try {
      const costing = await recipesService.getCosting(activeBusiness.id, recipe.id);
      setRecipeCosting(costing);
    } catch (err: any) {
      setRecipeCosting(null);
      toast.error(err?.response?.data?.error || 'No fue posible cargar el costeo de la receta');
    } finally {
      setRecipeCostingLoading(false);
    }
    setSelectedRecipe(detail);
    setSelectedConsumption(null);
    setConsumeQuantity('1');
    setConsumeNotes('');
    setIsDetailOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    resetForm();
  };

  const closeDetails = () => {
    setIsDetailOpen(false);
    setSelectedRecipe(null);
    setSelectedConsumption(null);
    setRecipeCosting(null);
    setRecipeCostingLoading(false);
    setIsConsumeOpen(false);
    setConsumeQuantity('1');
    setConsumeNotes('');
  };

  const updateItem = (index: number, patch: Partial<RecipeItem>) => {
    setFormItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  };

  const addItem = () => {
    setFormItems((current) => [...current, emptyItem(current.length)]);
  };

  const removeItem = (index: number) => {
    setFormItems((current) => current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index).map((item, itemIndex) => ({ ...item, sort_order: itemIndex })));
  };

  const handleSaveRecipe = async () => {
    if (!activeBusiness) return;
    const productId = Number(formProductId || 0);
    if (!productId) {
      toast.error('Debes seleccionar un producto');
      return;
    }
    if (!formName.trim()) {
      toast.error('Debes ingresar el nombre de la receta');
      return;
    }
    if (formItems.length === 0) {
      toast.error('Debes agregar al menos un insumo');
      return;
    }

    const shouldSendItems = !(editingRecipeId && recipeHasHistory);
    const normalizedItems = formItems.map((item, index) => ({
      raw_material_id: Number(item.raw_material_id || 0),
      quantity_required: Number(item.quantity_required || 0),
      notes: item.notes || null,
      sort_order: index,
    }));

    if (shouldSendItems) {
      if (normalizedItems.some((item) => !item.raw_material_id || item.quantity_required <= 0 || Number.isNaN(item.quantity_required))) {
        toast.error('Todos los insumos deben tener materia prima y cantidad mayor a 0');
        return;
      }

      const duplicatedIds = normalizedItems.map((item) => item.raw_material_id).filter((id, index, array) => array.indexOf(id) !== index);
      if (duplicatedIds.length > 0) {
        toast.error('No puedes repetir la misma materia prima en la receta');
        return;
      }
    }

    try {
      await saveRecipe(activeBusiness.id, {
        product_id: productId,
        name: formName.trim(),
        notes: formNotes.trim() || null,
        is_active: formIsActive,
        ...(shouldSendItems ? { items: normalizedItems } : {}),
      }, editingRecipeId || undefined);
      toast.success(editingRecipeId ? 'Receta actualizada' : 'Receta creada');
      closeForm();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible guardar la receta');
    }
  };

  const handleDeactivate = async (recipe: Recipe) => {
    if (!activeBusiness) return;
    if (!window.confirm(`¿Deseas desactivar la receta '${recipe.name}'?`)) return;
    try {
      await deactivateRecipe(activeBusiness.id, recipe.id);
      toast.success('Receta desactivada');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible desactivar la receta');
    }
  };

  const handleConsume = async () => {
    if (!activeBusiness || !selectedRecipe || saving) return;
    const quantity = Number(consumeQuantity || 0);
    if (Number.isNaN(quantity) || quantity <= 0) {
      toast.error('Debes ingresar una cantidad mayor a 0');
      return;
    }
    try {
      const consumption = await consumeRecipe(activeBusiness.id, selectedRecipe.id, {
        quantity_produced_or_sold: quantity,
        notes: consumeNotes.trim() || null,
      });
      await fetchRecipeDetail(activeBusiness.id, selectedRecipe.id);
      await fetchRecipeConsumptions(activeBusiness.id, selectedRecipe.id);
      setSelectedConsumption(consumption);
      setIsConsumeOpen(false);
      setConsumeQuantity('1');
      setConsumeNotes('');
      toast.success('Consumo registrado');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible registrar el consumo');
    }
  };

  const openConsumptionDetail = async (consumption: RecipeConsumption) => {
    if (!activeBusiness) return;
    const detail = await fetchConsumption(activeBusiness.id, consumption.id);
    if (!detail) return;
    setSelectedConsumption(detail);
  };

  const statusClass = (isActive: boolean) => isActive
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
    : 'app-chip';

  if (!canRead) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="app-surface max-w-md w-full rounded-2xl p-6 text-center">
          <Archive className="w-10 h-10 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Recetas y consumo</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No tienes acceso a esta sección.</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout>
      <PageHeader
        title="Recetas y consumo de materias primas"
        description="Define fórmulas por producto y registra consumos explícitos con trazabilidad en bodega."
        action={canCreate ? (
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" /> Nueva receta
          </Button>
        ) : undefined}
      />

      <PageBody className="space-y-6">
        <div className="app-surface space-y-3 p-4 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por receta o producto..." icon={Search} />
            <select className="app-select" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
              <option value="all">Todos los productos</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name}</option>
              ))}
            </select>
            <label className="app-muted-panel flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} />
              Incluir inactivas
            </label>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Settings2 className="w-4 h-4 mr-2" /> {loading ? 'Cargando recetas...' : `${recipes.length} receta(s)`}
            </div>
          </div>
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {recipes.length === 0 && !loading && (
            <div className="lg:col-span-2 xl:col-span-3">
              <TeachingEmptyState
                icon={FlaskConical}
                title={searchTerm || selectedProductId !== 'all' || includeInactive ? 'No hay recetas con este filtro' : 'Aún no has creado recetas'}
                description={searchTerm || selectedProductId !== 'all' || includeInactive
                  ? 'Cambia producto o filtros para revisar las fórmulas ya registradas.'
                  : 'Crea una receta para relacionar productos con insumos, costear mejor y registrar consumos con trazabilidad.'}
                primaryActionLabel={canCreate ? 'Nueva receta' : undefined}
                onPrimaryAction={canCreate ? openCreate : undefined}
                secondaryActionLabel={searchTerm || selectedProductId !== 'all' || includeInactive ? 'Limpiar filtros' : undefined}
                onSecondaryAction={searchTerm || selectedProductId !== 'all' || includeInactive ? (() => {
                  setSearchTerm('');
                  setSelectedProductId('all');
                  setIncludeInactive(false);
                }) : undefined}
              />
            </div>
          )}
          {recipes.map((recipe) => (
            <div key={recipe.id} className="app-surface space-y-4 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-white">{recipe.name}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Producto: {recipe.product_name || '—'}</p>
                </div>
                <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', statusClass(recipe.is_active))}>
                  {recipe.is_active ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="app-muted-panel p-3">
                  <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Insumos</div>
                  <div className="mt-1 font-semibold text-gray-900 dark:text-white">{recipe.items_count || 0}</div>
                </div>
                <div className="app-muted-panel p-3">
                  <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Consumos</div>
                  <div className="mt-1 font-semibold text-gray-900 dark:text-white">{recipe.consumptions_count || 0}</div>
                </div>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Consumo teórico por unidad: {formatCurrency(recipe.theoretical_total_cost, activeBusiness?.currency || 'COP')}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => openDetails(recipe)}>
                  <Eye className="w-4 h-4" />
                </Button>
                {canUpdate && (
                  <Button variant="secondary" onClick={() => openEdit(recipe)}>
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}
                {canDelete && recipe.is_active && (
                  <Button variant="secondary" onClick={() => handleDeactivate(recipe)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

      <Modal isOpen={isFormOpen} onClose={closeForm} title={editingRecipeId ? 'Editar receta' : 'Nueva receta'} className="max-w-5xl h-[90vh]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Producto</label>
              <select disabled={recipeHasHistory} className="app-select disabled:opacity-60" value={formProductId} onChange={(e) => setFormProductId(e.target.value)}>
                <option value="">Selecciona un producto</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.type})</option>
                ))}
              </select>
            </div>
            <Input label="Nombre de la receta" value={formName} onChange={(e) => setFormName(e.target.value)} />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea className="app-textarea min-h-[110px]" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} />
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input type="checkbox" checked={formIsActive} onChange={(e) => setFormIsActive(e.target.checked)} />
            Receta activa
          </label>

          {editingRecipeId && recipeHasHistory && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
              Esta receta ya tiene consumos históricos. Puedes ajustar nombre/notas/estado, pero no cambiar sus insumos. Si necesitas una nueva fórmula, desactiva esta receta y crea otra.
            </div>
          )}

          <div className="app-surface overflow-hidden rounded-[24px]">
            <div className="app-table-head px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Insumos por unidad</div>
            <div className="p-4 space-y-4">
              {formItems.map((item, index) => (
                <div key={`${index}-${item.raw_material_id}`} className="grid grid-cols-1 md:grid-cols-[1.5fr_120px_1fr_auto] gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Materia prima</label>
                    <select disabled={recipeHasHistory} className="app-select disabled:opacity-60" value={item.raw_material_id || ''} onChange={(e) => updateItem(index, { raw_material_id: Number(e.target.value) })}>
                      <option value="">Selecciona una materia prima</option>
                      {rawMaterials.map((material) => (
                        <option key={material.id} value={material.id}>{material.name} ({material.unit})</option>
                      ))}
                    </select>
                  </div>
                  <Input disabled={recipeHasHistory} label="Cantidad" type="number" min="0" step="0.0001" value={item.quantity_required || ''} onChange={(e) => updateItem(index, { quantity_required: Number(e.target.value) })} />
                  <Input disabled={recipeHasHistory} label="Notas" value={item.notes || ''} onChange={(e) => updateItem(index, { notes: e.target.value })} />
                  <Button variant="secondary" disabled={recipeHasHistory || formItems.length === 1} onClick={() => removeItem(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              <div className="app-divider flex flex-wrap items-center justify-between gap-3 border-t pt-2">
                <div className="text-sm text-gray-700 dark:text-gray-300">Costo teórico por unidad: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(formTheoreticalCost, activeBusiness?.currency || 'COP')}</span></div>
                <Button variant="secondary" disabled={recipeHasHistory} onClick={addItem}>
                  <Plus className="w-4 h-4 mr-2" /> Agregar insumo
                </Button>
              </div>
            </div>
          </div>

            <div className="app-divider flex flex-col-reverse gap-3 border-t pt-4 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={closeForm}>Cancelar</Button>
            <Button onClick={handleSaveRecipe} isLoading={saving}>{editingRecipeId ? 'Guardar cambios' : 'Crear receta'}</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isDetailOpen && !!selectedRecipe} onClose={closeDetails} title={selectedRecipe ? `Receta • ${selectedRecipe.name}` : 'Receta'} className="max-w-6xl h-[90vh]">
        {selectedRecipe && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="app-muted-panel p-4">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Producto</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{selectedRecipe.product_name || '—'}</div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Estado</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{selectedRecipe.is_active ? 'Activa' : 'Inactiva'}</div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Insumos</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{selectedRecipe.items_count || selectedRecipe.items.length}</div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Costo estimable</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {recipeCostingLoading
                    ? 'Cargando...'
                    : recipeCosting
                      ? (recipeCosting.theoretical_unit_cost !== null && recipeCosting.theoretical_unit_cost !== undefined
                        ? formatCurrency(recipeCosting.theoretical_unit_cost, activeBusiness?.currency || 'COP')
                        : 'No estimable')
                      : formatCurrency(selectedRecipe.theoretical_total_cost, activeBusiness?.currency || 'COP')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="app-surface rounded-xl p-4">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Costo estimable por unidad</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {recipeCostingLoading
                    ? 'Cargando...'
                    : recipeCosting?.theoretical_unit_cost !== null && recipeCosting?.theoretical_unit_cost !== undefined
                      ? formatCurrency(recipeCosting.theoretical_unit_cost, activeBusiness?.currency || 'COP')
                      : 'No estimable'}
                </div>
              </div>
              <div className="app-surface rounded-xl p-4">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Estado del costo</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {recipeCostingLoading ? 'Cargando...' : (recipeCosting?.cost_status_label || '—')}
                </div>
              </div>
              <div className="app-surface rounded-xl p-4">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Costo parcial disponible</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">
                  {recipeCostingLoading
                    ? 'Cargando...'
                    : recipeCosting?.partial_theoretical_total_cost !== null && recipeCosting?.partial_theoretical_total_cost !== undefined && !recipeCosting?.is_cost_complete
                      ? formatCurrency(recipeCosting.partial_theoretical_total_cost, activeBusiness?.currency || 'COP')
                      : '—'}
                </div>
              </div>
            </div>

            {recipeCosting && (
              <div className={cn(
                'rounded-lg px-3 py-2 text-sm border',
                getCostStatusTone(recipeCosting.cost_status)
              )}>
                {recipeCosting.cost_status_message || recipeCosting.cost_rule_label}
                {recipeCosting.missing_cost_items_count > 0
                  ? ` • Faltan costos base en ${recipeCosting.missing_cost_items_count} insumo(s)`
                  : ''}
              </div>
            )}

            {selectedRecipe.notes && (
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{selectedRecipe.notes}</div>
            )}

            <div className="app-surface rounded-xl overflow-hidden">
              <div className="app-table-head px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Consumo teórico por unidad</div>
              <div className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
                {(recipeCosting?.items || selectedRecipe.items).map((item: any) => (
                  <div key={item.id || item.raw_material_id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1.4fr_110px_130px_160px] gap-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.raw_material_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{item.raw_material_unit || 'und'}</div>
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">{item.quantity_required} {item.raw_material_unit || ''}</div>
                    <div className="text-gray-700 dark:text-gray-300">
                      {recipeCosting
                        ? (item.cost_base !== null && item.cost_base !== undefined
                          ? formatCurrency(item.cost_base, activeBusiness?.currency || 'COP')
                          : 'Sin costo')
                        : formatCurrency(item.reference_cost, activeBusiness?.currency || 'COP')}
                    </div>
                    <div className="text-gray-700 dark:text-gray-300">
                      {recipeCosting
                        ? (item.line_cost !== null && item.line_cost !== undefined
                          ? formatCurrency(item.line_cost, activeBusiness?.currency || 'COP')
                          : 'Incompleto')
                        : '—'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              {canConsume && selectedRecipe.is_active && (
                <Button onClick={() => setIsConsumeOpen(true)}>
                  <FlaskConical className="w-4 h-4 mr-2" /> Registrar consumo
                </Button>
              )}
              {canConsume && !selectedRecipe.is_active && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                  La receta está inactiva. Puedes revisar su historial, pero no registrar nuevos consumos.
                </div>
              )}
              {canUpdate && (
                <Button variant="secondary" onClick={() => { setIsDetailOpen(false); openEdit(selectedRecipe); }}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar receta
                </Button>
              )}
            </div>

            <div className="app-surface rounded-xl overflow-hidden">
              <div className="app-table-head px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Historial de consumos</div>
              <div className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
                {recipeConsumptions.length === 0 && (
                  <div className="px-4 py-10 text-center text-sm text-gray-500 dark:text-gray-400">
                    No hay consumos registrados todavía.
                  </div>
                )}
                {recipeConsumptions.map((consumption) => (
                  <button key={consumption.id} className="app-table-row w-full px-4 py-4 text-left" onClick={() => openConsumptionDetail(consumption)}>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{consumption.quantity_produced_or_sold} unidad(es)</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {consumption.created_at || '—'} • {consumption.created_by_name || 'Usuario'}
                          {consumption.source_type === 'sale' && consumption.related_sale_id ? ` • Venta #${consumption.related_sale_id}` : ''}
                        </div>
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {consumption.items_count || 0} salida(s) de insumo
                        {consumption.source_type === 'sale' ? ' • Automático' : ' • Manual'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedConsumption && (
              <div className="app-surface rounded-xl overflow-hidden">
                <div className="app-table-head px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Detalle de consumo</div>
                <div className="p-4 space-y-4">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedConsumption.created_at || '—'} • {selectedConsumption.created_by_name || 'Usuario'}
                    {selectedConsumption.source_type === 'sale' && selectedConsumption.related_sale_id ? ` • Venta #${selectedConsumption.related_sale_id}` : ''}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Origen: {selectedConsumption.source_type === 'sale' ? 'Venta automática' : 'Registro manual'}
                  </div>
                  {selectedConsumption.notes && <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">{selectedConsumption.notes}</div>}
                  <div className="app-surface overflow-hidden rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
                    {selectedConsumption.items.map((item) => (
                      <div key={item.id} className="px-4 py-3 grid grid-cols-1 md:grid-cols-[1.2fr_120px_120px_120px] gap-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{item.raw_material_name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Movimiento #{item.raw_material_movement_id || '—'}</div>
                        </div>
                        <div className="text-gray-700 dark:text-gray-300">Consumo: {item.quantity_consumed}</div>
                        <div className="text-gray-700 dark:text-gray-300">Antes: {item.previous_stock}</div>
                        <div className="text-gray-700 dark:text-gray-300">Después: {item.new_stock}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="app-divider flex flex-col-reverse gap-3 border-t pt-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={closeDetails}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isConsumeOpen && !!selectedRecipe} onClose={() => setIsConsumeOpen(false)} title="Registrar consumo" maxWidth="max-w-3xl">
        {selectedRecipe && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Cantidad producida / vendida" type="number" min="0" step="0.0001" value={consumeQuantity} onChange={(e) => setConsumeQuantity(e.target.value)} />
              <div className="app-muted-panel p-4">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Producto</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{selectedRecipe.product_name}</div>
              </div>
            </div>
            {!selectedRecipe.is_active && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                Esta receta está inactiva y no admite nuevos consumos.
              </div>
            )}
            {isConsumeQuantityInvalid && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                Debes ingresar una cantidad mayor a 0 para registrar el consumo.
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
              <textarea className="app-textarea min-h-[110px]" value={consumeNotes} onChange={(e) => setConsumeNotes(e.target.value)} />
            </div>
            <div className="app-surface rounded-xl overflow-hidden">
              <div className="app-table-head px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">Consumo teórico para esta operación</div>
              <div className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
                {consumptionPreview.map((item) => (
                  <div key={item.id || item.raw_material_id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{item.raw_material_name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">Por unidad: {item.quantity_required} {item.raw_material_unit || ''}</div>
                    </div>
                    <div className="font-semibold text-gray-900 dark:text-white">{item.quantity_consumed} {item.raw_material_unit || ''}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="app-divider flex flex-col-reverse gap-3 border-t pt-3 sm:flex-row sm:justify-end">
              <Button variant="secondary" onClick={() => setIsConsumeOpen(false)}>Cancelar</Button>
              <Button onClick={handleConsume} isLoading={saving} disabled={isConsumeDisabled}>Registrar consumo</Button>
            </div>
          </div>
        )}
      </Modal>
      </PageBody>
    </PageLayout>
  );
};
