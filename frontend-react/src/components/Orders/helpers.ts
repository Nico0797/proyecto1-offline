import { Order, OrderItem } from '../../types';

export const formatCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const calcOrderTotals = (items: OrderItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = 0; // Implement if needed
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

export const buildWhatsAppOrderMessage = (
  order: Partial<Order> & { id: number }, 
  businessName: string, 
  items?: OrderItem[]
) => {
  const defaultTemplate = `Hola {cliente}, aquí está el resumen de tu pedido #{id} en {negocio}.
  
Detalle:
{items}

Total: {total}
Estado: {estado}

{nota}`;

  const itemsList = (items || order.items || [])
    .map(item => `- ${item.quantity}x ${item.name || 'Producto'} (${formatCOP(item.total)})`)
    .join('\n');

  const total = items ? items.reduce((sum, i) => sum + i.total, 0) : order.total;
  
  const text = defaultTemplate
    .replace('{cliente}', order.customer_name || 'Cliente')
    .replace('{negocio}', businessName)
    .replace('{id}', order.id.toString())
    .replace('{items}', itemsList)
    .replace('{total}', formatCOP(total || 0))
    .replace('{estado}', getOrderStatusLabel(order.status || 'pending'))
    .replace('{nota}', order.note ? `\nNota: ${order.note}` : '');

  return encodeURIComponent(text);
};

export const getOrderStatusColor = (status: string) => {
    switch (status) {
        case 'pending': return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200';
        case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
        case 'cancelled': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
        case 'in_progress': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'; // Optional
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
    }
};

export const getOrderStatusLabel = (status: string) => {
    switch (status) {
        case 'pending': return 'Pendiente';
        case 'completed': return 'Completado';
        case 'cancelled': return 'Cancelado';
        case 'in_progress': return 'En Preparación';
        default: return status;
    }
};
