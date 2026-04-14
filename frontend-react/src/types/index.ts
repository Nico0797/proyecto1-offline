export interface User {
  id: number;
  email: string;
  name: string;
  plan: 'free' | 'basic' | 'pro' | 'business';
  membership_plan?: 'free' | 'basic' | 'pro' | 'business' | null;
  membership_start?: string | null;
  membership_end?: string | null;
  account_type?: 'personal' | 'team_member';
  is_admin?: boolean;
  permissions?: Record<string, boolean>;
}

export type BusinessModuleKey =
  | 'sales'
  | 'customers'
  | 'products'
  | 'accounts_receivable'
  | 'reports'
  | 'quotes'
  | 'raw_inventory';

export interface BusinessModuleState {
  module_key: BusinessModuleKey;
  enabled: boolean;
  config?: Record<string, any> | null;
  updated_at?: string | null;
}

export interface BusinessRbacRoleTemplate {
  key: string;
  name: string;
  description: string;
  permissions: string[];
  min_plan?: 'basic' | 'pro' | 'business';
  visible_for_models?: Array<string | null>;
}

export interface BusinessRbacMetadata {
  plan?: 'basic' | 'pro' | 'business';
  operational_profile?: Record<string, any>;
  commercial_sections?: Record<string, boolean>;
  suggested_roles?: BusinessRbacRoleTemplate[];
}

export const BUSINESS_MODULE_ORDER: BusinessModuleKey[] = [
  'sales',
  'customers',
  'products',
  'accounts_receivable',
  'reports',
  'quotes',
  'raw_inventory',
];

export const BUSINESS_MODULE_META: Record<
  BusinessModuleKey,
  {
    label: string;
    description: string;
    defaultEnabled: boolean;
  }
> = {
  sales: {
    label: 'Ventas',
    description: 'Registra ventas del día y organiza el seguimiento comercial del negocio.',
    defaultEnabled: true,
  },
  customers: {
    label: 'Clientes',
    description: 'Guarda clientes, sus datos de contacto y su historial contigo.',
    defaultEnabled: true,
  },
  products: {
    label: 'Productos',
    description: 'Organiza tu catálogo de productos y servicios para vender mejor.',
    defaultEnabled: true,
  },
  accounts_receivable: {
    label: 'Cuentas por cobrar',
    description: 'Lleva cobros, abonos y saldos pendientes de tus clientes.',
    defaultEnabled: true,
  },
  reports: {
    label: 'Reportes',
    description: 'Activa alertas, reportes y vista de resultados para tomar decisiones.',
    defaultEnabled: true,
  },
  quotes: {
    label: 'Cotizaciones',
    description: 'Te permite preparar propuestas antes de convertirlas en venta.',
    defaultEnabled: false,
  },
  raw_inventory: {
    label: 'Inventario bodega',
    description: 'Controla insumos, compras, proveedores, recetas y costos de producción.',
    defaultEnabled: false,
  },
};

const BUSINESS_MODULE_KEY_ALIASES: Record<string, BusinessModuleKey> = {
  analytics: 'reports',
};

export const normalizeBusinessModuleKey = (moduleKey?: string | null): BusinessModuleKey | null => {
  const normalized = String(moduleKey || '').trim();
  if (!normalized) return null;
  return BUSINESS_MODULE_KEY_ALIASES[normalized] || (normalized as BusinessModuleKey);
};

export const isBusinessModuleEnabled = (
  modules: BusinessModuleState[] | undefined | null,
  moduleKey: BusinessModuleKey
): boolean => {
  const fallback = BUSINESS_MODULE_META[moduleKey].defaultEnabled;
  if (!modules || modules.length === 0) return fallback;
  const moduleState = modules.find((item) => normalizeBusinessModuleKey(item.module_key) === moduleKey);
  return moduleState ? !!moduleState.enabled : fallback;
};

export interface Business {
  id: number;
  user_id: number;
  name: string;
  currency: string;
  created_at: string;
  settings?: Record<string, any> | null;
  whatsapp_templates?: {
    sale_message?: string;
    collection_message?: string;
  };
  credit_days?: number;
  role?: string;
  permissions?: string[];
  permissions_canonical?: string[];
  plan?: 'free' | 'basic' | 'pro' | 'business';
  modules?: BusinessModuleState[];
  rbac?: BusinessRbacMetadata;
  sync_status?: 'synced' | 'pending' | 'failed';
  is_offline_record?: boolean;
  client_operation_id?: string;
}

export type TreasuryAccountType = 'cash' | 'bank' | 'checking' | 'savings' | 'card' | 'wallet' | 'other' | string;

export interface TreasuryAccountTypeSummary {
  account_type: TreasuryAccountType;
  accounts_count: number;
  total_balance: number;
}

export interface TreasuryAccountsSummary {
  accounts_count: number;
  active_accounts_count: number;
  inactive_accounts_count: number;
  total_balance: number;
  by_type: TreasuryAccountTypeSummary[];
}

export interface TreasuryAccount {
  id: number;
  business_id: number;
  name: string;
  account_type: TreasuryAccountType;
  payment_method_key?: string | null;
  currency?: string | null;
  opening_balance: number;
  notes?: string | null;
  is_active: boolean;
  is_default?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  inflows_total?: number;
  outflows_total?: number;
  transfers_in_total?: number;
  transfers_out_total?: number;
  current_balance?: number;
  has_history?: boolean;
  history_usage?: Record<string, number | undefined>;
  [key: string]: any;
}

export interface TreasuryMovement {
  id: number | string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  direction?: 'in' | 'out';
  category?: string | null;
  source_type?: string | null;
  source_label?: string | null;
  flow_group?: string | null;
  scope?: 'operational' | 'financial' | null;
  treasury_account_id?: number | null;
  treasury_account_name?: string | null;
  treasury_account_type?: TreasuryAccountType | null;
  document_type?: string | null;
  document_id?: number | string | null;
  document_label?: string | null;
  customer_id?: number | null;
  customer_name?: string | null;
  counterparty_name?: string | null;
  counterparty_account_id?: number | null;
  counterparty_account_name?: string | null;
  counterparty_account_type?: TreasuryAccountType | null;
  payment_method?: string | null;
  [key: string]: any;
}

export interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  effective_permissions?: string[];
  stored_permissions?: string[];
  is_system?: boolean;
  business_id?: number | null;
  template_key?: string | null;
  is_suggested?: boolean;
  [key: string]: any;
}

export interface TeamMember {
  id: number;
  business_id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  role: string;
  role_id: number;
  status: 'active' | 'invited' | 'inactive';
  created_at: string;
  [key: string]: any;
}

export interface Invitation {
  id: number;
  business_id: number;
  email: string;
  role: string;
  role_id: number;
  status: 'pending' | 'accepted' | 'expired';
  expires_at: string;
  invited_by_name: string;
  [key: string]: any;
}

export interface TeamFeedback {
  id: number;
  business_id: number;
  user_id: number;
  user_name: string;
  type: 'suggestion' | 'complaint' | 'notice' | 'other';
  subject: string;
  message: string;
  status: 'unread' | 'read' | 'archived';
  created_at: string;
  [key: string]: any;
}

export type ReceivableStatus = 'current' | 'due_soon' | 'due_today' | 'overdue' | 'paid';

export interface CustomerCommercialSummary {
  total_purchases_value: number;
  total_purchases_count: number;
  last_purchase_date?: string | null;
  last_purchase_value: number;
  outstanding_balance: number;
  sales_outstanding_balance: number;
  invoice_outstanding_balance: number;
  total_paid: number;
  average_ticket: number;
  customer_status: 'with_balance' | 'new' | 'active' | 'inactive' | string;
  customer_status_label: string;
  sales_count: number;
  sales_total: number;
  payment_count: number;
  orders_count: number;
  orders_total: number;
  last_order_date?: string | null;
  last_order_value: number;
  invoice_count: number;
  invoice_total: number;
  invoice_payment_count: number;
  last_activity_date?: string | null;
  [key: string]: any;
}

export interface Customer {
  id: number;
  business_id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
  active?: boolean;
  balance: number;
  created_at: string;
  oldest_due_date?: string;
  days_since_oldest?: number;
  is_overdue?: boolean;
  receivable_status?: ReceivableStatus;
  receivable_status_label?: string;
  receivable_due_date?: string;
  receivable_term_days?: number;
  receivable_days_until_due?: number;
  receivable_days_overdue?: number;
  overdue_balance?: number;
  due_soon_balance?: number;
  due_today_balance?: number;
  current_balance?: number;
  receivable_invoice_count?: number;
  sales_balance?: number;
  invoice_balance?: number;
  total_balance?: number;
  sales_receivable_count?: number;
  invoice_receivable_count?: number;
  created_by_name?: string;
  created_by_role?: string;
  total_purchases_value?: number;
  total_purchases_count?: number;
  last_purchase_date?: string | null;
  last_purchase_value?: number;
  total_paid?: number;
  average_ticket?: number;
  customer_status?: 'with_balance' | 'new' | 'active' | 'inactive' | string;
  customer_status_label?: string;
  sales_count?: number;
  sales_total?: number;
  payment_count?: number;
  orders_count?: number;
  orders_total?: number;
  last_order_date?: string | null;
  last_order_value?: number;
  invoice_count?: number;
  invoice_total?: number;
  invoice_payment_count?: number;
  last_activity_date?: string | null;
  commercial_summary?: CustomerCommercialSummary;
  sync_status?: 'synced' | 'pending' | 'failed';
  is_offline_record?: boolean;
  offline_deleted?: boolean;
  client_operation_id?: string;
  [key: string]: any;
}

export interface CustomerHistoryEntry {
  id: string;
  entry_type: 'sale' | 'payment' | 'order' | 'invoice' | 'invoice_payment' | 'invoice_refund' | 'invoice_reversal' | string;
  date?: string | null;
  document_id?: number | string | null;
  document_label?: string | null;
  title: string;
  subtitle?: string | null;
  amount: number;
  signed_amount: number;
  balance?: number | null;
  status?: string | null;
  note?: string | null;
  related_sale_id?: number | null;
  related_invoice_id?: number | null;
  treasury_account_name?: string | null;
  [key: string]: any;
}

export interface CustomerHistoryResponse {
  customer_id: number;
  history: CustomerHistoryEntry[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    pages: number;
    has_more: boolean;
  };
  [key: string]: any;
}

export interface ReceivableItem {
  sale_id: number;
  customer_id: number;
  customer_name: string;
  customer_phone?: string | null;
  document_label: string;
  original_amount: number;
  total_paid: number;
  pending_balance: number;
  base_date: string;
  term_days: number;
  due_date: string;
  status: ReceivableStatus;
  status_label: string;
  days_until_due: number;
  days_overdue: number;
  [key: string]: any;
}

export interface ReceivablesCustomerSummary {
  customer_id: number;
  customer_name: string;
  customer_phone?: string | null;
  total_balance: number;
  overdue_balance: number;
  due_soon_balance: number;
  due_today_balance: number;
  current_balance: number;
  invoice_count: number;
  oldest_base_date?: string | null;
  nearest_due_date?: string | null;
  max_days_overdue: number;
  status: ReceivableStatus;
  status_label: string;
  [key: string]: any;
}

export interface ReceivablesSummary {
  total_pending: number;
  customers_with_balance: number;
  open_count: number;
  overdue_total: number;
  due_soon_total: number;
  due_today_total: number;
  current_total: number;
  [key: string]: any;
}

export interface ReceivablesOverview {
  summary: ReceivablesSummary;
  customers: ReceivablesCustomerSummary[];
  receivables: ReceivableItem[];
  settings: {
    default_term_days: number;
    due_soon_days: number;
  };
  [key: string]: any;
}

export type ProductFulfillmentMode = 'make_to_stock' | 'make_to_order' | 'resale_stock' | 'service';

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
  fulfillment_mode?: ProductFulfillmentMode | null;
  active: boolean;
  image?: string;
  barcodes?: string[];
  created_at: string;
  sync_status?: 'synced' | 'pending' | 'failed';
  is_offline_record?: boolean;
  offline_deleted?: boolean;
  client_operation_id?: string;
  [key: string]: any;
}

export interface SaleItem {
  product_id?: number;
  name: string;
  qty: number;
  quantity?: number;
  unit_price: number;
  total: number;
  fulfillment_mode?: ProductFulfillmentMode | null;
  inventory_effects?: {
    fulfillment_mode?: ProductFulfillmentMode | null;
    finished_goods_stock_decremented?: boolean;
    recipe_consumption_ids?: number[];
    raw_material_consumed?: boolean;
    raw_material_items?: Array<Record<string, unknown>>;
    raw_material_total_reference_cost?: number;
    raw_material_source_type?: string;
    reversed_at?: boolean;
  };
  [key: string]: any;
}

export interface PaymentAllocation {
  sale_id: number;
  amount: number;
  [key: string]: any;
}

export interface Payment {
  id: number;
  business_id?: number;
  customer_id?: number;
  customer_name?: string;
  sale_id?: number;
  amount: number;
  payment_date: string;
  method?: string;
  payment_method?: string;
  note?: string;
  treasury_account_id?: number | null;
  treasury_account_name?: string | null;
  treasury_account_type?: TreasuryAccountType | null;
  allocations?: PaymentAllocation[];
  created_at?: string;
  [key: string]: any;
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
  payment_method: 'cash' | 'transfer' | 'credit' | string;
  paid: boolean;
  status?: 'pending' | 'completed' | 'cancelled' | string;
  note?: string;
  created_at?: string;
  sync_status?: 'synced' | 'pending' | 'failed' | 'blocked' | 'conflicted';
  is_offline_record?: boolean;
  offline_deleted?: boolean;
  client_operation_id?: string;
  [key: string]: any;
}

export type QuoteStatus = 'draft' | 'sent' | 'approved' | 'rejected' | 'expired' | 'converted';

export interface QuoteItem {
  id?: number;
  quote_id?: number;
  product_id?: number | null;
  product_name?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  fulfillment_mode?: ProductFulfillmentMode | null;
  sort_order?: number | null;
  [key: string]: any;
}

export interface Quote {
  id: number;
  business_id: number;
  customer_id?: number | null;
  customer_name?: string | null;
  quote_code: string;
  status: QuoteStatus;
  issue_date: string;
  expiry_date?: string | null;
  subtotal: number;
  discount: number;
  total: number;
  notes?: string | null;
  terms?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  converted_sale_id?: number | null;
  converted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  items: QuoteItem[];
  [key: string]: any;
}

export interface OrderItem {
  product_id?: number;
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
  fulfillment_mode?: ProductFulfillmentMode | null;
  [key: string]: any;
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
  status: 'pending' | 'completed' | 'cancelled' | 'in_progress';
  note?: string;
  created_at?: string;
  [key: string]: any;
}

export interface Expense {
  id: number;
  business_id: number;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
  source_type?: 'manual' | 'recurring' | 'debt_payment' | 'supplier_payment' | 'purchase_payment' | string;
  payment_method?: string;
  treasury_account_id?: number | null;
  treasury_account_name?: string | null;
  treasury_account_type?: TreasuryAccountType | null;
  recurring_expense_id?: number | null;
  debt_id?: number | null;
  debt_payment_id?: number | null;
  raw_purchase_id?: number | null;
  raw_purchase_number?: string | null;
  supplier_payable_id?: number | null;
  supplier_payable_status?: SupplierPayableStatus | null;
  supplier_payment_id?: number | null;
  debt_scope?: 'operational' | 'financial' | null;
  created_by_name?: string;
  created_by_role?: string;
  [key: string]: any;
}

export interface ActiveContext {
  business_id: number;
  name: string;
  role: string;
  type: string;
  permissions: string[];
  [key: string]: any;
}

export interface AccessibleContext {
  business_id: number;
  business_name: string;
  role: string;
  role_id: number | null;
  context_type: 'owned' | 'member' | 'legacy_team';
  plan: string;
  status: string;
  [key: string]: any;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  activeContext: ActiveContext | null;
  accessibleContexts: AccessibleContext[];
  isAuthenticated: boolean;
  isHydrating: boolean;
  login: (user: User, token: string, activeContext?: ActiveContext | null, accessibleContexts?: AccessibleContext[]) => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
  selectContext: (context: ActiveContext) => void;
  [key: string]: any;
}

export interface DashboardStats {
  total_sales: number;
  total_expenses: number;
  balance: number;
  total_debt: number;
  [key: string]: any;
}

export interface ProductMovement {
  id: number;
  business_id: number;
  product_id: number;
  product_name: string;
  type: 'in' | 'out' | 'adjustment';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason?: string;
  created_at: string;
  created_by_name?: string;
  created_by_role?: string;
  [key: string]: any;
}

export type RawMaterialMovementType = 'in' | 'out' | 'adjustment';

export interface RawMaterial {
  id: number;
  business_id: number;
  name: string;
  sku?: string | null;
  unit: string;
  current_stock: number;
  minimum_stock: number;
  reference_cost?: number | null;
  notes?: string | null;
  is_active: boolean;
  is_below_minimum: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: any;
}

export interface RawMaterialMovement {
  id: number;
  raw_material_id: number;
  business_id: number;
  created_by?: number | null;
  raw_material_name?: string | null;
  movement_type: RawMaterialMovementType;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reference_cost?: number | null;
  notes?: string | null;
  created_at?: string | null;
  created_by_name?: string | null;
  created_by_role?: string | null;
  raw_purchase_id?: number | null;
  raw_purchase_number?: string | null;
  recipe_consumption_id?: number | null;
  [key: string]: any;
}

export type RawPurchaseStatus = 'draft' | 'confirmed' | 'cancelled';
export type RawPurchaseFinancialFlow = 'cash' | 'payable';
export type SupplierPayableStatus = 'pending' | 'partial' | 'paid';

export interface Supplier {
  id: number;
  business_id: number;
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  purchases_count?: number;
  confirmed_purchases_count?: number;
  last_purchase_date?: string | null;
  pending_payables_count?: number;
  pending_payables_balance?: number;
  [key: string]: any;
}

export interface RawPurchaseItem {
  id?: number;
  raw_purchase_id?: number;
  raw_material_id: number;
  raw_material_name?: string | null;
  raw_material_unit?: string | null;
  description?: string | null;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  created_at?: string | null;
  [key: string]: any;
}

export interface RawPurchase {
  id: number;
  business_id: number;
  supplier_id?: number | null;
  supplier_name?: string | null;
  purchase_number: string;
  status: RawPurchaseStatus;
  purchase_date: string;
  subtotal: number;
  total: number;
  notes?: string | null;
  created_by?: number | null;
  created_at?: string | null;
  updated_at?: string | null;
  items_count?: number;
  financial_flow?: RawPurchaseFinancialFlow | null;
  purchase_payment_method?: string | null;
  purchase_treasury_account_id?: number | null;
  purchase_treasury_account_name?: string | null;
  purchase_treasury_account_type?: TreasuryAccountType | null;
  supplier_payable_id?: number | null;
  supplier_payable_status?: SupplierPayableStatus | null;
  supplier_payable_balance_due?: number | null;
  items: RawPurchaseItem[];
  [key: string]: any;
}

export interface SupplierPayment {
  id: number;
  business_id: number;
  supplier_id: number;
  supplier_name?: string | null;
  supplier_payable_id: number;
  raw_purchase_id?: number | null;
  raw_purchase_number?: string | null;
  amount: number;
  payment_date: string;
  method?: string | null;
  treasury_account_id?: number | null;
  treasury_account_name?: string | null;
  treasury_account_type?: TreasuryAccountType | null;
  reference?: string | null;
  notes?: string | null;
  created_by?: number | null;
  created_at?: string | null;
  created_by_name?: string | null;
  created_by_role?: string | null;
  [key: string]: any;
}

export interface SupplierPayable {
  id: number;
  business_id: number;
  supplier_id: number;
  supplier_name?: string | null;
  supplier_is_active?: boolean | null;
  raw_purchase_id?: number | null;
  raw_purchase_number?: string | null;
  raw_purchase_status?: RawPurchaseStatus | null;
  amount_total: number;
  amount_paid: number;
  balance_due: number;
  status: SupplierPayableStatus;
  due_date?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  payments_count?: number;
  payments: SupplierPayment[];
  [key: string]: any;
}

export interface SupplierPayablesSupplierSummary {
  supplier_id: number;
  supplier_name: string;
  total_amount: number;
  amount_paid: number;
  balance_due: number;
  pending_count: number;
  [key: string]: any;
}

export interface RecipeItem {
  id?: number;
  recipe_id?: number;
  raw_material_id: number;
  raw_material_name?: string | null;
  raw_material_unit?: string | null;
  quantity_required: number;
  notes?: string | null;
  sort_order?: number | null;
  reference_cost?: number | null;
  [key: string]: any;
}

export interface Recipe {
  id: number;
  business_id: number;
  product_id: number;
  product_name?: string | null;
  product_type?: 'product' | 'service' | null;
  name: string;
  notes?: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  items_count?: number;
  consumptions_count?: number;
  theoretical_total_cost?: number | null;
  items: RecipeItem[];
  [key: string]: any;
}

export interface RecipeCostingItem {
  id?: number;
  raw_material_id?: number;
  raw_material_name?: string | null;
  raw_material_unit?: string | null;
  quantity_required?: number;
  cost_base?: number | null;
  reference_cost?: number | null;
  [key: string]: any;
}

export interface RecipeCosting {
  theoretical_unit_cost?: number | null;
  partial_theoretical_total_cost?: number | null;
  is_cost_complete?: boolean;
  cost_status?: string;
  cost_status_label?: string;
  cost_status_message?: string | null;
  cost_rule_label?: string | null;
  missing_cost_items_count: number;
  items?: RecipeCostingItem[];
  [key: string]: any;
}

export interface RecipeConsumptionItem {
  id: number;
  recipe_consumption_id: number;
  raw_material_id: number;
  raw_material_name?: string | null;
  raw_material_unit?: string | null;
  quantity_consumed: number;
  previous_stock: number;
  new_stock: number;
  raw_material_movement_id?: number | null;
  created_at?: string | null;
  [key: string]: any;
}

export interface RecipeConsumption {
  id: number;
  business_id: number;
  recipe_id?: number | null;
  recipe_name?: string | null;
  product_id?: number | null;
  product_name?: string | null;
  related_sale_id?: number | null;
  source_type?: 'sale' | 'manual' | null;
  quantity_produced_or_sold: number;
  notes?: string | null;
  created_by?: number | null;
  created_at?: string | null;
  created_by_name?: string | null;
  created_by_role?: string | null;
  items_count?: number;
  items: RecipeConsumptionItem[];
  [key: string]: any;
}

export interface CostCalculatorSimulation {
  estimated_total_cost?: number;
  estimated_unit_cost?: number;
  suggested_sale_price?: number | null;
  estimated_margin_percent?: number | null;
  materials_subtotal?: number | null;
  extras_subtotal: number;
  minimum_sale_price?: number | null;
  target_margin_percent?: number | null;
  items: Array<Record<string, any>>;
  [key: string]: any;
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled' | string;
export type InvoiceReceivableFilterStatus = 'all' | 'current' | 'due_soon' | 'due_today' | 'overdue' | 'paid' | string;

export interface InvoiceItem {
  id?: number;
  invoice_id?: number;
  product_id?: number | null;
  product_name?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  subtotal?: number;
  discount?: number;
  tax_rate?: number;
  total?: number;
  [key: string]: any;
}

export interface Invoice {
  id: number;
  business_id: number;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  customer_address?: string | null;
  invoice_number?: string | null;
  status: InvoiceStatus;
  status_base?: InvoiceStatus;
  issue_date: string;
  due_date?: string | null;
  currency: string;
  subtotal: number;
  discount?: number;
  discount_total: number;
  tax_total: number;
  total: number;
  balance?: number;
  amount_paid: number;
  gross_collected_amount?: number;
  refunded_amount?: number;
  reversed_amount?: number;
  net_collected_amount?: number;
  outstanding_balance: number;
  is_overdue?: boolean;
  days_until_due?: number | null;
  notes?: string | null;
  payment_method?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  sent_at?: string | null;
  paid_at?: string | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  sync_status?: 'synced' | 'pending' | 'failed' | 'blocked' | 'conflicted';
  is_offline_record?: boolean;
  offline_deleted?: boolean;
  client_operation_id?: string;
  items: InvoiceItem[];
  payments: InvoicePayment[];
  [key: string]: any;
}

export interface InvoicePayment {
  id: number;
  invoice_id: number;
  amount: number;
  signed_amount?: number;
  payment_date: string;
  payment_method?: string | null;
  treasury_account_id?: number | null;
  treasury_account_name?: string | null;
  event_type?: 'payment' | 'refund' | 'reversal' | string;
  source_payment_id?: number | null;
  note?: string | null;
  created_by_name?: string | null;
  created_at?: string | null;
  sync_status?: 'synced' | 'pending' | 'failed' | 'blocked' | 'conflicted';
  is_offline_record?: boolean;
  client_operation_id?: string;
  invoice_number?: string | null;
  [key: string]: any;
}

export interface InvoiceReceivable {
  invoice_id: number;
  business_id?: number;
  customer_id?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  invoice_number?: string | null;
  currency?: string;
  document_label?: string | null;
  original_amount?: number;
  total_paid?: number;
  pending_balance?: number;
  issue_date?: string;
  due_date?: string | null;
  status: string;
  status_base?: string;
  status_label?: string;
  total: number;
  paid_amount: number;
  balance_due: number;
  is_overdue?: boolean;
  days_until_due?: number | null;
  days_overdue: number;
  payment_method?: string | null;
  notes?: string | null;
  can_collect?: boolean;
  sync_status?: 'synced' | 'pending' | 'failed' | 'blocked' | 'conflicted';
  is_offline_record?: boolean;
  [key: string]: any;
}

export interface InvoiceReceivablesCustomerSummary {
  customer_id: number;
  customer_name: string;
  customer_phone?: string | null;
  total_balance: number;
  overdue_balance: number;
  due_soon_balance: number;
  due_today_balance: number;
  current_balance: number;
  invoice_count: number;
  nearest_due_date?: string | null;
  max_days_overdue: number;
  status: ReceivableStatus;
  status_label: string;
  [key: string]: any;
}

export interface InvoiceReceivablesOverview {
  summary: Record<string, any>;
  customers: InvoiceReceivablesCustomerSummary[];
  receivables: InvoiceReceivable[];
  settings?: Record<string, any>;
  [key: string]: any;
}

export interface InvoiceCustomerStatement {
  business_id?: number;
  customer_id?: number | null;
  customer_name?: string | null;
  customer: Customer;
  invoices: InvoiceReceivable[];
  payments: InvoicePayment[];
  summary: Record<string, any>;
  date_range?: {
    start_date?: string | null;
    end_date?: string | null;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface InvoiceSettings {
  numbering_prefix?: string;
  payment_terms_days?: number;
  notes_default?: string | null;
  [key: string]: any;
}
export interface SaleCostingRecipeConsumption {
  recipe_consumption_id?: number;
  recipe_name?: string | null;
  quantity?: number;
  total_cost?: number | null;
  [key: string]: any;
}

export interface SaleCostingItem {
  product_id?: number;
  product_name?: string;
  quantity?: number;
  quantity_sold?: number;
  revenue_total?: number | null;
  unit_cost?: number | null;
  total_cost?: number | null;
  consumed_cost_total?: number | null;
  partial_consumed_cost_total?: number | null;
  estimated_gross_margin?: number | null;
  cost_status_label?: string | null;
  recipe_consumptions?: SaleCostingRecipeConsumption[];
  [key: string]: any;
}

export interface SaleCosting {
  sale_id?: number;
  total_cost?: number | null;
  margin_amount?: number | null;
  margin_percent?: number | null;
  cost_status?: string;
  cost_status_label?: string;
  cost_status_message?: string | null;
  items: SaleCostingItem[];
  [key: string]: any;
}

export interface ProductCostingSummaryItem {
  product_id?: number;
  product_name?: string;
  revenue?: number;
  cost?: number;
  margin?: number;
  margin_percent?: number;
  cost_status?: string;
  cost_status_label?: string;
  cost_status_message?: string | null;
  costed_sales_count?: number;
  sales_count?: number;
  estimated_margin_percent?: number | null;
  estimated_gross_margin?: number | null;
  [key: string]: any;
}

export interface ProfitabilityAlert {
  id?: string | number;
  code?: string;
  type?: string;
  level?: string;
  title?: string;
  description?: string;
  message?: string;
  count?: number;
  focus?: string;
  status_filter?: string;
  [key: string]: any;
}

export interface ProfitabilitySalesItem {
  sale_id?: number;
  sale_date?: string;
  customer_name?: string | null;
  total?: number;
  total_cost?: number | null;
  margin_amount?: number | null;
  margin_percent?: number | null;
  status?: string;
  cost_status?: string;
  cost_status_message?: string | null;
  estimated_margin_percent?: number | null;
  estimated_gross_margin?: number | null;
  sale_total?: number | null;
  [key: string]: any;
}

export interface ProfitabilitySummary {
  sales_total?: number;
  total_sales?: number;
  gross_margin_total: number;
  margin_percent?: number | null;
  sales_count: number;
  complete_sales_count: number;
  incomplete_sales_count: number;
  no_consumption_sales_count: number;
  missing_cost_sales_count?: number;
  products_with_issues_count: number;
  [key: string]: any;
}

export interface ProfitabilityProductsResponse {
  products: ProductCostingSummaryItem[];
  items?: ProductCostingSummaryItem[];
  incomplete_items?: ProductCostingSummaryItem[];
  top_margin_items?: ProductCostingSummaryItem[];
  bottom_margin_items?: ProductCostingSummaryItem[];
  summary?: ProfitabilitySummary;
  [key: string]: any;
}

export interface ProfitabilitySalesResponse {
  sales: ProfitabilitySalesItem[];
  items?: ProfitabilitySalesItem[];
  no_consumption_items?: ProfitabilitySalesItem[];
  incomplete_items?: ProfitabilitySalesItem[];
  top_margin_items?: ProfitabilitySalesItem[];
  bottom_margin_items?: ProfitabilitySalesItem[];
  summary?: ProfitabilitySummary;
  [key: string]: any;
}

export interface ProfitabilityAlertsResponse {
  alerts: ProfitabilityAlert[];
  missing_cost_products_count?: number;
  incomplete_products_count?: number;
  no_consumption_products_count?: number;
  incomplete_sales_count?: number;
  no_consumption_sales_count?: number;
  missing_cost_sales_count?: number;
  products?: ProductCostingSummaryItem[];
  sales?: ProfitabilitySalesItem[];
  [key: string]: any;
}

export interface Reminder {
  id: number;
  business_id: number;
  title: string;
  description?: string;
  due_date: string;
  status: 'pending' | 'completed' | 'dismissed';
  created_at: string;
  created_by_name?: string;
  created_by_role?: string;
}

// ── Services / Agenda domain ─────────────────────────────────────────

export type BusinessType = 'retail' | 'services' | 'hybrid';
export type EmployeeCompensationType = 'salary' | 'percentage';

export interface Employee {
  id: number;
  business_id: number;
  name: string;
  phone?: string | null;
  role?: string | null;
  active: boolean;
  color?: string | null;
  compensation_type?: EmployeeCompensationType | null;
  salary_amount?: number | null;
  commission_percent?: number | null;
  compensation_notes?: string | null;
  created_at: string;
  [key: string]: any;
}

export interface ServiceItem {
  id: number;
  business_id: number;
  name: string;
  duration_minutes: number;
  price: number;
  category?: string | null;
  active: boolean;
  requires_employee: boolean;
  created_at: string;
  [key: string]: any;
}

export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no_show';

export interface Appointment {
  id: number;
  business_id: number;
  customer_id?: number | null;
  customer_name?: string | null;
  service_id: number;
  service_name_snapshot: string;
  employee_id?: number | null;
  employee_name_snapshot?: string | null;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  price_snapshot: number;
  notes?: string | null;
  created_at: string;
  completed_at?: string | null;
  linked_sale_id?: number | null;
  [key: string]: any;
}

export type AppointmentPaymentStatus = 'paid' | 'partial' | 'pending';

export interface AppointmentPayment {
  id: number;
  appointment_id: number;
  payment_method: string;
  amount_paid: number;
  payment_status: AppointmentPaymentStatus;
  balance_due: number;
  created_at: string;
  [key: string]: any;
}
