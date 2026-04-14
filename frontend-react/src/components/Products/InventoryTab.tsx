import React, { useState } from 'react';
import { Product } from '../../types';
import {
  getFulfillmentModeHint,
  getFulfillmentModeLabel,
  getFulfillmentModeTone,
  getStockStatus,
  getStockStatusColor,
  moneyCOP,
  productCanRegisterProduction,
  productTracksFinishedGoodsStock,
} from './helpers';
import { Plus, Minus, AlertTriangle } from 'lucide-react';
import { useProductStore } from '../../store/productStore';
import { useBusinessStore } from '../../store/businessStore';
import { usePermission } from '../../hooks/usePermission';
import { Button } from '../ui/Button';
import { FormAlert } from '../ui/FormAlert';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { productionService } from '../../services/productionService';
import { toast } from 'react-hot-toast';

interface InventoryTabProps {
  products: Product[];
}

type ProductionFeedback = {
  title?: string;
  message: string;
  details?: string[];
};

const formatProductionError = (error: any): ProductionFeedback => {
  const payload = error?.response?.data;
  if (payload?.code === 'INSUFFICIENT_RAW_MATERIALS' && Array.isArray(payload?.shortages) && payload.shortages.length > 0) {
    const details = payload.shortages
      .map((item: any) => {
        const materialName = item?.raw_material_name || 'Materia prima';
        const required = Number(item?.required_quantity || 0);
        const available = Number(item?.available_stock || 0);
        const shortage = Number(item?.shortage || Math.max(required - available, 0));
        const unit = item?.raw_material_unit || 'und';
        return `${materialName}: faltan ${shortage} ${unit} (requiere ${required}, disponible ${available})`;
      });

    return {
      title: 'Materias primas insuficientes',
      message: 'No puedes registrar la producción porque no hay suficiente inventario de insumos para completar este lote.',
      details,
    };
  }

  if (payload?.error) {
    return {
      title: payload?.code === 'RAW_MATERIAL_NOT_FOUND'
        ? 'Insumo no disponible'
        : payload?.code === 'RECIPE_NOT_FOUND'
          ? 'Receta no disponible'
          : 'Producción no disponible',
      message: payload.error,
    };
  }

  return {
    title: 'No fue posible registrar la producción',
    message: payload?.error || 'Revisa la información del formulario e inténtalo nuevamente.',
  };
};

export const InventoryTab: React.FC<InventoryTabProps> = ({ products }) => {
  const { activeBusiness } = useBusinessStore();
  const { updateProduct, fetchProducts } = useProductStore();
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const canAdjust = usePermission('products.adjust_stock');
  const canRegisterProduction = usePermission('production.register');
  const [productionProduct, setProductionProduct] = useState<Product | null>(null);
  const [productionQuantity, setProductionQuantity] = useState('1');
  const [productionNotes, setProductionNotes] = useState('');
  const [submittingProduction, setSubmittingProduction] = useState(false);
  const [productionFeedback, setProductionFeedback] = useState<ProductionFeedback | null>(null);

  const handleAdjustStock = async (product: Product, amount: number) => {
    if (!activeBusiness) return;
    setLoadingId(product.id);
    try {
      const newStock = Math.max(0, product.stock + amount);
      await updateProduct(activeBusiness.id, product.id, { stock: newStock });
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingId(null);
    }
  };

  const openProductionModal = (product: Product) => {
    setProductionProduct(product);
    setProductionQuantity('1');
    setProductionNotes('');
    setProductionFeedback(null);
  };

  const closeProductionModal = () => {
    if (submittingProduction) return;
    setProductionProduct(null);
    setProductionQuantity('1');
    setProductionNotes('');
    setProductionFeedback(null);
  };

  const handleRegisterProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBusiness || !productionProduct) return;

    const quantity = Number(productionQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setProductionFeedback({
        title: 'Cantidad inválida',
        message: 'La cantidad a producir debe ser mayor a 0.',
      });
      return;
    }

    setSubmittingProduction(true);
    setProductionFeedback(null);
    try {
      await productionService.registerStockProduction(activeBusiness.id, productionProduct.id, {
        quantity,
        notes: productionNotes.trim() || undefined,
      });
      await fetchProducts(activeBusiness.id);
      toast.success(`Producción registrada para ${productionProduct.name}`);
      closeProductionModal();
    } catch (error: any) {
      setProductionFeedback(formatProductionError(error));
    } finally {
      setSubmittingProduction(false);
    }
  };

  const productList = products.filter(p => p.type === 'product');

  const renderModeBadge = (product: Product) => (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getFulfillmentModeTone(product)}`}>
      {getFulfillmentModeLabel(product)}
    </span>
  );

  const renderActions = (product: Product, compact = false) => {
    const tracksFinishedGoods = productTracksFinishedGoodsStock(product);
    const canProduce = productCanRegisterProduction(product);

    if (!tracksFinishedGoods) {
      return (
        <div className={`rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/30 dark:bg-amber-900/10 dark:text-amber-300 ${compact ? '' : 'max-w-xs'}`}>
          {getFulfillmentModeHint(product)}
        </div>
      );
    }

    return (
      <div className={`space-y-2 ${compact ? 'min-w-[180px]' : 'items-center'}`}>
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Ajuste manual</div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAdjustStock(product, -1)}
              disabled={loadingId === product.id || product.stock <= 0 || !canAdjust}
              className="p-1.5 rounded-md bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 disabled:opacity-50"
              title="Descontar manualmente"
            >
              <Minus className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleAdjustStock(product, 1)}
              disabled={loadingId === product.id || !canAdjust}
              className="p-1.5 rounded-md bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 disabled:opacity-50"
              title="Sumar manualmente"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {canProduce ? (
          <div>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Producción</div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => openProductionModal(product)}
              disabled={!canRegisterProduction}
              className="w-full justify-center"
            >
              Registrar producción
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <div className="mb-4 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/30 dark:bg-blue-900/10 dark:text-blue-300">
        Aquí el ajuste manual queda separado de la producción. Los productos por pedido no dependen de stock terminado fijo.
      </div>

      <div className="md:hidden space-y-3" data-tour="products.inventory.list">
        {productList.map((product) => {
          const stockStatus = getStockStatus(product);
          const totalValue = (product.cost || 0) * product.stock;
          const tracksFinishedGoods = productTracksFinishedGoodsStock(product);
          return (
            <div key={product.id} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-gray-900 dark:text-white truncate">{product.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    {renderModeBadge(product)}
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStockStatusColor(stockStatus)}`}>
                      {stockStatus === 'low_stock' && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {stockStatus === 'out_of_stock' ? 'Sin stock' : stockStatus === 'low_stock' ? 'Bajo stock' : 'OK'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku || 'N/A'}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Valor: {moneyCOP(totalValue)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                    {tracksFinishedGoods ? product.stock : '—'}
                    {tracksFinishedGoods ? <span className="ml-1 text-xs text-gray-500">{product.unit}</span> : null}
                  </div>
                  <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                    {tracksFinishedGoods ? 'Stock terminado' : 'Por pedido'}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                {getFulfillmentModeHint(product)}
              </div>

              <div className="mt-4">{renderActions(product, true)}</div>
            </div>
          );
        })}
      </div>

      <table className="hidden md:table w-full text-left text-sm" data-tour="products.inventory.table">
        <thead className="bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400 font-medium border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
          <tr>
            <th className="px-6 py-4">Producto</th>
            <th className="px-6 py-4">Modo</th>
            <th className="px-6 py-4 text-center">Stock actual</th>
            <th className="px-6 py-4 text-center">Estado</th>
            <th className="px-6 py-4 text-right">Valor total</th>
            <th className="px-6 py-4 text-center" data-tour="products.inventory.quickAdjust">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
          {productList.map((product) => {
            const stockStatus = getStockStatus(product);
            const totalValue = (product.cost || 0) * product.stock;
            const tracksFinishedGoods = productTracksFinishedGoodsStock(product);
            return (
              <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors align-top">
                <td className="px-6 py-4">
                  <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">SKU: {product.sku || 'N/A'}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    {renderModeBadge(product)}
                    <div className="max-w-xs text-xs text-gray-500 dark:text-gray-400">{getFulfillmentModeHint(product)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-center font-bold text-lg">
                  {tracksFinishedGoods ? (
                    <>
                      {product.stock} <span className="text-xs font-normal text-gray-500">{product.unit}</span>
                    </>
                  ) : (
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">No aplica</span>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStockStatusColor(stockStatus)}`}>
                    {stockStatus === 'low_stock' && <AlertTriangle className="w-3 h-3 mr-1" />}
                    {tracksFinishedGoods
                      ? stockStatus === 'out_of_stock'
                        ? 'Sin Stock'
                        : stockStatus === 'low_stock'
                          ? 'Bajo Stock'
                          : 'OK'
                      : 'Por pedido'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  {tracksFinishedGoods ? moneyCOP(totalValue) : '—'}
                </td>
                <td className="px-6 py-4">
                  <div className="flex justify-center">{renderActions(product)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <Modal
        isOpen={!!productionProduct}
        onClose={closeProductionModal}
        title={productionProduct ? `Registrar producción · ${productionProduct.name}` : 'Registrar producción'}
        maxWidth="max-w-xl"
      >
        {productionProduct ? (
          <form onSubmit={handleRegisterProduction} className="space-y-4">
            <div className={`rounded-2xl px-4 py-3 text-sm ${getFulfillmentModeTone(productionProduct)}`}>
              <div className="font-semibold">{getFulfillmentModeLabel(productionProduct)}</div>
              <p className="mt-1 opacity-90">Este flujo consume materias primas y aumenta el stock terminado.</p>
            </div>

            {productionFeedback ? (
              <FormAlert
                tone="error"
                title={productionFeedback.title}
                message={productionFeedback.message}
                details={productionFeedback.details}
              />
            ) : null}

            <Input
              label="Cantidad producida"
              type="number"
              min="0.01"
              step="0.01"
              value={productionQuantity}
              onChange={(e) => setProductionQuantity(e.target.value)}
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Nota</label>
              <textarea
                value={productionNotes}
                onChange={(e) => setProductionNotes(e.target.value)}
                className="app-textarea min-h-[110px]"
                placeholder="Ej. Lote de reposición, producción del día o ajuste documentado."
              />
            </div>

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeProductionModal} disabled={submittingProduction}>
                Cancelar
              </Button>
              <Button type="submit" isLoading={submittingProduction}>
                Registrar producción
              </Button>
            </div>
          </form>
        ) : null}
      </Modal>
    </>
  );
};
