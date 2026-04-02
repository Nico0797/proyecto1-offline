import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRightLeft, Calculator, Delete, Divide, Equal, Minus, Package2, Percent, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { useAccess } from '../hooks/useAccess';
import { costCalculatorService, CostCalculatorSavePayload, CostCalculatorSimulationPayload } from '../services/costCalculatorService';
import { recipesService } from '../services/recipesService';
import { useBusinessStore } from '../store/businessStore';
import { CostCalculatorSimulation, Product, RawMaterial, Recipe } from '../types';
import { cn } from '../utils/cn';

interface CalculatorItemForm {
  raw_material_id: number;
  quantity_required: string;
  manual_cost_override: string;
  notes: string;
}

const emptyItem = (): CalculatorItemForm => ({
  raw_material_id: 0,
  quantity_required: '',
  manual_cost_override: '',
  notes: '',
});

const formatCurrency = (value?: number | null, currency = 'COP') => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

const getStatusTone = (status?: string) => {
  if (status === 'complete') {
    return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300';
  }
  if (status === 'missing_cost') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300';
};

const parseOptionalNumber = (value: string) => {
  const normalized = String(value || '').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const calculatorButtonBase = 'h-14 rounded-2xl border text-base font-semibold transition-all active:scale-[0.98]';

const evaluateCalculatorExpression = (expression: string) => {
  const normalized = String(expression || '')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/\s+/g, '');

  if (!normalized) {
    throw new Error('Escribe una operación para calcular');
  }

  if (!/^[0-9+\-*/().]+$/.test(normalized)) {
    throw new Error('La operación contiene caracteres no permitidos');
  }

  const result = Function(`"use strict"; return (${normalized});`)();
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('No fue posible calcular ese resultado');
  }

  return Number(result.toFixed(4));
};

const formatCalculatorDisplay = (expression: string) => {
  if (!expression.trim()) return '0';
  return expression.replace(/\*/g, '×').replace(/\//g, '÷');
};

const applyPercentToExpression = (expression: string) => {
  const trimmed = String(expression || '').trim();
  if (!trimmed) return trimmed;
  const match = trimmed.match(/(\d+(\.\d+)?)$/);
  if (!match) return trimmed;
  const lastNumber = match[1];
  const percentValue = Number(lastNumber) / 100;
  return `${trimmed.slice(0, -lastNumber.length)}${percentValue}`;
};

export const CostCalculator = () => {
  const navigate = useNavigate();
  const { activeBusiness } = useBusinessStore();
  const { hasModule, hasPermission } = useAccess();

  const canRead = hasModule('raw_inventory') && hasPermission('recipes.read');
  const canSaveRecipe = hasModule('raw_inventory') && hasPermission('recipes.create');
  const canUpdateRecipe = hasModule('raw_inventory') && hasPermission('recipes.update');
  const canUpdateProduct = hasModule('products') && hasPermission('products.update');

  const [products, setProducts] = useState<Product[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loadingReferences, setLoadingReferences] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [productId, setProductId] = useState('');
  const [productName, setProductName] = useState('');
  const [quantityBase, setQuantityBase] = useState('1');
  const [items, setItems] = useState<CalculatorItemForm[]>([emptyItem()]);
  const [packagingCost, setPackagingCost] = useState('');
  const [laborCost, setLaborCost] = useState('');
  const [overheadCost, setOverheadCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [targetMarginPercent, setTargetMarginPercent] = useState('');
  const [targetSalePrice, setTargetSalePrice] = useState('');

  const [simulation, setSimulation] = useState<CostCalculatorSimulation | null>(null);
  const [manualCalculatorIndex, setManualCalculatorIndex] = useState<number | null>(null);
  const [calculatorExpression, setCalculatorExpression] = useState('');

  const [saveMode, setSaveMode] = useState<'create' | 'update_existing' | 'create_new_version'>('create');
  const [recipeId, setRecipeId] = useState('');
  const [recipeName, setRecipeName] = useState('');
  const [recipeNotes, setRecipeNotes] = useState('');
  const [deactivateExistingRecipe, setDeactivateExistingRecipe] = useState(false);
  const [updateProductCost, setUpdateProductCost] = useState(false);
  const [updateProductSalePrice, setUpdateProductSalePrice] = useState(false);

  useEffect(() => {
    if (!activeBusiness || !canRead) return;
    setLoadingReferences(true);
    Promise.all([
      recipesService.getReferences(activeBusiness.id),
      recipesService.list(activeBusiness.id, { include_inactive: true }),
    ])
      .then(([references, recipeList]) => {
        setProducts(references.products || []);
        setRawMaterials(references.raw_materials || []);
        setRecipes(recipeList || []);
      })
      .catch((error: any) => {
        toast.error(error?.response?.data?.error || 'No fue posible cargar la calculadora de costos');
      })
      .finally(() => setLoadingReferences(false));
  }, [activeBusiness, canRead]);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === Number(productId)),
    [products, productId]
  );

  const filteredRecipes = useMemo(() => {
    if (!productId) return recipes;
    return recipes.filter((recipe) => recipe.product_id === Number(productId));
  }, [recipes, productId]);

  const selectedRecipe = useMemo(
    () => filteredRecipes.find((recipe) => recipe.id === Number(recipeId)),
    [filteredRecipes, recipeId]
  );

  useEffect(() => {
    if (selectedProduct) {
      setProductName(selectedProduct.name);
      if (!recipeName.trim()) {
        setRecipeName(selectedProduct.name);
      }
      return;
    }
    if (!productId && !recipeName.trim()) {
      setRecipeName(productName.trim());
    }
  }, [selectedProduct, productId, productName, recipeName]);

  const summaryCurrency = activeBusiness?.currency || 'COP';

  const buildSimulationPayload = (): CostCalculatorSimulationPayload => {
    return {
      product_id: productId ? Number(productId) : undefined,
      product_name: productId ? undefined : (productName.trim() || undefined),
      quantity_base: Number(quantityBase || 1),
      items: items
        .filter((item) => item.raw_material_id)
        .map((item, index) => ({
          raw_material_id: Number(item.raw_material_id),
          quantity_required: Number(item.quantity_required || 0),
          manual_cost_override: parseOptionalNumber(item.manual_cost_override) ?? null,
          notes: item.notes.trim() || undefined,
          sort_order: index,
        })),
      packaging_cost: parseOptionalNumber(packagingCost) ?? 0,
      labor_cost: parseOptionalNumber(laborCost) ?? 0,
      overhead_cost: parseOptionalNumber(overheadCost) ?? 0,
      other_cost: parseOptionalNumber(otherCost) ?? 0,
      target_margin_percent: parseOptionalNumber(targetMarginPercent),
      target_sale_price: parseOptionalNumber(targetSalePrice),
    };
  };

  const handleAddItem = () => {
    setItems((current) => [...current, emptyItem()]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  };

  const handleUpdateItem = (index: number, patch: Partial<CalculatorItemForm>) => {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  };

  const handleOpenManualCalculator = (index: number) => {
    setManualCalculatorIndex(index);
    setCalculatorExpression(items[index]?.manual_cost_override?.trim() || '');
  };

  const handleCloseManualCalculator = () => {
    setManualCalculatorIndex(null);
    setCalculatorExpression('');
  };

  const handleAppendCalculatorValue = (value: string) => {
    setCalculatorExpression((current) => `${current}${value}`);
  };

  const handleBackspaceCalculator = () => {
    setCalculatorExpression((current) => current.slice(0, -1));
  };

  const handleClearCalculator = () => {
    setCalculatorExpression('');
  };

  const handleEvaluateCalculator = () => {
    try {
      const result = evaluateCalculatorExpression(calculatorExpression);
      setCalculatorExpression(String(result));
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible calcular la operación');
    }
  };

  const handleApplyCalculatorResult = () => {
    if (manualCalculatorIndex === null) return;
    try {
      const result = evaluateCalculatorExpression(calculatorExpression || '0');
      if (result < 0) {
        toast.error('El costo manual no puede ser negativo');
        return;
      }
      handleUpdateItem(manualCalculatorIndex, { manual_cost_override: String(result) });
      handleCloseManualCalculator();
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible aplicar el resultado');
    }
  };

  const calculatorMaterial = manualCalculatorIndex !== null ? rawMaterials.find((material) => material.id === Number(items[manualCalculatorIndex]?.raw_material_id)) : null;

  const handleSimulate = async () => {
    if (!activeBusiness) return;
    setCalculating(true);
    try {
      const result = await costCalculatorService.simulate(activeBusiness.id, buildSimulationPayload());
      setSimulation(result);
      if (result.product_name && !recipeName.trim()) {
        setRecipeName(result.product_name);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible calcular el costeo');
    } finally {
      setCalculating(false);
    }
  };

  const handleSave = async () => {
    if (!activeBusiness || !simulation) return;
    const payload: CostCalculatorSavePayload = {
      ...buildSimulationPayload(),
      save_mode: saveMode,
      recipe_id: recipeId ? Number(recipeId) : undefined,
      recipe_name: recipeName.trim() || (selectedProduct?.name || productName.trim() || undefined),
      recipe_notes: recipeNotes.trim() || undefined,
      deactivate_existing_recipe: deactivateExistingRecipe,
      update_product_cost: updateProductCost,
      update_product_sale_price: updateProductSalePrice,
    };

    setSaving(true);
    try {
      const response = await costCalculatorService.saveAsRecipe(activeBusiness.id, payload);
      toast.success(response.recipe ? 'Costeo guardado correctamente' : 'Cambios aplicados correctamente');
      if (response.recipe_scope_message) {
        toast(response.recipe_scope_message, { icon: 'ℹ️' });
      }
      if (response.recipe) {
        setRecipeId(String(response.recipe.id));
        if (!filteredRecipes.some((recipe) => recipe.id === response.recipe?.id)) {
          setRecipes((current) => [response.recipe as Recipe, ...current]);
        } else {
          setRecipes((current) => current.map((recipe) => (recipe.id === response.recipe?.id ? response.recipe as Recipe : recipe)));
        }
      }
      setSimulation(response.simulation);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'No fue posible guardar este costeo');
    } finally {
      setSaving(false);
    }
  };

  if (!canRead) {
    return (
      <div className="px-6 py-8">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
          No tienes acceso a esta herramienta.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-4 sm:px-6 lg:px-8 py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Calculadora de costos</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Simula el costo de un producto sin mover stock, sin crear ventas y sin tocar el historial.
          </p>
        </div>
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-300">
          Herramienta segura de simulación. El guardado como receta o producto siempre es explícito.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <Package2 className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Qué quieres costear</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Producto existente</label>
                <select
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                  value={productId}
                  onChange={(event) => setProductId(event.target.value)}
                  disabled={loadingReferences}
                >
                  <option value="">Costear sin producto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                label="Nombre de referencia"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Ej. Lasaña personal"
                disabled={!!productId}
              />

              <Input
                label="Cantidad base producida"
                type="number"
                min="0.0001"
                step="0.0001"
                value={quantityBase}
                onChange={(event) => setQuantityBase(event.target.value)}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Materias primas</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">El costo base se toma de la última compra confirmada o del costo referencial actual.</p>
              </div>
              <Button variant="secondary" onClick={handleAddItem} disabled={rawMaterials.length === 0}>
                <Plus className="h-4 w-4" /> Agregar
              </Button>
            </div>

            <div className="space-y-4">
              {rawMaterials.length === 0 ? (
                <TeachingEmptyState
                  compact
                  icon={Package2}
                  title="Aún no hay materias primas para costear"
                  description="Carga primero tus insumos en bodega con costo base o compras confirmadas para simular costos confiables."
                  primaryActionLabel="Ir a bodega"
                  onPrimaryAction={() => navigate('/raw-inventory')}
                />
              ) : items.map((item, index) => {
                const selectedMaterial = rawMaterials.find((material) => material.id === Number(item.raw_material_id));
                return (
                  <div key={`calculator-item-${index}`} className="rounded-xl border border-gray-200 p-4 dark:border-gray-800">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.45fr_120px_220px_auto]">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Materia prima</label>
                        <select
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                          value={item.raw_material_id || ''}
                          onChange={(event) => handleUpdateItem(index, { raw_material_id: Number(event.target.value) })}
                        >
                          <option value="">Selecciona una materia prima</option>
                          {rawMaterials.map((material) => (
                            <option key={material.id} value={material.id}>
                              {material.name} ({material.unit})
                            </option>
                          ))}
                        </select>
                      </div>

                      <Input
                        label="Cantidad"
                        type="number"
                        min="0.0001"
                        step="0.0001"
                        value={item.quantity_required}
                        onChange={(event) => handleUpdateItem(index, { quantity_required: event.target.value })}
                      />

                      <div className="space-y-2">
                        <Input
                          label="Costo manual"
                          type="number"
                          min="0"
                          step="0.0001"
                          value={item.manual_cost_override}
                          onChange={(event) => handleUpdateItem(index, { manual_cost_override: event.target.value })}
                          placeholder="Opcional"
                        />
                        <Button variant="secondary" type="button" className="w-full justify-center" onClick={() => handleOpenManualCalculator(index)}>
                          <Calculator className="h-4 w-4" /> Abrir calculadora
                        </Button>
                      </div>

                      <div className="flex items-end">
                        <Button variant="secondary" disabled={items.length === 1} onClick={() => handleRemoveItem(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {selectedMaterial
                          ? `Costo referencial actual: ${formatCurrency(selectedMaterial.reference_cost, summaryCurrency)}`
                          : 'Selecciona una materia prima para ver su referencia'}
                      </div>
                      <Input
                        label="Nota opcional"
                        value={item.notes}
                        onChange={(event) => handleUpdateItem(index, { notes: event.target.value })}
                        placeholder="Ej. Merma incluida"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <ArrowRightLeft className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Costos extra y precio deseado</h2>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              <Input label="Empaque" type="number" min="0" step="0.01" value={packagingCost} onChange={(event) => setPackagingCost(event.target.value)} />
              <Input label="Mano de obra" type="number" min="0" step="0.01" value={laborCost} onChange={(event) => setLaborCost(event.target.value)} />
              <Input label="Costos indirectos" type="number" min="0" step="0.01" value={overheadCost} onChange={(event) => setOverheadCost(event.target.value)} />
              <Input label="Otros costos" type="number" min="0" step="0.01" value={otherCost} onChange={(event) => setOtherCost(event.target.value)} />
              <Input label="Margen deseado %" type="number" min="0" max="99.99" step="0.01" value={targetMarginPercent} onChange={(event) => setTargetMarginPercent(event.target.value)} />
              <Input label="Precio de venta deseado" type="number" min="0" step="0.01" value={targetSalePrice} onChange={(event) => setTargetSalePrice(event.target.value)} />
            </div>

            <div className="mt-5 flex flex-wrap gap-3">
              <Button onClick={handleSimulate} isLoading={calculating}>
                <Calculator className="h-4 w-4" /> Calcular costo
              </Button>
              <Button variant="secondary" onClick={() => setSimulation(null)}>
                Limpiar resultado
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-emerald-600" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Resultado</h2>
            </div>

            {!simulation ? (
              <div className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                Completa los datos y calcula para ver el costo total, el costo por unidad y el precio sugerido.
              </div>
            ) : (
              <div className="space-y-4">
                <div className={cn('rounded-xl border px-4 py-3 text-sm', getStatusTone(simulation.cost_status))}>
                  <div className="font-semibold">{simulation.cost_status_label || 'Sin estado'}</div>
                  <div className="mt-1">{simulation.cost_status_message}</div>
                  {simulation.missing_cost_items_count > 0 ? (
                    <div className="mt-1">Faltan costos base en {simulation.missing_cost_items_count} materia prima(s).</div>
                  ) : null}
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
                    <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Costo total estimable</div>
                    <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{simulation.total_cost !== null && simulation.total_cost !== undefined ? formatCurrency(simulation.total_cost, summaryCurrency) : 'No estimable'}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
                    <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Costo por unidad</div>
                    <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{simulation.cost_per_unit !== null && simulation.cost_per_unit !== undefined ? formatCurrency(simulation.cost_per_unit, summaryCurrency) : 'No estimable'}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
                    <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Costo parcial disponible</div>
                    <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{simulation.partial_total_cost !== null && simulation.partial_total_cost !== undefined && !simulation.is_cost_complete ? formatCurrency(simulation.partial_total_cost, summaryCurrency) : '—'}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
                    <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Precio sugerido</div>
                    <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{simulation.suggested_sale_price !== null && simulation.suggested_sale_price !== undefined ? formatCurrency(simulation.suggested_sale_price, summaryCurrency) : '—'}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
                    <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Utilidad estimada</div>
                    <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{simulation.estimated_profit_amount !== null && simulation.estimated_profit_amount !== undefined ? formatCurrency(simulation.estimated_profit_amount, summaryCurrency) : '—'}</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/40">
                    <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Margen bruto %</div>
                    <div className="mt-2 text-lg font-bold text-gray-900 dark:text-white">{simulation.estimated_margin_percent !== null && simulation.estimated_margin_percent !== undefined ? `${simulation.estimated_margin_percent}%` : '—'}</div>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-500 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Materia prima</th>
                        <th className="px-4 py-3 text-right">Costo base</th>
                        <th className="px-4 py-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                      {simulation.items.map((item) => (
                        <tr key={item.raw_material_id}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">{item.raw_material_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{item.quantity_required} {item.raw_material_unit || 'und'} • {item.cost_source_label || item.cost_source}</div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{item.cost_base !== null && item.cost_base !== undefined ? formatCurrency(item.cost_base, summaryCurrency) : 'Sin costo'}</td>
                          <td className="px-4 py-3 text-right text-gray-900 dark:text-white">{item.line_cost !== null && item.line_cost !== undefined ? formatCurrency(item.line_cost, summaryCurrency) : 'Incompleto'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:border-gray-800 dark:bg-gray-800/40 dark:text-gray-300">
                  <div>Materias primas: <span className="font-semibold text-gray-900 dark:text-white">{simulation.materials_subtotal !== null && simulation.materials_subtotal !== undefined ? formatCurrency(simulation.materials_subtotal, summaryCurrency) : 'No estimable'}</span></div>
                  <div>Extras manuales: <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(simulation.extras_subtotal, summaryCurrency)}</span></div>
                  <div>Precio mínimo para no perder: <span className="font-semibold text-gray-900 dark:text-white">{simulation.minimum_sale_price !== null && simulation.minimum_sale_price !== undefined ? formatCurrency(simulation.minimum_sale_price, summaryCurrency) : 'No estimable'}</span></div>
                </div>
              </div>
            )}
          </div>

          {simulation && canSaveRecipe ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-center gap-2 mb-4">
                <Save className="h-5 w-5 text-blue-600" />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Acción opcional</h2>
              </div>

              {!productId ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300">
                  Para guardar como receta o aplicar al catálogo debes seleccionar un producto existente.
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Qué quieres hacer</label>
                    <div className="grid gap-2">
                      <label className="flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-3 text-sm dark:border-gray-800">
                        <input type="radio" checked={saveMode === 'create'} onChange={() => setSaveMode('create')} />
                        <span><span className="font-medium text-gray-900 dark:text-white">Crear receta nueva</span><span className="block text-gray-500 dark:text-gray-400">Útil para arrancar una fórmula sin tocar recetas previas.</span></span>
                      </label>
                      {canUpdateRecipe && (
                        <label className="flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-3 text-sm dark:border-gray-800">
                          <input type="radio" checked={saveMode === 'update_existing'} onChange={() => setSaveMode('update_existing')} />
                          <span><span className="font-medium text-gray-900 dark:text-white">Actualizar receta existente</span><span className="block text-gray-500 dark:text-gray-400">Solo aplica si la receta no tiene historial de consumos.</span></span>
                        </label>
                      )}
                      <label className="flex items-start gap-3 rounded-xl border border-gray-200 px-3 py-3 text-sm dark:border-gray-800">
                        <input type="radio" checked={saveMode === 'create_new_version'} onChange={() => setSaveMode('create_new_version')} />
                        <span><span className="font-medium text-gray-900 dark:text-white">Crear nueva versión segura</span><span className="block text-gray-500 dark:text-gray-400">Mantiene intacta la receta anterior y crea una nueva versión.</span></span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <Input label="Nombre de la receta" value={recipeName} onChange={(event) => setRecipeName(event.target.value)} />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receta existente</label>
                      <select
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                        value={recipeId}
                        onChange={(event) => setRecipeId(event.target.value)}
                        disabled={saveMode === 'create'}
                      >
                        <option value="">Selecciona una receta</option>
                        {filteredRecipes.map((recipe) => (
                          <option key={recipe.id} value={recipe.id}>
                            {recipe.name}{recipe.consumptions_count ? ` • ${recipe.consumptions_count} consumo(s)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas opcionales</label>
                    <textarea
                      className="min-h-[90px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                      value={recipeNotes}
                      onChange={(event) => setRecipeNotes(event.target.value)}
                      placeholder="Si quieres dejar contexto para tu equipo, escríbelo aquí"
                    />
                  </div>

                  {selectedRecipe && Number(selectedRecipe.consumptions_count || 0) > 0 && saveMode === 'update_existing' ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300">
                      Esta receta ya tiene historial. Para no romper el histórico, usa “Crear nueva versión segura”.
                    </div>
                  ) : null}

                  {saveMode === 'create_new_version' && selectedRecipe ? (
                    <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                      <input type="checkbox" checked={deactivateExistingRecipe} onChange={(event) => setDeactivateExistingRecipe(event.target.checked)} />
                      Desactivar la receta anterior al crear la nueva versión
                    </label>
                  ) : null}

                  {canUpdateProduct ? (
                    <div className="rounded-xl border border-gray-200 px-4 py-3 dark:border-gray-800">
                      <div className="text-sm font-medium text-gray-900 dark:text-white mb-2">Aplicar al producto</div>
                      <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={updateProductCost} onChange={(event) => setUpdateProductCost(event.target.checked)} />
                          Actualizar costo referencial del producto con el costo por unidad calculado
                        </label>
                        <label className="flex items-center gap-2">
                          <input type="checkbox" checked={updateProductSalePrice} onChange={(event) => setUpdateProductSalePrice(event.target.checked)} />
                          Actualizar precio de venta del producto con el precio sugerido o el precio deseado
                        </label>
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/10 dark:text-blue-300">
                    Guardar como receta solo lleva las materias primas. Empaque, mano de obra y otros extras quedan como parte de la simulación.
                  </div>

                  <Button onClick={handleSave} isLoading={saving}>
                    <Save className="h-4 w-4" /> Guardar resultado
                  </Button>
                </div>
              )}
            </div>
          ) : null}

          {loadingReferences ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              Cargando referencias…
            </div>
          ) : null}

          {!simulation && !loadingReferences ? (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-500" />
                <span>Esta calculadora no mueve stock, no crea ventas y no recalcula historial. Sirve solo para simular y decidir mejor.</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <Modal
        isOpen={manualCalculatorIndex !== null}
        onClose={handleCloseManualCalculator}
        title="Calculadora rápida"
        maxWidth="max-w-md"
      >
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-100 via-white to-slate-100 p-5 text-slate-900 shadow-xl dark:border-slate-700 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 dark:text-white">
            <div className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-300">Costo manual</div>
            <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              {calculatorMaterial ? calculatorMaterial.name : 'Operación rápida para este insumo'}
            </div>
            <div className="mt-5 min-h-[72px] rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-right shadow-inner dark:border-white/10 dark:bg-white/5">
              <div className="text-xs text-slate-400">Operación</div>
              <div className="mt-1 break-all text-3xl font-semibold tracking-tight">{formatCalculatorDisplay(calculatorExpression)}</div>
            </div>
            <div className="mt-3 text-right text-xs text-slate-500 dark:text-slate-400">
              Resultado actual:{' '}
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {(() => {
                  try {
                    return formatCurrency(evaluateCalculatorExpression(calculatorExpression || '0'), summaryCurrency);
                  } catch {
                    return '—';
                  }
                })()}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <button type="button" className={cn(calculatorButtonBase, 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-900/10 dark:text-rose-300')} onClick={handleClearCalculator}>AC</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200')} onClick={handleBackspaceCalculator}><Delete className="mx-auto h-4 w-4" /></button>
            <button type="button" className={cn(calculatorButtonBase, 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-900/10 dark:text-indigo-300')} onClick={() => setCalculatorExpression((current) => applyPercentToExpression(current))}><Percent className="mx-auto h-4 w-4" /></button>
            <button type="button" className={cn(calculatorButtonBase, 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300')} onClick={() => handleAppendCalculatorValue('/')}><Divide className="mx-auto h-4 w-4" /></button>

            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('7')}>7</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('8')}>8</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('9')}>9</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300')} onClick={() => handleAppendCalculatorValue('*')}><X className="mx-auto h-4 w-4" /></button>

            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('4')}>4</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('5')}>5</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('6')}>6</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300')} onClick={() => handleAppendCalculatorValue('-')}><Minus className="mx-auto h-4 w-4" /></button>

            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('1')}>1</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('2')}>2</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('3')}>3</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300')} onClick={() => handleAppendCalculatorValue('+')}><Plus className="mx-auto h-4 w-4" /></button>

            <button type="button" className={cn(calculatorButtonBase, 'col-span-2 border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('0')}>0</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100')} onClick={() => handleAppendCalculatorValue('.')}>.</button>
            <button type="button" className={cn(calculatorButtonBase, 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/10 dark:text-emerald-300')} onClick={handleEvaluateCalculator}><Equal className="mx-auto h-4 w-4" /></button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={handleCloseManualCalculator}>
              Cancelar
            </Button>
            <Button onClick={handleApplyCalculatorResult}>
              Aplicar resultado
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
