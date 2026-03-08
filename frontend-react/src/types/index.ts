export interface User {
  id: number;
  email: string;
  name: string;
  plan: 'free' | 'pro';
  is_admin?: boolean;
  permissions?: Record<string, boolean>;
}

export interface Business {
  id: number;
  user_id: number;
  name: string;
  currency: string;
  created_at: string;
  whatsapp_templates?: {
    sale_message?: string;
  };
  credit_days?: number;
}

export interface Customer {
  id: number;
  business_id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  balance: number;
  created_at: string;
  oldest_due_date?: string;
  days_since_oldest?: number;
  is_overdue?: boolean;
}

export interface Product {
  id: number;
  business_id: number;
  name: string;
  description?: string;
  type: 'product' | 'service';
  sku?: string;
  price: number;
  cost?: number;
  unit: string;
  stock: number;
  low_stock_threshold: number;
  active: boolean;
  created_at: string;
}

export interface SaleItem {
  product_id?: number;
  name: string;
  qty: number;
  unit_price: number;
  total: number;
}

export interface Payment {
  id: number;
  sale_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  note?: string;
}

export interface Sale {
  id: number;
  business_id: number;
  customer_id?: number;
  customer_name?: string;
  sale_date: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  total: number;
  balance: number;
  total_cost: number;
  payment_method: 'cash' | 'transfer' | 'credit';
  paid: boolean;
  status?: 'pending' | 'completed' | 'cancelled'; // Optional for compatibility if needed
  note?: string;
  created_at: string;
}

export interface OrderItem {
  product_id?: number;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Order {
  id: number;
  order_number?: string;
  business_id: number;
  customer_id?: number;
  customer_name?: string;
  order_date: string;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  note?: string;
  created_at?: string;
}

export interface Expense {
  id: number;
  business_id: number;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export interface DashboardStats {
  total_sales: number;
  total_expenses: number;
  balance: number;
  total_debt: number;
}
