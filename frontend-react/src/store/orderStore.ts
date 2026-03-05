import { create } from 'zustand';
import api from '../services/api';
import { Order, OrderItem } from '../types';

export type { Order, OrderItem };

interface OrderState {
  orders: Order[];
  loading: boolean;
  error: string | null;
  fetchOrders: (businessId: number, opts?: { start_date?: string; end_date?: string }) => Promise<void>;
  createOrder: (businessId: number, orderData: any) => Promise<void>;
  updateOrderStatus: (businessId: number, id: number, status: string, saleDate?: string) => Promise<void>;
  deleteOrder: (businessId: number, id: number) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set) => ({
  orders: [],
  loading: false,
  error: null,
  // helper to normalize orders from backend payloads
  // ensure items have 'quantity', compute 'total' fallback, flatten customer name if present
  fetchOrders: async (businessId, opts) => {
    try {
      set({ loading: true, error: null });
      const addOneDay = (d?: string) => {
        if (!d) return undefined;
        const parts = d.split('-').map(Number);
        if (parts.length !== 3) return d;
        const dt = new Date(parts[0], parts[1] - 1, parts[2]);
        dt.setDate(dt.getDate() + 1);
        const yyyy = dt.getFullYear();
        const mm = String(dt.getMonth() + 1).padStart(2, '0');
        const dd = String(dt.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
      };
      const response = await api.get(`/businesses/${businessId}/orders`, {
        params: {
          start_date: opts?.start_date || undefined,
          // Backend compara <= end_date 00:00, por eso sumamos +1 día para incluir el día final completo
          end_date: addOneDay(opts?.end_date) || undefined,
        }
      });
      const raw = response?.data?.orders || [];
      const normalized = raw.map((o: any) => {
        const items = (o.items || []).map((it: any) => ({
          product_id: it.product_id ?? it.productId ?? it.id ?? undefined,
          name: it.name ?? it.product_name ?? 'Producto',
          quantity: it.quantity ?? it.qty ?? it.amount ?? 1,
          unit_price: it.unit_price ?? it.price ?? 0,
          total: it.total ?? ((it.quantity ?? it.qty ?? 1) * (it.unit_price ?? it.price ?? 0)),
        }));
        const total = o.total && o.total > 0 ? o.total : items.reduce((s: number, it: any) => s + (it.total || 0), 0);
        return {
          id: o.id,
          order_number: o.order_number ?? null,
          business_id: o.business_id ?? businessId,
          customer_id: o.customer_id ?? null,
          customer_name: o.customer_name ?? o.customer?.name ?? null,
          order_date: (o.order_date ?? o.date ?? new Date().toISOString()).split('T')[0],
          items,
          total,
          status: o.status ?? 'pending',
          note: o.note ?? '',
          created_at: o.created_at ?? new Date().toISOString(),
        } as Order;
      });
      set({ orders: normalized });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ loading: false });
    }
  },
  createOrder: async (businessId, orderData) => {
    try {
      set({ loading: true, error: null });
      const response = await api.post(`/businesses/${businessId}/orders`, orderData);
      const apiOrder = response?.data?.order;
      const normalize = (o: any): Order => {
        const items = (o.items || []).map((it: any) => ({
          product_id: it.product_id ?? it.productId ?? it.id ?? undefined,
          name: it.name ?? it.product_name ?? 'Producto',
          quantity: it.quantity ?? it.qty ?? it.amount ?? 1,
          unit_price: it.unit_price ?? it.price ?? 0,
          total: it.total ?? ((it.quantity ?? it.qty ?? 1) * (it.unit_price ?? it.price ?? 0)),
        }));
        const total = o.total && o.total > 0 ? o.total : items.reduce((s: number, it: any) => s + (it.total || 0), 0);
        return {
          id: o.id ?? Math.floor(Math.random() * 1e9),
          order_number: o.order_number ?? orderData.order_number ?? null,
          business_id: o.business_id ?? businessId,
          customer_id: o.customer_id ?? orderData.customer_id ?? null,
          customer_name: o.customer_name ?? o.customer?.name ?? null,
          order_date: (o.order_date ?? orderData.order_date ?? new Date().toISOString()).split('T')[0],
          items,
          total,
          status: o.status ?? orderData.status ?? 'pending',
          note: o.note ?? orderData.note ?? '',
          created_at: o.created_at ?? new Date().toISOString(),
        };
      };
      const localOrder: Order = apiOrder ? normalize(apiOrder) : normalize(orderData);
      set((state) => ({ orders: [localOrder, ...state.orders] }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  updateOrderStatus: async (businessId, id, status, saleDate) => {
    try {
      set({ loading: true, error: null });
      const payload: any = { status };
      if (saleDate) {
        payload.sale_date = saleDate;
      }
      const response = await api.put(`/businesses/${businessId}/orders/${id}`, payload);
      const o = response?.data?.order;
      const items = (o.items || []).map((it: any) => ({
        product_id: it.product_id ?? it.productId ?? it.id ?? undefined,
        name: it.name ?? it.product_name ?? 'Producto',
        quantity: it.quantity ?? it.qty ?? it.amount ?? 1,
        unit_price: it.unit_price ?? it.price ?? 0,
        total: it.total ?? ((it.quantity ?? it.qty ?? 1) * (it.unit_price ?? it.price ?? 0)),
      }));
      const total = o.total && o.total > 0 ? o.total : items.reduce((s: number, it: any) => s + (it.total || 0), 0);
      const normalized: Order = {
        id: o.id ?? id,
        order_number: o.order_number ?? null,
        business_id: o.business_id ?? businessId,
        customer_id: o.customer_id ?? null,
        customer_name: o.customer_name ?? o.customer?.name ?? null,
        order_date: (o.order_date ?? new Date().toISOString()).split('T')[0],
        items,
        total,
        status: o.status ?? status,
        note: o.note ?? '',
        created_at: o.created_at ?? new Date().toISOString(),
      };
      set((state) => ({
        orders: state.orders.map((order) => (order.id === id ? normalized : order)),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
  deleteOrder: async (businessId, id) => {
    try {
      set({ loading: true, error: null });
      await api.delete(`/businesses/${businessId}/orders/${id}`);
      set((state) => ({
        orders: state.orders.filter((o) => o.id !== id),
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    } finally {
      set({ loading: false });
    }
  },
}));
