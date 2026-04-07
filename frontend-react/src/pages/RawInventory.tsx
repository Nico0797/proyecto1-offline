import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, ArrowDownCircle, ArrowUpCircle, Calculator, Eye, PackagePlus, Pencil, Search, SlidersHorizontal, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { SelectField } from '../components/ui/SelectField';
import { TeachingEmptyState } from '../components/ui/TeachingEmptyState';
import { PageBody, PageHeader, PageLayout } from '../components/Layout/PageLayout';
import { useBusinessStore } from '../store/businessStore';
import { useAccess } from '../hooks/useAccess';
import { useRawInventoryStore } from '../store/rawInventoryStore';
import { RawMaterial, RawMaterialMovementType } from '../types';
import { cn } from '../utils/cn';

const MOVEMENT_LABELS: Record<RawMaterialMovementType, string> = {
  in: 'Entrada',
  out: 'Salida',
  adjustment: 'Ajuste',
};

const movementBadgeClass = (movementType: RawMaterialMovementType) => {
  if (movementType === 'in') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
  if (movementType === 'out') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
};

const stockBadgeClass = (material: RawMaterial) => {
  if (material.current_stock <= 0) return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
  if (material.is_below_minimum) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
  return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300';
};

const formatNumber = (value: number) => {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: numeric % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(numeric);
};

const formatCurrency = (value?: number | null, currency = 'COP') => {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
};

const toInputNumber = (value?: number | null) => (value ?? 0).toString();

type RawMaterialCalculatorUnit = 'g' | 'kg' | 'ml' | 'l' | 'lb' | 'oz' | 'und';
type RawMaterialUnitFamily = 'mass' | 'volume' | 'count';

const RAW_MATERIAL_CALCULATOR_UNITS: Array<{
  value: RawMaterialCalculatorUnit;
  label: string;
  family: RawMaterialUnitFamily;
  factorToBase: number;
  baseLabel: string;
}> = [
  { value: 'g', label: 'Gramos (g)', family: 'mass', factorToBase: 1, baseLabel: 'g' },
  { value: 'kg', label: 'Kilogramos (kg)', family: 'mass', factorToBase: 1000, baseLabel: 'g' },
  { value: 'lb', label: 'Libras (lb)', family: 'mass', factorToBase: 453.592, baseLabel: 'g' },
  { value: 'oz', label: 'Onzas (oz)', family: 'mass', factorToBase: 28.3495, baseLabel: 'g' },
  { value: 'ml', label: 'Mililitros (ml)', family: 'volume', factorToBase: 1, baseLabel: 'ml' },
  { value: 'l', label: 'Litros (l)', family: 'volume', factorToBase: 1000, baseLabel: 'ml' },
  { value: 'und', label: 'Unidad', family: 'count', factorToBase: 1, baseLabel: 'unidad' },
];

const RAW_MATERIAL_UNIT_OPTIONS = [
  { value: 'und', label: 'Unidad (und)' },
  { value: 'g', label: 'Gramos (g)' },
  { value: 'kg', label: 'Kilogramos (kg)' },
  { value: 'ml', label: 'Mililitros (ml)' },
  { value: 'l', label: 'Litros (l)' },
  { value: 'lb', label: 'Libras (lb)' },
  { value: 'oz', label: 'Onzas (oz)' },
  { value: 'paq', label: 'Paquete (paq)' },
  { value: 'cj', label: 'Caja (cj)' },
] as const;

const RAW_MATERIAL_UNIT_PRESETS = RAW_MATERIAL_UNIT_OPTIONS.map((item) => item.value);

const normalizeCalculatorUnit = (value?: string | null): RawMaterialCalculatorUnit | null => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return null;

  if (['g', 'gr', 'gramo', 'gramos'].includes(normalized)) return 'g';
  if (['kg', 'kilo', 'kilos', 'kilogramo', 'kilogramos'].includes(normalized)) return 'kg';
  if (['lb', 'libra', 'libras'].includes(normalized)) return 'lb';
  if (['oz', 'onza', 'onzas'].includes(normalized)) return 'oz';
  if (['ml', 'mililitro', 'mililitros'].includes(normalized)) return 'ml';
  if (['l', 'lt', 'lts', 'litro', 'litros'].includes(normalized)) return 'l';
  if (['und', 'unidad', 'unidades', 'unit', 'pieza', 'piezas'].includes(normalized)) return 'und';
  return null;
};

const getCalculatorUnitMeta = (unit: RawMaterialCalculatorUnit | null) => {
  if (!unit) return null;
  return RAW_MATERIAL_CALCULATOR_UNITS.find((item) => item.value === unit) || null;
};

export const RawInventory = () => {
  const { activeBusiness } = useBusinessStore();
  const { hasPermission, hasModule } = useAccess();
  const {
    materials,
    selectedMaterial,
    movements,
    loading,
    saving,
    loadingMovements,
    error,
    fetchMaterials,
    fetchMaterial,
    createMaterial,
    updateMaterial,
    deactivateMaterial,
    fetchMovements,
    createMovement,
    setSelectedMaterial,
    clearMovements,
  } = useRawInventoryStore();

  const canRead = hasModule('raw_inventory') && hasPermission('raw_inventory.view');
  const canCreate = hasModule('raw_inventory') && hasPermission('raw_inventory.adjust');
  const canUpdate = hasModule('raw_inventory') && hasPermission('raw_inventory.adjust');
  const canDelete = hasModule('raw_inventory') && hasPermission('raw_inventory.adjust');
  const canCreateMovements = hasModule('raw_inventory') && hasPermission('raw_inventory.movements.create');

  const [searchTerm, setSearchTerm] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [selectedMovementType, setSelectedMovementType] = useState<'all' | RawMaterialMovementType>('all');

  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);

  const [materialName, setMaterialName] = useState('');
  const [materialSku, setMaterialSku] = useState('');
  const [materialUnit, setMaterialUnit] = useState('und');
  const [materialCurrentStock, setMaterialCurrentStock] = useState('0');
  const [materialMinimumStock, setMaterialMinimumStock] = useState('0');
  const [materialReferenceCost, setMaterialReferenceCost] = useState('0');
  const [materialNotes, setMaterialNotes] = useState('');
  const [materialIsActive, setMaterialIsActive] = useState(true);
  const [calculatorTotalCost, setCalculatorTotalCost] = useState('');
  const [calculatorPurchasedQuantity, setCalculatorPurchasedQuantity] = useState('');
  const [calculatorPurchasedUnit, setCalculatorPurchasedUnit] = useState<RawMaterialCalculatorUnit>('kg');

  const [movementType, setMovementType] = useState<RawMaterialMovementType>('in');
  const [movementQuantity, setMovementQuantity] = useState('');
  const [movementTargetStock, setMovementTargetStock] = useState('0');
  const [movementReferenceCost, setMovementReferenceCost] = useState('');
  const [movementNotes, setMovementNotes] = useState('');

  useEffect(() => {
    if (!activeBusiness || !canRead) return;
    fetchMaterials(activeBusiness.id, {
      search: searchTerm || undefined,
      low_stock_only: lowStockOnly,
      include_inactive: includeInactive,
    });
  }, [activeBusiness, canRead, searchTerm, lowStockOnly, includeInactive]);

  useEffect(() => {
    if (!activeBusiness || !selectedMaterial || !isDetailsOpen) return;
    fetchMovements(activeBusiness.id, selectedMaterial.id, selectedMovementType === 'all' ? undefined : selectedMovementType);
  }, [activeBusiness, selectedMaterial?.id, isDetailsOpen, selectedMovementType]);

  const sortedMaterials = useMemo(() => {
    return [...materials].sort((a, b) => {
      if (a.is_below_minimum !== b.is_below_minimum) return a.is_below_minimum ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [materials]);

  const lowStockCount = useMemo(() => materials.filter((item) => item.is_below_minimum).length, [materials]);
  const normalizedMaterialUnit = useMemo(
    () => normalizeCalculatorUnit(materialUnit),
    [materialUnit]
  );
  const calculatorPurchaseUnitMeta = useMemo(
    () => getCalculatorUnitMeta(calculatorPurchasedUnit),
    [calculatorPurchasedUnit]
  );
  const calculatorMaterialUnitMeta = useMemo(
    () => getCalculatorUnitMeta(normalizedMaterialUnit),
    [normalizedMaterialUnit]
  );
  const calculatorTotalCostValue = Number(calculatorTotalCost || 0);
  const calculatorPurchasedQuantityValue = Number(calculatorPurchasedQuantity || 0);
  const canCalculateMaterialCost =
    !!calculatorPurchaseUnitMeta &&
    calculatorTotalCostValue > 0 &&
    calculatorPurchasedQuantityValue > 0;
  const calculatedCostPerPurchaseUnit =
    canCalculateMaterialCost
      ? calculatorTotalCostValue / calculatorPurchasedQuantityValue
      : null;
  const calculatedCostPerBaseUnit =
    canCalculateMaterialCost && calculatorPurchaseUnitMeta
      ? calculatorTotalCostValue / (calculatorPurchasedQuantityValue * calculatorPurchaseUnitMeta.factorToBase)
      : null;
  const calculatedCostPerStoredUnit =
    canCalculateMaterialCost &&
    calculatorPurchaseUnitMeta &&
    calculatorMaterialUnitMeta &&
    calculatorPurchaseUnitMeta.family === calculatorMaterialUnitMeta.family &&
    calculatedCostPerBaseUnit !== null
      ? calculatedCostPerBaseUnit * calculatorMaterialUnitMeta.factorToBase
      : null;

  const resetMaterialForm = () => {
    setMaterialName('');
    setMaterialSku('');
    setMaterialUnit('und');
    setMaterialCurrentStock('0');
    setMaterialMinimumStock('0');
    setMaterialReferenceCost('');
    setMaterialNotes('');
    setMaterialIsActive(true);
    setCalculatorTotalCost('');
    setCalculatorPurchasedQuantity('');
    setCalculatorPurchasedUnit('kg');
  };

  const openCreateMaterial = () => {
    setEditingMaterial(null);
    resetMaterialForm();
    setMaterialIsActive(true);
    setIsMaterialModalOpen(true);
  };

  const openEditMaterial = (material: RawMaterial) => {
    setEditingMaterial(material);
    setMaterialName(material.name);
    setMaterialSku(material.sku || '');
    setMaterialUnit(material.unit || 'und');
    setMaterialCurrentStock(toInputNumber(material.current_stock));
    setMaterialMinimumStock(toInputNumber(material.minimum_stock));
    setMaterialReferenceCost(material.reference_cost !== null && material.reference_cost !== undefined ? material.reference_cost.toString() : '');
    setMaterialNotes(material.notes || '');
    setMaterialIsActive(material.is_active);
    setCalculatorPurchasedUnit(normalizeCalculatorUnit(material.unit) || 'kg');
    setIsMaterialModalOpen(true);
  };

  const closeMaterialModal = () => {
    setIsMaterialModalOpen(false);
    setEditingMaterial(null);
    resetMaterialForm();
  };

  const openDetails = async (material: RawMaterial) => {
    if (!activeBusiness) return;
    await fetchMaterial(activeBusiness.id, material.id);
    setSelectedMovementType('all');
    setIsDetailsOpen(true);
  };

  const closeDetails = () => {
    setIsDetailsOpen(false);
    setSelectedMaterial(null);
    clearMovements();
  };

  const openMovementModal = (material: RawMaterial, preferredType?: RawMaterialMovementType) => {
    setSelectedMaterial(material);
    setMovementType(preferredType || 'in');
    setMovementQuantity('');
    setMovementTargetStock(toInputNumber(material.current_stock));
    setMovementReferenceCost(material.reference_cost !== null && material.reference_cost !== undefined ? String(material.reference_cost) : '');
    setMovementNotes('');
    setIsMovementModalOpen(true);
  };

  const closeMovementModal = () => {
    setIsMovementModalOpen(false);
    setMovementType('in');
    setMovementQuantity('');
    setMovementTargetStock('0');
    setMovementReferenceCost('');
    setMovementNotes('');
  };

  const handleSaveMaterial = async () => {
    if (!activeBusiness) return;
    if (!materialName.trim()) {
      toast.error('Debes ingresar el nombre de la materia prima');
      return;
    }
    if (!materialUnit.trim()) {
      toast.error('Debes ingresar la unidad de medida');
      return;
    }

    const minimumStockValue = Number(materialMinimumStock || 0);
    if (Number.isNaN(minimumStockValue) || minimumStockValue < 0) {
      toast.error('El stock mínimo debe ser un número mayor o igual a 0');
      return;
    }

    if (!editingMaterial) {
      const initialStockValue = Number(materialCurrentStock || 0);
      if (Number.isNaN(initialStockValue) || initialStockValue < 0) {
        toast.error('El stock inicial debe ser un número mayor o igual a 0');
        return;
      }
    }

    if (materialReferenceCost !== '') {
      const referenceCostValue = Number(materialReferenceCost);
      if (Number.isNaN(referenceCostValue) || referenceCostValue < 0) {
        toast.error('El costo referencial debe ser un número mayor o igual a 0');
        return;
      }
    }

    try {
      const payload = {
        name: materialName,
        sku: materialSku || null,
        unit: materialUnit,
        current_stock: editingMaterial ? undefined : Number(materialCurrentStock || 0),
        minimum_stock: Number(materialMinimumStock || 0),
        reference_cost: materialReferenceCost === '' ? null : Number(materialReferenceCost),
        notes: materialNotes || null,
        is_active: materialIsActive,
      };

      if (editingMaterial) {
        await updateMaterial(activeBusiness.id, editingMaterial.id, payload);
        toast.success('Materia prima actualizada');
      } else {
        await createMaterial(activeBusiness.id, payload);
        toast.success('Materia prima creada');
      }
      closeMaterialModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible guardar la materia prima');
    }
  };

  const handleDeactivateMaterial = async (material: RawMaterial) => {
    if (!activeBusiness) return;
    if (!window.confirm(`¿Desactivar ${material.name}?`)) return;
    try {
      await deactivateMaterial(activeBusiness.id, material.id);
      if (selectedMaterial?.id === material.id) {
        setSelectedMaterial({ ...material, is_active: false });
      }
      toast.success('Materia prima desactivada');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible desactivar la materia prima');
    }
  };

  const handleCreateMovement = async () => {
    if (!activeBusiness || !selectedMaterial) return;
    if (movementType === 'adjustment') {
      const targetStockValue = Number(movementTargetStock || 0);
      if (Number.isNaN(targetStockValue) || targetStockValue < 0) {
        toast.error('El stock objetivo del ajuste debe ser un número mayor o igual a 0');
        return;
      }
    } else {
      const quantityValue = Number(movementQuantity || 0);
      if (Number.isNaN(quantityValue) || quantityValue <= 0) {
        toast.error('La cantidad debe ser mayor a 0');
        return;
      }
    }

    if (movementReferenceCost !== '') {
      const referenceCostValue = Number(movementReferenceCost);
      if (Number.isNaN(referenceCostValue) || referenceCostValue < 0) {
        toast.error('El costo referencial debe ser un número mayor o igual a 0');
        return;
      }
    }

    try {
      const materialId = selectedMaterial.id;
      const payload = {
        movement_type: movementType,
        quantity: movementType === 'adjustment' ? undefined : Number(movementQuantity || 0),
        target_stock: movementType === 'adjustment' ? Number(movementTargetStock || 0) : undefined,
        reference_cost: movementReferenceCost === '' ? null : Number(movementReferenceCost),
        notes: movementNotes || null,
      };
      await createMovement(activeBusiness.id, selectedMaterial.id, payload);
      if (isDetailsOpen) {
        await fetchMovements(activeBusiness.id, materialId, selectedMovementType === 'all' ? undefined : selectedMovementType);
      }
      toast.success('Movimiento registrado');
      closeMovementModal();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'No fue posible registrar el movimiento');
    }
  };

  if (!canRead) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 text-center">
          <Archive className="w-10 h-10 mx-auto text-gray-400 mb-4" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Inventario bodega</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No tienes acceso a este módulo o el permiso de lectura requerido.</p>
        </div>
      </div>
    );
  }

  return (
    <PageLayout data-tour="raw-inventory.panel">
      <PageHeader
        title="Inventario bodega"
        description="Gestiona materias primas e insumos separados del catálogo comercial."
        action={
          <div className="flex flex-wrap gap-3">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              {materials.length} material(es)
            </div>
            <div className={cn('rounded-xl border px-4 py-2 text-sm font-medium', lowStockCount > 0 ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300' : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/30 dark:bg-green-900/10 dark:text-green-300')}>
              {lowStockCount > 0 ? `${lowStockCount} con stock bajo` : 'Sin alertas de stock'}
            </div>
            {canCreate && (
              <Button onClick={openCreateMaterial} data-tour="raw-inventory.primaryAction">
                <PackagePlus className="w-4 h-4 mr-2" /> Nueva materia prima
              </Button>
            )}
          </div>
        }
      />

      <PageBody className="space-y-6">
        <div className="app-surface p-4 shadow-sm" data-tour="raw-inventory.filters">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar por nombre o código..." icon={Search} />
            <Button variant={lowStockOnly ? 'primary' : 'secondary'} onClick={() => setLowStockOnly((value) => !value)}>
              <AlertTriangle className="w-4 h-4 mr-2" /> Solo stock bajo
            </Button>
            <Button variant={includeInactive ? 'primary' : 'secondary'} onClick={() => setIncludeInactive((value) => !value)}>
              <SlidersHorizontal className="w-4 h-4 mr-2" /> {includeInactive ? 'Ocultar inactivos' : 'Mostrar inactivos'}
            </Button>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">{loading ? 'Cargando inventario...' : 'Datos calculados en backend'}</div>
          </div>
          {error && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/10 dark:text-red-300">
              {error}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="app-surface xl:col-span-2 overflow-hidden shadow-sm" data-tour="raw-inventory.list">
            <div className="app-table-head hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide">
              <div>Material</div>
              <div>Stock actual</div>
              <div>Stock mínimo</div>
              <div>Costo ref.</div>
              <div className="text-right">Acciones</div>
            </div>

            <div className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
              {sortedMaterials.length === 0 && !loading && (
                <div className="px-4 py-6">
                  <TeachingEmptyState
                    compact
                    icon={PackagePlus}
                    title={searchTerm || lowStockOnly || includeInactive ? 'No hay materias primas con este filtro' : 'Aún no has cargado materias primas'}
                    description={searchTerm || lowStockOnly || includeInactive
                      ? 'Prueba limpiando filtros para revisar todo el inventario de bodega.'
                      : 'Carga tus insumos básicos con unidad, stock mínimo y costo referencial para empezar a controlar compras y alertas.'}
                    primaryActionLabel={canCreate ? 'Nueva materia prima' : undefined}
                    onPrimaryAction={canCreate ? openCreateMaterial : undefined}
                    secondaryActionLabel={searchTerm || lowStockOnly || includeInactive ? 'Limpiar filtros' : undefined}
                    onSecondaryAction={searchTerm || lowStockOnly || includeInactive ? (() => {
                      setSearchTerm('');
                      setLowStockOnly(false);
                      setIncludeInactive(false);
                    }) : undefined}
                  />
                </div>
              )}

              {sortedMaterials.map((material) => (
                <div key={material.id} className="app-table-row px-4 py-4">
                  <div className="flex flex-col gap-4 md:grid md:grid-cols-[2fr_1fr_1fr_1fr_auto] md:items-center md:gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-gray-900 dark:text-white">{material.name}</div>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', stockBadgeClass(material))}>
                          {material.current_stock <= 0 ? 'Sin stock' : material.is_below_minimum ? 'Bajo mínimo' : 'OK'}
                        </span>
                        {!material.is_active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            Inactivo
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {material.sku ? `Código: ${material.sku}` : 'Sin código'}
                        <span className="mx-2">•</span>
                        Unidad: {material.unit}
                      </div>
                    </div>

                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <div className="text-xs uppercase text-gray-500 dark:text-gray-400 md:hidden">Stock actual</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatNumber(material.current_stock)} {material.unit}</div>
                    </div>

                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <div className="text-xs uppercase text-gray-500 dark:text-gray-400 md:hidden">Stock mínimo</div>
                      <div>{formatNumber(material.minimum_stock)} {material.unit}</div>
                    </div>

                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      <div className="text-xs uppercase text-gray-500 dark:text-gray-400 md:hidden">Costo ref.</div>
                      <div>{formatCurrency(material.reference_cost, activeBusiness?.currency || 'COP')}</div>
                    </div>

                    <div className="flex flex-wrap justify-start md:justify-end gap-2">
                      <Button variant="secondary" onClick={() => openDetails(material)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      {canUpdate && (
                        <Button variant="secondary" onClick={() => openEditMaterial(material)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {canCreateMovements && material.is_active && (
                        <>
                          <Button variant="secondary" onClick={() => openMovementModal(material, 'in')}>
                            <ArrowUpCircle className="w-4 h-4" />
                          </Button>
                          <Button variant="secondary" onClick={() => openMovementModal(material, 'out')}>
                            <ArrowDownCircle className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {canDelete && material.is_active && (
                        <Button variant="secondary" onClick={() => handleDeactivateMaterial(material)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="app-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Resumen de bodega</div>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-400"><span>Activos</span><span className="font-semibold text-gray-900 dark:text-white">{materials.filter((item) => item.is_active).length}</span></div>
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-400"><span>Inactivos</span><span className="font-semibold text-gray-900 dark:text-white">{materials.filter((item) => !item.is_active).length}</span></div>
                <div className="flex items-center justify-between text-gray-600 dark:text-gray-400"><span>Stock bajo</span><span className="font-semibold text-amber-600 dark:text-amber-300">{lowStockCount}</span></div>
              </div>
            </div>

            <div className="app-surface p-5 shadow-sm">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">Criterios de esta fase</div>
              <div className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div>Entidad separada de productos comerciales.</div>
                <div>Movimientos con trazabilidad e historial.</div>
                <div>Cálculo de stock resuelto solo en backend.</div>
              </div>
            </div>
          </div>
      </div>

      <Modal isOpen={isMaterialModalOpen} onClose={closeMaterialModal} title={editingMaterial ? 'Editar materia prima' : 'Nueva materia prima'} className="max-w-2xl">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Nombre" value={materialName} onChange={(e) => setMaterialName(e.target.value)} />
            <Input label="Código / SKU" value={materialSku} onChange={(e) => setMaterialSku(e.target.value)} />
            <SelectField
              label="Unidad"
              value={materialUnit}
              onChange={(e) => setMaterialUnit(e.target.value)}
              helper="Si la consumes en cantidades pequeñas, te conviene guardarla en g o ml para costear mejor recetas y producción."
            >
              {RAW_MATERIAL_UNIT_OPTIONS.map((unit) => (
                <option key={unit.value} value={unit.value}>
                  {unit.label}
                </option>
              ))}
            </SelectField>
            <div className="hidden space-y-1.5">
              <Input
                label="Unidad"
                value={materialUnit}
                onChange={(e) => setMaterialUnit(e.target.value)}
                placeholder="g, kg, ml, l, und"
                list="raw-material-unit-presets"
              />
              <datalist id="raw-material-unit-presets">
                {RAW_MATERIAL_UNIT_PRESETS.map((unit) => (
                  <option key={unit} value={unit} />
                ))}
              </datalist>
              <p className="text-xs app-text-muted">
                Si la consumes en cantidades pequeñas, te conviene guardarla en g o ml para costear mejor recetas y producción.
              </p>
            </div>
            {!editingMaterial && (
              <Input label="Stock inicial" type="number" min="0" step="0.01" value={materialCurrentStock} onChange={(e) => setMaterialCurrentStock(e.target.value)} />
            )}
            <Input label="Stock mínimo" type="number" min="0" step="0.01" value={materialMinimumStock} onChange={(e) => setMaterialMinimumStock(e.target.value)} />
            <Input label="Costo referencial" type="number" min="0" step="0.01" value={materialReferenceCost} onChange={(e) => setMaterialReferenceCost(e.target.value)} />
          </div>

          <div className="rounded-[24px] border border-sky-200/70 bg-[linear-gradient(180deg,rgba(239,246,255,0.92),rgba(248,250,252,0.96))] p-4 shadow-sm dark:border-sky-500/20 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(15,23,42,0.72))]">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-sky-300/50 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-sky-700 dark:border-sky-400/20 dark:bg-sky-500/10 dark:text-sky-200">
                  <Calculator className="h-3.5 w-3.5" />
                  Calculadora de costo
                </div>
                <h3 className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">
                  Convierte compras grandes en un costo referencial claro.
                </h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  Ingresa cuánto pagaste y cuánto compraste. Te mostraremos el costo por unidad pequeña y el valor sugerido para esta materia prima.
                </p>
              </div>
              {calculatedCostPerStoredUnit !== null && calculatorMaterialUnitMeta ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => setMaterialReferenceCost(calculatedCostPerStoredUnit.toFixed(4))}
                >
                  Usar costo por {materialUnit.trim() || calculatorMaterialUnitMeta.value}
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              <Input
                label="Costo total de compra"
                type="number"
                min="0"
                step="0.01"
                value={calculatorTotalCost}
                onChange={(e) => setCalculatorTotalCost(e.target.value)}
                placeholder="Ej. 18000"
              />
              <Input
                label="Cantidad comprada"
                type="number"
                min="0"
                step="0.01"
                value={calculatorPurchasedQuantity}
                onChange={(e) => setCalculatorPurchasedQuantity(e.target.value)}
                placeholder="Ej. 1000"
              />
              <SelectField
                label="Unidad comprada"
                value={calculatorPurchasedUnit}
                onChange={(e) => setCalculatorPurchasedUnit(e.target.value as RawMaterialCalculatorUnit)}
              >
                {RAW_MATERIAL_CALCULATOR_UNITS.map((unit) => (
                  <option key={unit.value} value={unit.value}>
                    {unit.label}
                  </option>
                ))}
              </SelectField>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-white/60 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Costo por compra</div>
                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {calculatedCostPerPurchaseUnit !== null && calculatorPurchaseUnitMeta
                    ? `${formatCurrency(calculatedCostPerPurchaseUnit, activeBusiness?.currency || 'COP')} / ${calculatorPurchaseUnitMeta.value}`
                    : 'Completa costo y cantidad'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {calculatorPurchaseUnitMeta?.family === 'volume' ? 'Costo por ml' : 'Costo por g'}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {calculatedCostPerBaseUnit !== null && calculatorPurchaseUnitMeta && calculatorPurchaseUnitMeta.family !== 'count'
                    ? `${formatCurrency(calculatedCostPerBaseUnit, activeBusiness?.currency || 'COP')} / ${calculatorPurchaseUnitMeta.baseLabel}`
                    : 'Aplica para gramos o ml'}
                </div>
              </div>

              <div className="rounded-2xl border border-white/60 bg-white/80 p-3 dark:border-white/10 dark:bg-white/5">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  {calculatorPurchaseUnitMeta?.family === 'volume' ? 'Costo por litro' : calculatorPurchaseUnitMeta?.family === 'mass' ? 'Costo por kg' : 'Costo por unidad'}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {calculatedCostPerBaseUnit !== null && calculatorPurchaseUnitMeta
                    ? calculatorPurchaseUnitMeta.family === 'mass'
                      ? `${formatCurrency(calculatedCostPerBaseUnit * 1000, activeBusiness?.currency || 'COP')} / kg`
                      : calculatorPurchaseUnitMeta.family === 'volume'
                        ? `${formatCurrency(calculatedCostPerBaseUnit * 1000, activeBusiness?.currency || 'COP')} / l`
                        : `${formatCurrency(calculatedCostPerBaseUnit, activeBusiness?.currency || 'COP')} / unidad`
                    : 'Calculado según la compra'}
                </div>
              </div>

              <div className="rounded-2xl border border-sky-300/50 bg-sky-50/80 p-3 dark:border-sky-400/20 dark:bg-sky-500/10">
                <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-200">
                  Costo para guardar en {materialUnit.trim() || 'esta unidad'}
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900 dark:text-white">
                  {calculatedCostPerStoredUnit !== null
                    ? `${formatCurrency(calculatedCostPerStoredUnit, activeBusiness?.currency || 'COP')} / ${materialUnit.trim() || calculatorMaterialUnitMeta?.value || 'unidad'}`
                    : normalizedMaterialUnit
                      ? 'La conversión aparecerá cuando completes la compra.'
                      : 'Usa g, kg, ml, l o und para convertir automáticamente.'}
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
            <textarea className="app-textarea" value={materialNotes} onChange={(e) => setMaterialNotes(e.target.value)} />
          </div>

          {editingMaterial && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input type="checkbox" checked={materialIsActive} onChange={(e) => setMaterialIsActive(e.target.checked)} />
              Materia prima activa
            </label>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end dark:border-gray-700">
            <Button variant="secondary" onClick={closeMaterialModal}>Cancelar</Button>
            <Button onClick={handleSaveMaterial} isLoading={saving}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={isMovementModalOpen && !!selectedMaterial} onClose={closeMovementModal} title={selectedMaterial ? `Registrar movimiento - ${selectedMaterial.name}` : 'Registrar movimiento'} className="max-w-xl">
        {selectedMaterial && (
          <div className="space-y-4" data-tour="raw-inventory.movement">
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/30 bg-blue-50 dark:bg-blue-900/10 p-4 text-sm text-blue-800 dark:text-blue-200">
              Stock actual: <span className="font-semibold">{formatNumber(selectedMaterial.current_stock)} {selectedMaterial.unit}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de movimiento</label>
                <select className="app-select" value={movementType} onChange={(e) => setMovementType(e.target.value as RawMaterialMovementType)}>
                  <option value="in">Entrada</option>
                  <option value="out">Salida</option>
                  <option value="adjustment">Ajuste</option>
                </select>
              </div>

              {movementType === 'adjustment' ? (
                <Input label="Nuevo stock objetivo" type="number" min="0" step="0.01" value={movementTargetStock} onChange={(e) => setMovementTargetStock(e.target.value)} />
              ) : (
                <Input label="Cantidad" type="number" min="0" step="0.01" value={movementQuantity} onChange={(e) => setMovementQuantity(e.target.value)} />
              )}

              <Input label="Costo referencial" type="number" min="0" step="0.01" value={movementReferenceCost} onChange={(e) => setMovementReferenceCost(e.target.value)} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notas</label>
              <textarea className="app-textarea" value={movementNotes} onChange={(e) => setMovementNotes(e.target.value)} placeholder="Referencia, motivo o contexto del movimiento" />
            </div>

            <div className="flex flex-col-reverse gap-3 border-t border-gray-200 pt-3 sm:flex-row sm:justify-end dark:border-gray-700">
              <Button variant="secondary" onClick={closeMovementModal}>Cancelar</Button>
              <Button onClick={handleCreateMovement} isLoading={saving}>Registrar movimiento</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={isDetailsOpen && !!selectedMaterial} onClose={closeDetails} title={selectedMaterial ? `Detalle de ${selectedMaterial.name}` : 'Detalle de materia prima'} className="max-w-5xl h-[90vh]">
        {selectedMaterial && (
          <div className="space-y-6" data-tour="raw-inventory.detail">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="app-muted-panel p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Stock actual</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{formatNumber(selectedMaterial.current_stock)} {selectedMaterial.unit}</div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Stock mínimo</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{formatNumber(selectedMaterial.minimum_stock)} {selectedMaterial.unit}</div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Costo referencial</div>
                <div className="mt-2 font-semibold text-gray-900 dark:text-white">{formatCurrency(selectedMaterial.reference_cost, activeBusiness?.currency || 'COP')}</div>
              </div>
              <div className="app-muted-panel p-4">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Estado</div>
                <div className="mt-2">
                  <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', stockBadgeClass(selectedMaterial))}>
                    {selectedMaterial.current_stock <= 0 ? 'Sin stock' : selectedMaterial.is_below_minimum ? 'Bajo mínimo' : 'OK'}
                  </span>
                </div>
              </div>
            </div>

            <div className="app-surface rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">Movimientos</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">Historial trazable de entradas, salidas y ajustes.</div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <select className="app-select" value={selectedMovementType} onChange={(e) => setSelectedMovementType(e.target.value as 'all' | RawMaterialMovementType)}>
                    <option value="all">Todos</option>
                    <option value="in">Entradas</option>
                    <option value="out">Salidas</option>
                    <option value="adjustment">Ajustes</option>
                  </select>
                  {canCreateMovements && selectedMaterial.is_active && (
                    <Button onClick={() => openMovementModal(selectedMaterial)}>
                      <PackagePlus className="w-4 h-4 mr-2" /> Registrar movimiento
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <div className="app-surface rounded-xl overflow-hidden">
              <div className="app-table-head hidden md:grid grid-cols-[120px_120px_120px_120px_1fr_120px] gap-4 px-4 py-3 text-xs font-semibold uppercase tracking-wide">
                <div>Tipo</div>
                <div>Cantidad</div>
                <div>Antes</div>
                <div>Después</div>
                <div>Notas</div>
                <div>Fecha</div>
              </div>

              <div className="app-table-body divide-y divide-gray-100 dark:divide-gray-800">
                {loadingMovements && (
                  <div className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400">Cargando movimientos...</div>
                )}

                {!loadingMovements && movements.length === 0 && (
                  <div className="px-4 py-8 text-sm text-gray-500 dark:text-gray-400">No hay movimientos registrados para esta materia prima.</div>
                )}

                {!loadingMovements && movements.map((movement) => (
                  <div key={movement.id} className="px-4 py-4">
                    <div className="grid grid-cols-1 md:grid-cols-[120px_120px_120px_120px_1fr_120px] gap-3 md:items-center text-sm">
                      <div>
                        <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', movementBadgeClass(movement.movement_type))}>
                          {MOVEMENT_LABELS[movement.movement_type]}
                        </span>
                      </div>
                      <div className="text-gray-900 dark:text-white font-medium">{formatNumber(movement.quantity)}</div>
                      <div className="text-gray-600 dark:text-gray-400">{formatNumber(movement.previous_stock)}</div>
                      <div className="text-gray-600 dark:text-gray-400">{formatNumber(movement.new_stock)}</div>
                      <div className="text-gray-600 dark:text-gray-400">
                        <div>{movement.notes || 'Sin notas'}</div>
                        {(movement.created_by_name || movement.created_by_role) && (
                          <div className="text-xs mt-1 text-gray-400 dark:text-gray-500">{movement.created_by_name || 'Sistema'}{movement.created_by_role ? ` • ${movement.created_by_role}` : ''}</div>
                        )}
                      </div>
                      <div className="text-gray-500 dark:text-gray-400 text-xs md:text-sm">{movement.created_at ? new Date(movement.created_at).toLocaleString() : '—'}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
              {canUpdate && selectedMaterial.is_active && (
                <Button variant="secondary" onClick={() => openEditMaterial(selectedMaterial)}>
                  <Pencil className="w-4 h-4 mr-2" /> Editar
                </Button>
              )}
              {canDelete && selectedMaterial.is_active && (
                <Button variant="secondary" onClick={() => handleDeactivateMaterial(selectedMaterial)}>
                  <Trash2 className="w-4 h-4 mr-2" /> Desactivar
                </Button>
              )}
              <Button variant="secondary" onClick={closeDetails}>Cerrar</Button>
            </div>
          </div>
        )}
      </Modal>
      </PageBody>
    </PageLayout>
  );
};
