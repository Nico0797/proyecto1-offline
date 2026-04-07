import { Sale, SaleItem } from '../../types';

export const formatCOP = (amount: number) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const calcTotals = (items: SaleItem[]) => {
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = 0; // Implement if needed
  const total = subtotal + tax;
  return { subtotal, tax, total };
};

export const buildWhatsAppMessage = (
  sale: Partial<Sale>, 
  businessName: string, 
  items?: SaleItem[],
  template?: string
) => {
  const defaultTemplate = `Hola {cliente}, gracias por tu compra en {negocio}.
  
Detalle de tu pedido:
{items}

Total: {total}
Fecha: {fecha}

¡Esperamos verte pronto!`;

  const itemsList = (items || sale.items || [])
    .map(item => `- ${item.qty}x ${item.name} (${formatCOP(item.total)})`)
    .join('\n');

  let templateToUse = template || defaultTemplate;
  
  const total = items ? items.reduce((sum, i) => sum + i.total, 0) : (sale.total || 0);
  
  templateToUse = templateToUse.replace('{cliente}', sale.customer_name || 'Cliente')
    .replace('{negocio}', businessName)
    .replace('{items}', itemsList)
    .replace('{total}', formatCOP(total))
    .replace('{saldo}', formatCOP(sale.balance || 0))
    .replace('{fecha}', new Date(sale.sale_date || new Date()).toLocaleDateString());

  return encodeURIComponent(templateToUse);
};

export const getStatusColor = (status: string, paid: boolean) => {
    if (!paid) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    if (status === 'cancelled') return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
};

export const getStatusLabel = (status: string, paid: boolean) => {
    if (!paid) return 'Pendiente / Fiado';
    if (status === 'cancelled') return 'Anulada';
    return 'Pagada';
};
