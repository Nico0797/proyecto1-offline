import type { Customer, Order, OrderItem, Product } from '../types';
import { offlineSyncService } from './offlineSyncService';
import { nextLocalNumericId, readLocalCollection, writeLocalCollection } from './offlineLocalData';

const ORDERS_COLLECTION = 'orders';

const sortOrders = (orders: Order[]) => (
  [...orders].sort((left, right) => new Date(right.order_date || right.created_at || 0).getTime() - new Date(left.order_date || left.created_at || 0).getTime())
);

const normalizeOrderItem = (item: any, products: Product[]): OrderItem => {
  const product = products.find((entry) => Number(entry.id) === Number(item?.product_id ?? item?.productId ?? item?.id));
  const quantity = Number(item?.quantity ?? item?.qty ?? item?.amount ?? 1);
  const unitPrice = Number(item?.unit_price ?? item?.price ?? product?.price ?? 0);
  return {
    product_id: item?.product_id ?? item?.productId ?? item?.id ?? product?.id,
    name: item?.name ?? item?.product_name ?? product?.name ?? 'Producto',
    quantity,
    unit_price: unitPrice,
    total: Number(item?.total ?? (quantity * unitPrice)),
    fulfillment_mode: item?.fulfillment_mode ?? (product as any)?.fulfillment_mode ?? null,
  };
};

const normalizeOrder = (businessId: number, source: any, products: Product[], customers: Customer[], fallbackId?: number): Order => {
  const items = Array.isArray(source?.items) ? source.items.map((item: any) => normalizeOrderItem(item, products)) : [];
  const customerId = source?.customer_id == null || source?.customer_id === '' ? null : Number(source.customer_id);
  const customer = customers.find((entry) => Number(entry.id) === customerId);
  const total = Number(source?.total ?? source?.subtotal ?? items.reduce((sum: number, item: OrderItem) => sum + Number(item.total || 0), 0));
  const createdAt = source?.created_at ?? new Date().toISOString();
  return {
    id: Number(source?.id ?? fallbackId ?? 0),
    order_number: source?.order_number ?? null,
    business_id: Number(source?.business_id ?? businessId),
    customer_id: customerId ?? undefined,
    customer_name: source?.customer_name ?? source?.customer?.name ?? customer?.name ?? null,
    order_date: String(source?.order_date ?? source?.date ?? createdAt).split('T')[0],
    items,
    total,
    status: source?.status ?? 'pending',
    note: source?.note ?? '',
    created_at: createdAt,
  };
};

const readContext = async (businessId: number) => {
  const [products, customerState] = await Promise.all([
    offlineSyncService.getProductsFromLocal(businessId),
    offlineSyncService.getOfflineMergedCustomers(businessId),
  ]);

  return {
    products,
    customers: customerState.customers,
    orders: readLocalCollection<Order>(businessId, ORDERS_COLLECTION),
  };
};

const persistOrders = (businessId: number, orders: Order[]) => {
  writeLocalCollection(businessId, ORDERS_COLLECTION, sortOrders(orders));
};

const buildOrderSaleNote = (order: Pick<Order, 'id' | 'order_number'>) => {
  const orderLabel = order.order_number || `PED-${String(order.id).padStart(6, '0')}`;
  return `Desde pedido ${orderLabel} (ID ${order.id})`;
};

export const offlineOrdersLocal = {
  async list(businessId: number, opts?: { start_date?: string; end_date?: string }) {
    const context = await readContext(businessId);
    const start = opts?.start_date ? new Date(opts.start_date).getTime() : null;
    const end = opts?.end_date ? new Date(opts.end_date).getTime() : null;

    return sortOrders(context.orders.map((entry) => normalizeOrder(businessId, entry, context.products, context.customers, entry.id)))
      .filter((order) => {
        const orderTime = new Date(order.order_date || order.created_at || 0).getTime();
        if (start != null && Number.isFinite(orderTime) && orderTime < start) return false;
        if (end != null && Number.isFinite(orderTime) && orderTime > end) return false;
        return true;
      });
  },

  async create(businessId: number, orderData: any) {
    const context = await readContext(businessId);
    const orderId = nextLocalNumericId(context.orders);
    const createdAt = new Date().toISOString();
    const normalized = normalizeOrder(
      businessId,
      {
        ...orderData,
        id: orderId,
        business_id: businessId,
        created_at: createdAt,
        order_number: orderData?.order_number ?? `PED-${String(orderId).padStart(6, '0')}`,
        order_date: orderData?.order_date ?? createdAt,
      },
      context.products,
      context.customers,
      orderId,
    );

    persistOrders(businessId, [normalized, ...context.orders]);
    return normalized;
  },

  async updateStatus(businessId: number, id: number, status: string, saleDate?: string, extraData?: any) {
    const context = await readContext(businessId);
    const existing = context.orders.find((entry) => Number(entry.id) === Number(id));
    if (!existing) {
      throw new Error('No encontramos este pedido en tu espacio local.');
    }

    if (status === 'completed' && existing.status !== 'completed') {
      const paymentDetails = extraData?.payment_details || {};
      const paidAmount = Number(paymentDetails.paid_amount || 0);
      const paymentMethod = String(paymentDetails.method || paymentDetails.payment_method || 'cash');
      const noteTag = buildOrderSaleNote(existing);
      const localSales = await offlineSyncService.getSalesFromLocal(businessId);
      const existingSale = localSales.find((sale) => String(sale.note || '').includes(noteTag));

      if (!existingSale) {
        await offlineSyncService.createOfflineSale(businessId, {
          customer_id: existing.customer_id ?? null,
          items: existing.items,
          subtotal: Number((existing as any).subtotal ?? existing.items.reduce((sum, item) => sum + Number(item.total || 0), 0)),
          discount: Number((existing as any).discount ?? 0),
          total: Number(existing.total || 0),
          sale_date: saleDate || existing.order_date,
          amount_paid: paidAmount,
          payment_method: paymentMethod,
          treasury_account_id: paymentDetails.treasury_account_id ?? null,
          paid: Number(existing.total || 0) - paidAmount <= 0.01,
          note: noteTag,
        });
      }
    }

    const updated = normalizeOrder(
      businessId,
      {
        ...existing,
        ...extraData,
        id,
        status,
        order_date: saleDate || existing.order_date,
      },
      context.products,
      context.customers,
      id,
    );

    persistOrders(
      businessId,
      context.orders.map((entry) => Number(entry.id) === Number(id) ? updated : entry),
    );
    return updated;
  },

  async remove(businessId: number, id: number) {
    const context = await readContext(businessId);
    persistOrders(
      businessId,
      context.orders.filter((entry) => Number(entry.id) !== Number(id)),
    );
  },
};
