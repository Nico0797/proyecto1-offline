import { Product } from '../../types';

export const moneyCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const calcMargin = (price: number, cost: number) => {
  if (price === 0) return 0;
  return ((price - cost) / price) * 100;
};

export const getStockStatus = (product: Product) => {
  if (product.type === 'service') return 'service';
  if (product.stock <= 0) return 'out_of_stock';
  if (product.stock <= (product.low_stock_threshold || 5)) return 'low_stock';
  return 'ok';
};

export const getStockStatusLabel = (status: string) => {
  switch (status) {
    case 'service': return 'Servicio';
    case 'out_of_stock': return 'Sin Stock';
    case 'low_stock': return 'Bajo Stock';
    case 'ok': return 'OK';
    default: return '';
  }
};

export const getStockStatusColor = (status: string) => {
  switch (status) {
    case 'service': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'out_of_stock': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    case 'low_stock': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'ok': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
  }
};

export const getFulfillmentMode = (product: Pick<Product, 'type' | 'fulfillment_mode'>) => {
  if (product.type === 'service') return 'service';
  return product.fulfillment_mode || 'resale_stock';
};

export const getFulfillmentModeLabel = (product: Pick<Product, 'type' | 'fulfillment_mode'>) => {
  switch (getFulfillmentMode(product)) {
    case 'make_to_stock':
      return 'Producción a stock';
    case 'make_to_order':
      return 'Por pedido';
    case 'service':
      return 'Servicio';
    case 'resale_stock':
    default:
      return 'Stock terminado';
  }
};

export const getFulfillmentModeHint = (product: Pick<Product, 'type' | 'fulfillment_mode'>) => {
  switch (getFulfillmentMode(product)) {
    case 'make_to_stock':
      return 'Primero produces y luego vendes desde stock terminado.';
    case 'make_to_order':
      return 'Se cumple al producir por pedido; no depende de stock fijo terminado.';
    case 'service':
      return 'No usa inventario de producto terminado.';
    case 'resale_stock':
    default:
      return 'Compras o cargas producto terminado y lo descuentas al vender.';
  }
};

export const getFulfillmentModeTone = (product: Pick<Product, 'type' | 'fulfillment_mode'>) => {
  switch (getFulfillmentMode(product)) {
    case 'make_to_stock':
      return 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300';
    case 'make_to_order':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'service':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    case 'resale_stock':
    default:
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300';
  }
};

export const productTracksFinishedGoodsStock = (product: Pick<Product, 'type' | 'fulfillment_mode'>) => {
  const fulfillmentMode = getFulfillmentMode(product);
  return fulfillmentMode === 'make_to_stock' || fulfillmentMode === 'resale_stock';
};

export const productCanRegisterProduction = (product: Pick<Product, 'type' | 'fulfillment_mode'>) => {
  return getFulfillmentMode(product) === 'make_to_stock';
};
