import api from './api';
import { canAccessFeatureInPlan, canAccessModule, FEATURES } from '../auth/plan';
import type { Customer, Product, Quote, RawMaterial, SupplierPayable } from '../types';
import type { RecurringExpense } from '../store/recurringExpenseStore';
import type { Business, BusinessModuleKey } from '../types';
import { isBusinessModuleEnabled } from '../types';
import { getAccessSnapshot } from '../hooks/useAccess';
import { localNotificationService } from './localNotificationService';
import {
  getBusinessBaseState,
  getBusinessPersonalizationSettings,
  getEnabledBusinessModules,
  getMissingBusinessProfileFields,
  getRecommendedModulesForBusinessType,
} from '../config/businessPersonalization';
import { isBackendCapabilitySupported } from '../config/backendCapabilities';

export type AlertType =
  | 'receivable'
  | 'recurring'
  | 'inventory'
  | 'quote'
  | 'debt'
  | 'supplier_payable'
  | 'profitability'
  | 'configuration'
  | 'goal'
  | 'system';
export type AlertCategory = 'operation' | 'inventory' | 'finance' | 'configuration';
export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'snoozed' | 'resolved';

export interface AlertAction {
  label: string;
  path: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  category: AlertCategory;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  dueDate?: string;
  entityId?: number | string;
  entityType?: 'customer' | 'product' | 'raw_material' | 'recurring' | 'quote' | 'debt' | 'supplier_payable' | 'business' | 'system';
  createdAt: string;
  count?: number;
  priorityLabel: 'Alta' | 'Media' | 'Baja';
  action?: AlertAction;
  data?: any;
}

const daysUntil = (target: Date, base: Date) => Math.ceil((target.getTime() - base.getTime()) / (1000 * 60 * 60 * 24));
const severityRank = (severity: AlertSeverity) => (severity === 'critical' ? 0 : severity === 'warning' ? 1 : 2);
const priorityLabel = (severity: AlertSeverity): Alert['priorityLabel'] => (
  severity === 'critical' ? 'Alta' : severity === 'warning' ? 'Media' : 'Baja'
);
const buildActionPath = (path: string, params?: Record<string, string | number | undefined>) => {
  if (!params) return path;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    query.set(key, String(value));
  });
  const search = query.toString();
  return search ? `${path}?${search}` : path;
};

export const alertsService = {
  async buildAlerts(
    businessOrId: Business | number,
    opts?: {
      lookaheadDays?: number;
      dueSoonDays?: number;
      stockThreshold?: number;
      permissions?: string[];
      business?: Business;
    }
  ) {
    if (!localStorage.getItem('token')) return [];

    const business = typeof businessOrId === 'number' ? opts?.business || null : businessOrId;
    const businessId = typeof businessOrId === 'number' ? businessOrId : businessOrId.id;

    // Safety check: if we get 403 on basic endpoints, stop building alerts
    // Or better, wrap each call in try/catch to be resilient

    const lookahead = opts?.lookaheadDays ?? 7;
    const dueSoon = opts?.dueSoonDays ?? 7;
    const stockTh = opts?.stockThreshold ?? 5;
    const accessSnapshot = getAccessSnapshot();
    const isActiveBusinessContext = accessSnapshot.activeBusiness?.id === businessId;
    const permissions = opts?.permissions ?? business?.permissions ?? (isActiveBusinessContext ? accessSnapshot.permissions : undefined);
    const currency = business?.currency || 'COP';
    const businessPlan = business?.plan || null;

    // Helper to check permissions
    const can = (perm: string) => {
      if (!perm) return true;

      if (isActiveBusinessContext && (accessSnapshot.isOwner || accessSnapshot.isAdmin)) {
        return true;
      }

      if (!permissions) return false;
      if (permissions.length === 0) return false;

      const scope = perm.split('.')[0];
      return (
        permissions.includes('*') ||
        permissions.includes('admin.*') ||
        permissions.includes(perm) ||
        permissions.includes(`${scope}.*`)
      );
    };

    const hasModule = (moduleKey?: BusinessModuleKey) => {
      if (!moduleKey) return true;
      if (isActiveBusinessContext) return accessSnapshot.hasModule(moduleKey);
      if (!business) return false;
      return isBusinessModuleEnabled(business.modules, moduleKey) && canAccessModule(businessPlan, moduleKey);
    };

    const canRead = (
      perm: string,
      moduleKey?: BusinessModuleKey,
      feature?: (typeof FEATURES)[keyof typeof FEATURES]
    ) => can(perm) && hasModule(moduleKey) && (!feature || canAccessFeatureInPlan(feature, businessPlan));

    const today = new Date();
    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(Number(value || 0));

    // Helper to safely fetch or return empty
    const safeGet = async <T extends Record<string, any>>(url: string, params?: Record<string, any>) => {
      try {
        const response = await api.get(url, { params, __silent403: true, __silent404: true } as any);
        return (response.data || {}) as T;
      } catch {
        return {} as T;
      }
    };

    const promises = {
      // Core business entities - only fetch if modules are enabled
      customers: canRead('customers.read', 'customers')
        ? safeGet<{ customers: Customer[] }>(`/businesses/${businessId}/customers`)
        : Promise.resolve({ customers: [] as Customer[] }),
      
      // Products only if products module is enabled (rare in current setup)
      products: canRead('products.read', 'products')
        ? safeGet<{ products: Product[] }>(`/businesses/${businessId}/products`)
        : Promise.resolve({ products: [] as Product[] }),
      
      // Recurring expenses only if feature is available in plan
      recurring: can('expenses.read') && canAccessFeatureInPlan(FEATURES.RECURRING_EXPENSES, businessPlan) && isBackendCapabilitySupported('recurring_expenses')
        ? safeGet<{ recurring_expenses: RecurringExpense[] }>(`/businesses/${businessId}/recurring-expenses`)
        : Promise.resolve({ recurring_expenses: [] as RecurringExpense[] }),
      
      // Quotes only if quotes module is enabled
      quotes: canRead('quotes.view', 'quotes')
        ? safeGet<{ quotes: Quote[] }>(`/businesses/${businessId}/quotes`)
        : Promise.resolve({ quotes: [] as Quote[] }),
      
      // Raw materials only if raw_inventory module is enabled
      rawMaterials: canRead('raw_inventory.read', 'raw_inventory') && isBackendCapabilitySupported('raw_inventory')
        ? safeGet<{ raw_materials: RawMaterial[] }>(`/businesses/${businessId}/raw-materials`)
        : Promise.resolve({ raw_materials: [] as RawMaterial[] }),
      
      // Supplier payables only if raw_inventory module is enabled
      supplierPayables: canRead('supplier_payables.read', 'raw_inventory') && isBackendCapabilitySupported('supplier_payables')
        ? safeGet<{ supplier_payables: SupplierPayable[] }>(`/businesses/${businessId}/supplier-payables`)
        : Promise.resolve({ supplier_payables: [] as SupplierPayable[] }),
      
      // Recipes only if raw_inventory module is enabled
      recipes: canRead('recipes.read', 'raw_inventory') && isBackendCapabilitySupported('recipes')
        ? safeGet<{ recipes: Array<{ id: number; name: string }> }>(`/businesses/${businessId}/recipes`)
        : Promise.resolve({ recipes: [] as Array<{ id: number; name: string }> }),
      
      // Skip these legacy/noisy endpoints entirely
      // debts: Now handled by receivables system
      // orders: Legacy, not used in current architecture
      // profitability: Use reports module instead
    };

    const [
      customersRes,
      productsRes,
      recurringRes,
      rawMaterialsRes,
      quotesRes,
      supplierPayablesRes,
      recipesRes,
    ] = await Promise.all([
      promises.customers,
      promises.products,
      promises.recurring,
      promises.rawMaterials,
      promises.quotes,
      promises.supplierPayables,
      promises.recipes,
    ]);

    const customers: Customer[] = customersRes.customers || [];
    const products: Product[] = productsRes.products || [];
    const recurring: RecurringExpense[] = recurringRes.recurring_expenses || [];
    const rawMaterials: RawMaterial[] = rawMaterialsRes.raw_materials || [];
    const quotes: Quote[] = quotesRes.quotes || [];
    const supplierPayables: SupplierPayable[] = supplierPayablesRes.supplier_payables || [];
    const recipes: Array<{ id: number; name: string }> = recipesRes.recipes || [];

    // Build alerts array
    const alerts: Alert[] = [];
    const nowIso = new Date().toISOString();
    const buildAlert = (payload: Omit<Alert, 'createdAt' | 'status' | 'priorityLabel'>): Alert => ({
      ...payload,
      status: 'active',
      createdAt: nowIso,
      priorityLabel: priorityLabel(payload.severity),
    });

    const overdueCustomers: Customer[] = [];
    const dueSoonCustomers: Customer[] = [];
    let overdueBalance = 0;
    let dueSoonBalance = 0;
    let oldestReceivableDate: string | undefined;

    customers.forEach((customer) => {
      const balance = Number(customer.balance || 0);
      if (balance <= 0) return;

      const dueDate = customer.receivable_due_date || customer.oldest_due_date;
      const isOverdue = customer.receivable_status === 'overdue' || Boolean(customer.is_overdue);
      const isDueSoon = !isOverdue && ['due_soon', 'due_today'].includes(customer.receivable_status || '');

      if (isOverdue) {
        overdueCustomers.push(customer);
        overdueBalance += balance;
        if (!oldestReceivableDate || new Date(dueDate || today).getTime() < new Date(oldestReceivableDate).getTime()) {
          oldestReceivableDate = dueDate || today.toISOString().split('T')[0];
        }
      } else if (isDueSoon) {
        dueSoonCustomers.push(customer);
        dueSoonBalance += balance;
      }
    });

    if (overdueCustomers.length > 0) {
      alerts.push(buildAlert({
        id: 'receivables_overdue',
        type: 'receivable',
        category: 'finance',
        severity: 'critical',
        title: `${overdueCustomers.length} cobro(s) vencido(s)`,
        description: `Tienes ${formatCurrency(overdueBalance)} pendientes en cartera vencida. Revisa clientes y registra abonos cuanto antes.`,
        dueDate: oldestReceivableDate,
        count: overdueCustomers.length,
        entityType: 'customer',
        action: { label: 'Ir a cuentas por cobrar', path: '/payments' },
        data: { customers: overdueCustomers, totalBalance: overdueBalance },
      }));
    }

    if (dueSoonCustomers.length > 0) {
      alerts.push(buildAlert({
        id: 'receivables_due_soon',
        type: 'receivable',
        category: 'finance',
        severity: 'warning',
        title: `${dueSoonCustomers.length} cobro(s) por vencer`,
        description: `Hay ${formatCurrency(dueSoonBalance)} próximos a vencerse. Conviene priorizar seguimiento antes de que se atrasen.`,
        count: dueSoonCustomers.length,
        entityType: 'customer',
        action: { label: 'Revisar cartera', path: '/payments' },
        data: { customers: dueSoonCustomers, totalBalance: dueSoonBalance },
      }));
    }

    const activeRecurring = recurring.filter((item) => item.is_active && item.next_due_date);
    const overdueRecurringCash = activeRecurring.filter((item) => {
      const diff = daysUntil(new Date(item.next_due_date!), today);
      return (item.payment_flow || 'cash') === 'cash' && diff < 0;
    });
    const dueSoonRecurringCash = activeRecurring.filter((item) => {
      const diff = daysUntil(new Date(item.next_due_date!), today);
      return (item.payment_flow || 'cash') === 'cash' && diff >= 0 && diff <= dueSoon;
    });
    const overdueRecurringPayable = activeRecurring.filter((item) => {
      const diff = daysUntil(new Date(item.next_due_date!), today);
      return (item.payment_flow || 'cash') === 'payable' && diff < 0;
    });
    const dueSoonRecurringPayable = activeRecurring.filter((item) => {
      const diff = daysUntil(new Date(item.next_due_date!), today);
      return (item.payment_flow || 'cash') === 'payable' && diff >= 0 && diff <= dueSoon;
    });

    if (overdueRecurringCash.length > 0) {
      alerts.push(buildAlert({
        id: 'recurring_cash_overdue',
        type: 'recurring',
        category: 'finance',
        severity: 'warning',
        title: `${overdueRecurringCash.length} pago(s) recurrente(s) directo(s) vencido(s)`,
        description: 'Hay programaciones de salida directa de caja que ya vencieron y todavía no se han registrado como movimiento real.',
        count: overdueRecurringCash.length,
        entityType: 'recurring',
        action: { label: 'Revisar programación recurrente', path: buildActionPath('/expenses', { tab: 'recurring' }) },
        data: { recurring: overdueRecurringCash },
      }));
    }

    if (dueSoonRecurringCash.length > 0) {
      alerts.push(buildAlert({
        id: 'recurring_cash_due_soon',
        type: 'recurring',
        category: 'finance',
        severity: 'info',
        title: `${dueSoonRecurringCash.length} pago(s) recurrente(s) directo(s) por vencer`,
        description: 'Hay salidas de caja programadas que vencerán pronto. Esto te ayuda a preparar liquidez antes de registrarlas.',
        count: dueSoonRecurringCash.length,
        entityType: 'recurring',
        action: { label: 'Ver programación recurrente', path: buildActionPath('/expenses', { tab: 'recurring' }) },
        data: { recurring: dueSoonRecurringCash },
      }));
    }

    if (overdueRecurringPayable.length > 0) {
      alerts.push(buildAlert({
        id: 'recurring_payable_overdue',
        type: 'recurring',
        category: 'finance',
        severity: 'warning',
        title: `${overdueRecurringPayable.length} obligación(es) recurrente(s) sin generar vencida(s)`,
        description: 'Hay programaciones recurrentes configuradas como obligación que ya vencieron y aún no se han convertido en cuenta por pagar.',
        count: overdueRecurringPayable.length,
        entityType: 'recurring',
        action: { label: 'Generar obligaciones pendientes', path: buildActionPath('/expenses', { tab: 'recurring' }) },
        data: { recurring: overdueRecurringPayable },
      }));
    }

    if (dueSoonRecurringPayable.length > 0) {
      alerts.push(buildAlert({
        id: 'recurring_payable_due_soon',
        type: 'recurring',
        category: 'finance',
        severity: 'info',
        title: `${dueSoonRecurringPayable.length} obligación(es) recurrente(s) por generar`,
        description: 'Hay programaciones recurrentes que pronto deberán convertirse en obligación pendiente, sin impactar caja todavía.',
        count: dueSoonRecurringPayable.length,
        entityType: 'recurring',
        action: { label: 'Revisar programación recurrente', path: buildActionPath('/expenses', { tab: 'recurring' }) },
        data: { recurring: dueSoonRecurringPayable },
      }));
    }

    // Skip debts alerts - now handled by receivables system

    // Skip orders commitment map - legacy system not used in current architecture
    const committedByProduct = new Map<number, number>();

    const noStockProducts: Product[] = [];
    const lowStockProducts: Product[] = [];
    products.forEach((product) => {
      if (product.type === 'service' || !product.active) return;
      const threshold = Number(product.low_stock_threshold || stockTh);
      const committed = committedByProduct.get(product.id) || 0;
      const available = Number(product.stock || 0) - committed;
      if (available <= 0) {
        noStockProducts.push(product);
      } else if (available <= threshold) {
        lowStockProducts.push(product);
      }
    });

    if (noStockProducts.length > 0) {
      alerts.push(buildAlert({
        id: 'inventory_no_stock',
        type: 'inventory',
        category: 'inventory',
        severity: 'critical',
        title: `${noStockProducts.length} producto(s) sin stock disponible`,
        description: `Algunos productos ya no tienen stock disponible para vender. Revisa inventario y repón cuanto antes.`,
        count: noStockProducts.length,
        entityType: 'product',
        action: { label: 'Ir a productos', path: '/products' },
        data: { products: noStockProducts },
      }));
    }

    if (lowStockProducts.length > 0) {
      alerts.push(buildAlert({
        id: 'inventory_low_stock',
        type: 'inventory',
        category: 'inventory',
        severity: 'warning',
        title: `${lowStockProducts.length} producto(s) con stock bajo`,
        description: `Tienes productos cerca del umbral mínimo. Programa reposición antes de afectar la operación.`,
        count: lowStockProducts.length,
        entityType: 'product',
        action: { label: 'Revisar productos', path: '/products' },
        data: { products: lowStockProducts },
      }));
    }

    if (hasModule('raw_inventory') && can('raw_inventory.read') && rawMaterials.length === 0) {
      alerts.push(buildAlert({
        id: 'raw_inventory_empty',
        type: 'inventory',
        category: 'inventory',
        severity: 'info',
        title: 'Aún no has cargado insumos básicos',
        description: 'Tu negocio tiene bodega habilitada, pero todavía no hay materias primas registradas. Cargar los insumos te ayudará a controlar compras y costos.',
        count: 0,
        entityType: 'raw_material',
        action: { label: 'Crear materia prima', path: '/raw-inventory' },
      }));
    }

    const lowRawMaterials = rawMaterials.filter((item) => item.is_active && (item.is_below_minimum || Number(item.current_stock || 0) <= Number(item.minimum_stock || 0)));
    if (lowRawMaterials.length > 0) {
      alerts.push(buildAlert({
        id: 'raw_inventory_low_stock',
        type: 'inventory',
        category: 'inventory',
        severity: 'warning',
        title: `${lowRawMaterials.length} materia(s) prima(s) bajo mínimo`,
        description: 'La bodega está marcando insumos por debajo del mínimo. Puedes registrar una compra o ajustar stock para mantener continuidad.',
        count: lowRawMaterials.length,
        entityType: 'raw_material',
        action: { label: 'Registrar compra', path: '/raw-purchases' },
        data: { rawMaterials: lowRawMaterials },
      }));
    }

    const rawMaterialsWithoutCost = rawMaterials.filter((item) => item.is_active && (!item.reference_cost || Number(item.reference_cost) <= 0));
    if (rawMaterialsWithoutCost.length > 0) {
      alerts.push(buildAlert({
        id: 'raw_inventory_missing_cost',
        type: 'inventory',
        category: 'inventory',
        severity: 'info',
        title: `${rawMaterialsWithoutCost.length} materia(s) prima(s) sin costo base`,
        description: 'Hay insumos sin costo referencial. Completar ese dato mejora la calculadora y las alertas de rentabilidad.',
        count: rawMaterialsWithoutCost.length,
        entityType: 'raw_material',
        action: { label: 'Completar costos', path: '/raw-inventory' },
        data: { rawMaterials: rawMaterialsWithoutCost },
      }));
    }

    if (hasModule('raw_inventory') && can('recipes.read') && rawMaterials.length > 0 && recipes.length === 0) {
      alerts.push(buildAlert({
        id: 'recipes_empty',
        type: 'configuration',
        category: 'inventory',
        severity: 'info',
        title: 'Tienes insumos pero aún no has creado recetas',
        description: 'Si produces o transformas materias primas, crear recetas te ayudará a costear mejor y registrar consumos sin perder trazabilidad.',
        count: 0,
        entityType: 'system',
        action: { label: 'Ir a recetas', path: '/recipes' },
      }));
    }

    const activeQuotes = quotes.filter((quote) => ['draft', 'sent', 'approved'].includes(quote.status));
    const expiredQuotes = activeQuotes.filter((quote) => {
      if (!quote.expiry_date) return false;
      return daysUntil(new Date(quote.expiry_date), today) < 0;
    });
    const expiringQuotes = activeQuotes.filter((quote) => {
      if (!quote.expiry_date) return false;
      const diff = daysUntil(new Date(quote.expiry_date), today);
      return diff >= 0 && diff <= lookahead;
    });

    if (expiredQuotes.length > 0) {
      alerts.push(buildAlert({
        id: 'quotes_expired',
        type: 'quote',
        category: 'operation',
        severity: 'warning',
        title: `${expiredQuotes.length} cotización(es) vencida(s)`,
        description: 'Hay propuestas que ya vencieron. Revisa si deben renovarse, rechazarse o convertirse a venta.',
        count: expiredQuotes.length,
        entityType: 'quote',
        action: { label: 'Revisar cotizaciones', path: '/quotes' },
        data: { quotes: expiredQuotes },
      }));
    }

    if (expiringQuotes.length > 0) {
      alerts.push(buildAlert({
        id: 'quotes_expiring',
        type: 'quote',
        category: 'operation',
        severity: 'info',
        title: `${expiringQuotes.length} cotización(es) por vencer`,
        description: 'Algunas cotizaciones están cerca de vencer. Conviene dar seguimiento antes de perder la oportunidad comercial.',
        count: expiringQuotes.length,
        entityType: 'quote',
        action: { label: 'Seguir cotizaciones', path: '/quotes' },
        data: { quotes: expiringQuotes },
      }));
    }

    const openSupplierPayables = supplierPayables.filter((payable) => payable.status !== 'paid' && Number(payable.balance_due || 0) > 0);
    const overdueSupplierPayables = openSupplierPayables.filter((payable) => payable.due_date && daysUntil(new Date(payable.due_date), today) < 0);
    const dueSoonSupplierPayables = openSupplierPayables.filter((payable) => {
      if (!payable.due_date) return false;
      const diff = daysUntil(new Date(payable.due_date), today);
      return diff >= 0 && diff <= dueSoon;
    });

    if (overdueSupplierPayables.length > 0) {
      alerts.push(buildAlert({
        id: 'supplier_payables_overdue',
        type: 'supplier_payable',
        category: 'finance',
        severity: 'critical',
        title: `${overdueSupplierPayables.length} cuenta(s) por pagar vencida(s)`,
        description: 'Hay obligaciones vencidas con proveedores. Revísalas para evitar fricción en abastecimiento.',
        count: overdueSupplierPayables.length,
        entityType: 'supplier_payable',
        action: { label: 'Ir a cuentas por pagar', path: buildActionPath('/expenses', { tab: 'payables' }) },
        data: { payables: overdueSupplierPayables, scope: 'operational' },
      }));
    }

    if (dueSoonSupplierPayables.length > 0) {
      alerts.push(buildAlert({
        id: 'supplier_payables_due_soon',
        type: 'supplier_payable',
        category: 'finance',
        severity: 'warning',
        title: `${dueSoonSupplierPayables.length} cuenta(s) por pagar próxima(s)`,
        description: 'Tienes pagos a proveedores próximos a vencer. Esto te ayuda a priorizar caja y compras.',
        count: dueSoonSupplierPayables.length,
        entityType: 'supplier_payable',
        action: { label: 'Revisar obligaciones', path: buildActionPath('/expenses', { tab: 'payables' }) },
        data: { payables: dueSoonSupplierPayables, scope: 'operational' },
      }));
    }

    const canManageBusiness = can('business.update');
    if (business && canManageBusiness) {
      const personalization = getBusinessPersonalizationSettings(business);
      const businessBaseState = getBusinessBaseState(business);
      const enabledModules = getEnabledBusinessModules(business).filter((moduleKey) => canAccessModule(businessPlan, moduleKey));
      const recommendedModules = personalization.onboarding.suggested_modules?.length
        ? personalization.onboarding.suggested_modules
        : personalization.business_type
          ? getRecommendedModulesForBusinessType(personalization.business_type)
          : [];
      const recommendedModulesInPlan = recommendedModules.filter((moduleKey) => canAccessModule(businessPlan, moduleKey));
      const missingProfileFields = getMissingBusinessProfileFields(business);
      const missingRecommendedModules = recommendedModulesInPlan.filter((moduleKey) => !enabledModules.includes(moduleKey));

      if (businessBaseState.needsReview) {
        alerts.push(buildAlert({
          id: 'configuration_personalization_pending',
          type: 'configuration',
          category: 'configuration',
          severity: 'info',
          title: 'Revisa la configuración base del negocio',
          description: 'Detectamos una base razonable con las secciones actuales. Si quieres dejarla fija o cambiarla, puedes hacerlo desde Personalización.',
          entityType: 'business',
          action: { label: 'Revisar personalización', path: '/settings?tab=personalization' },
        }));
      }

      if (missingProfileFields.length > 0) {
        alerts.push(buildAlert({
          id: 'configuration_business_profile',
          type: 'configuration',
          category: 'configuration',
          severity: 'warning',
          title: 'Completa los datos base del negocio',
          description: `Faltan datos como ${missingProfileFields.slice(0, 3).join(', ')}. Tener la ficha completa mejora documentos, configuración y soporte.`,
          count: missingProfileFields.length,
          entityType: 'business',
          action: { label: 'Editar negocio', path: '/settings?tab=business' },
          data: { missingFields: missingProfileFields },
        }));
      }

      if (missingRecommendedModules.length > 0) {
        alerts.push(buildAlert({
          id: 'configuration_missing_modules',
          type: 'configuration',
          category: 'configuration',
          severity: 'info',
          title: 'Hay secciones recomendadas sin activar',
          description: `Según tu tipo de negocio, faltan ${missingRecommendedModules.length} sección(es) por activar para completar el flujo sugerido.`,
          count: missingRecommendedModules.length,
          entityType: 'business',
          action: { label: 'Revisar secciones', path: '/settings?tab=personalization' },
          data: { modules: missingRecommendedModules },
        }));
      }
    }

    alerts.sort((a, b) => {
      const bySeverity = severityRank(a.severity) - severityRank(b.severity);
      if (bySeverity !== 0) return bySeverity;
      const byCount = Number(b.count || 0) - Number(a.count || 0);
      if (byCount !== 0) return byCount;
      const aDate = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      const bDate = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_SAFE_INTEGER;
      return aDate - bDate;
    });

    return alerts;
  },

  async checkAndScheduleNotifications(businessOrId: Business | number, permissions: string[] = []) {
    try {
      const alerts = await this.buildAlerts(businessOrId, {
        lookaheadDays: 3,
        dueSoonDays: 1,
        permissions,
        business: typeof businessOrId === 'number' ? undefined : businessOrId,
      });

      const criticalAlerts = alerts.filter((alert) =>
        (alert.severity === 'critical' || (alert.type === 'recurring' && alert.severity === 'warning')) && alert.status === 'active'
      );

      // Limitar a 5 notificaciones para no saturar
      const alertsToNotify = criticalAlerts.slice(0, 5);

      for (const alert of alertsToNotify) {
        let channel: 'alerts_critical' | 'alerts_info' = 'alerts_info';
        if (alert.severity === 'critical') channel = 'alerts_critical';

        // Solo notificar si es realmente urgente
        await localNotificationService.schedule(
          alert.title,
          alert.description,
          { type: alert.type, entityId: alert.entityId, path: alert.action?.path, scope: alert.data?.scope },
          undefined,
          channel
        );
      }
    } catch (error) {
      console.error('Error scheduling alert notifications:', error);
    }
  }
};
