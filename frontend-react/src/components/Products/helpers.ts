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
