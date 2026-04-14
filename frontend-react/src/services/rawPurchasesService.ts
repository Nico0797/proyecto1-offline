import api from './api';
import {
  Expense,
  RawMaterial,
  RawMaterialMovement,
  RawPurchase,
  RawPurchaseFinancialFlow,
  RawPurchaseItem,
  RawPurchaseStatus,
  Supplier,
  TreasuryAccount,
} from '../types';
import {
  isPureOfflineRuntime,
  nextLocalNumericId,
  normalizeText,
  readCompatibleOfflineExpenses,
  readLocalCollection,
  writeCompatibleOfflineExpenses,
  writeLocalCollection,
} from './offlineLocalData';

export interface RawPurchaseFilters {
  status?: RawPurchaseStatus;
  search?: string;
  supplier_id?: number;
}

export interface RawPurchaseItemPayload {
  raw_material_id: number;
  description?: string | null;
  quantity: number;
  unit_cost: number;
}

export interface RawPurchasePayload {
  supplier_id?: number | null;
  purchase_number?: string | null;
  purchase_date: string;
  notes?: string | null;
  items: RawPurchaseItemPayload[];
}

const normalizeFilters = (filters?: RawPurchaseFilters) => {
  if (!filters) return undefined;
  const params: Record<string, string | number> = {};
  if (filters.status) params.status = filters.status;
  if (filters.search) params.search = filters.search;
  if (filters.supplier_id) params.supplier_id = filters.supplier_id;
  return params;
};

const RAW_PURCHASES_COLLECTION = 'raw_purchases';
const RAW_MATERIALS_COLLECTION = 'raw_materials';
const RAW_MOVEMENTS_COLLECTION = 'raw_material_movements';
const SUPPLIERS_COLLECTION = 'suppliers';
const TREASURY_ACCOUNTS_COLLECTION = 'treasury_accounts';

const calculateRawPurchaseItemSubtotal = (
  item: Pick<RawPurchaseItem, 'quantity' | 'unit_cost'> | Pick<RawPurchaseItemPayload, 'quantity' | 'unit_cost'>,
) => {
  return Number(((Number(item.quantity) || 0) * (Number(item.unit_cost) || 0)).toFixed(4));
};

const generatePurchaseNumber = (existingPurchases: RawPurchase[]) => {
  const today = new Date();
  const dayKey = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const todaysPurchases = existingPurchases.filter((purchase) => String(purchase.purchase_number || '').includes(dayKey));
  return `COMP-${dayKey}-${String(todaysPurchases.length + 1).padStart(3, '0')}`;
};

const buildPurchaseItems = (
  purchaseId: number,
  payloadItems: RawPurchaseItemPayload[],
  materials: RawMaterial[],
): RawPurchaseItem[] => {
  return payloadItems.map((item, index) => {
    const material = materials.find((entry) => entry.id === Number(item.raw_material_id));
    return {
      id: index + 1,
      raw_purchase_id: purchaseId,
      raw_material_id: Number(item.raw_material_id),
      raw_material_name: material?.name || item.description || 'Materia prima',
      raw_material_unit: material?.unit || null,
      description: item.description?.trim() || material?.name || null,
      quantity: Number(item.quantity || 0),
      unit_cost: Number(item.unit_cost || 0),
      subtotal: calculateRawPurchaseItemSubtotal(item),
      created_at: new Date().toISOString(),
    };
  });
};

const sortPurchases = (purchases: RawPurchase[]) => {
  return [...purchases].sort((left, right) => {
    const rightTime = new Date(right.purchase_date || right.created_at || 0).getTime();
    const leftTime = new Date(left.purchase_date || left.created_at || 0).getTime();
    return rightTime - leftTime;
  });
};

const enrichPurchase = (
  purchase: RawPurchase,
  suppliers: Supplier[],
  accounts: TreasuryAccount[],
): RawPurchase => {
  const supplier = suppliers.find((entry) => entry.id === purchase.supplier_id);
  const account = accounts.find((entry) => entry.id === purchase.purchase_treasury_account_id);
  return {
    ...purchase,
    supplier_name: purchase.supplier_name || supplier?.name || null,
    items_count: purchase.items?.length || 0,
    purchase_treasury_account_name: purchase.purchase_treasury_account_name || account?.name || null,
    purchase_treasury_account_type: purchase.purchase_treasury_account_type || account?.account_type || null,
  };
};

const readOfflineContext = (businessId: number) => {
  const purchases = readLocalCollection<RawPurchase>(businessId, RAW_PURCHASES_COLLECTION);
  const materials = readLocalCollection<RawMaterial>(businessId, RAW_MATERIALS_COLLECTION);
  const movements = readLocalCollection<RawMaterialMovement>(businessId, RAW_MOVEMENTS_COLLECTION);
  const suppliers = readLocalCollection<Supplier>(businessId, SUPPLIERS_COLLECTION);
  const treasuryAccounts = readLocalCollection<TreasuryAccount>(businessId, TREASURY_ACCOUNTS_COLLECTION);
  const expenses = readCompatibleOfflineExpenses(businessId);

  return {
    purchases,
    materials,
    movements,
    suppliers,
    treasuryAccounts,
    expenses,
  };
};

const persistOfflineContext = (businessId: number, context: ReturnType<typeof readOfflineContext>) => {
  writeLocalCollection(businessId, RAW_PURCHASES_COLLECTION, sortPurchases(context.purchases));
  writeLocalCollection(businessId, RAW_MATERIALS_COLLECTION, context.materials);
  writeLocalCollection(businessId, RAW_MOVEMENTS_COLLECTION, context.movements);
  writeCompatibleOfflineExpenses(businessId, context.expenses);
};

export const rawPurchasesService = {
  async list(businessId: number, filters?: RawPurchaseFilters): Promise<RawPurchase[]> {
    if (isPureOfflineRuntime()) {
      const { purchases, suppliers, treasuryAccounts } = readOfflineContext(businessId);
      return sortPurchases(purchases)
        .map((purchase) => enrichPurchase(purchase, suppliers, treasuryAccounts))
        .filter((purchase) => {
          if (filters?.status && purchase.status !== filters.status) return false;
          if (filters?.supplier_id && purchase.supplier_id !== filters.supplier_id) return false;
          if (filters?.search) {
            const haystack = [
              purchase.purchase_number,
              purchase.supplier_name,
              purchase.notes,
              ...((purchase.items || []).map((item) => item.raw_material_name || item.description || '')),
            ]
              .map(normalizeText)
              .join(' ');
            if (!haystack.includes(normalizeText(filters.search))) return false;
          }
          return true;
        });
    }

    const response = await api.get(`/businesses/${businessId}/raw-purchases`, {
      params: normalizeFilters(filters),
    });
    return response.data?.raw_purchases || [];
  },

  async get(businessId: number, purchaseId: number): Promise<RawPurchase> {
    if (isPureOfflineRuntime()) {
      const { purchases, suppliers, treasuryAccounts } = readOfflineContext(businessId);
      const purchase = purchases.find((entry) => entry.id === purchaseId);
      if (!purchase) {
        throw new Error('No encontramos esta compra en tu espacio local.');
      }
      return enrichPurchase(purchase, suppliers, treasuryAccounts);
    }

    const response = await api.get(`/businesses/${businessId}/raw-purchases/${purchaseId}`);
    return response.data.raw_purchase;
  },

  async create(businessId: number, payload: RawPurchasePayload): Promise<RawPurchase> {
    if (isPureOfflineRuntime()) {
      const context = readOfflineContext(businessId);
      const purchaseId = nextLocalNumericId(context.purchases);
      const items = buildPurchaseItems(purchaseId, payload.items, context.materials);
      const timestamp = new Date().toISOString();
      const purchase: RawPurchase = {
        id: purchaseId,
        business_id: businessId,
        supplier_id: payload.supplier_id ?? null,
        supplier_name: context.suppliers.find((entry) => entry.id === payload.supplier_id)?.name || null,
        purchase_number: payload.purchase_number?.trim() || generatePurchaseNumber(context.purchases),
        status: 'draft',
        purchase_date: payload.purchase_date,
        subtotal: Number(items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0).toFixed(4)),
        total: Number(items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0).toFixed(4)),
        notes: payload.notes?.trim() || null,
        created_at: timestamp,
        updated_at: timestamp,
        items_count: items.length,
        financial_flow: null,
        purchase_payment_method: null,
        purchase_treasury_account_id: null,
        purchase_treasury_account_name: null,
        purchase_treasury_account_type: null,
        supplier_payable_id: null,
        supplier_payable_status: null,
        supplier_payable_balance_due: null,
        items,
      };

      context.purchases = [purchase, ...context.purchases];
      persistOfflineContext(businessId, context);
      return enrichPurchase(purchase, context.suppliers, context.treasuryAccounts);
    }

    const response = await api.post(`/businesses/${businessId}/raw-purchases`, payload);
    return response.data.raw_purchase;
  },

  async update(businessId: number, purchaseId: number, payload: RawPurchasePayload): Promise<RawPurchase> {
    if (isPureOfflineRuntime()) {
      const context = readOfflineContext(businessId);
      const existing = context.purchases.find((entry) => entry.id === purchaseId);
      if (!existing) {
        throw new Error('No encontramos esta compra en tu espacio local.');
      }
      if (existing.status !== 'draft') {
        throw new Error('Solo puedes editar compras que sigan en borrador.');
      }

      const items = buildPurchaseItems(purchaseId, payload.items, context.materials);
      const total = Number(items.reduce((sum, item) => sum + Number(item.subtotal || 0), 0).toFixed(4));
      const updated: RawPurchase = {
        ...existing,
        supplier_id: payload.supplier_id ?? null,
        supplier_name: context.suppliers.find((entry) => entry.id === payload.supplier_id)?.name || null,
        purchase_number: payload.purchase_number?.trim() || existing.purchase_number,
        purchase_date: payload.purchase_date,
        subtotal: total,
        total,
        notes: payload.notes?.trim() || null,
        items_count: items.length,
        items,
        updated_at: new Date().toISOString(),
      };

      context.purchases = context.purchases.map((entry) => (entry.id === purchaseId ? updated : entry));
      persistOfflineContext(businessId, context);
      return enrichPurchase(updated, context.suppliers, context.treasuryAccounts);
    }

    const response = await api.put(`/businesses/${businessId}/raw-purchases/${purchaseId}`, payload);
    return response.data.raw_purchase;
  },

  async confirm(
    businessId: number,
    purchaseId: number,
    payload?: { financial_flow?: 'cash' | 'payable'; payment_method?: string | null; treasury_account_id?: number | null },
  ): Promise<RawPurchase> {
    if (isPureOfflineRuntime()) {
      const context = readOfflineContext(businessId);
      const existing = context.purchases.find((entry) => entry.id === purchaseId);
      if (!existing) {
        throw new Error('No encontramos esta compra en tu espacio local.');
      }
      if (existing.status !== 'draft') {
        return enrichPurchase(existing, context.suppliers, context.treasuryAccounts);
      }

      const financialFlow: RawPurchaseFinancialFlow = payload?.financial_flow || (existing.supplier_id ? 'payable' : 'cash');
      if (financialFlow === 'payable' && !existing.supplier_id) {
        throw new Error('Asocia un proveedor para confirmar esta compra como por pagar.');
      }

      const account = context.treasuryAccounts.find((entry) => entry.id === payload?.treasury_account_id);
      const updatedMaterials = [...context.materials];
      const updatedMovements = [...context.movements];

      existing.items.forEach((item) => {
        const materialIndex = updatedMaterials.findIndex((entry) => entry.id === item.raw_material_id);
        if (materialIndex < 0) return;
        const material = updatedMaterials[materialIndex];
        const previousStock = Number(material.current_stock || 0);
        const quantity = Number(item.quantity || 0);
        const newStock = Number((previousStock + quantity).toFixed(4));
        updatedMaterials[materialIndex] = {
          ...material,
          current_stock: newStock,
          reference_cost: Number(item.unit_cost || material.reference_cost || 0),
          is_below_minimum: newStock <= Number(material.minimum_stock || 0),
          updated_at: new Date().toISOString(),
        };

        updatedMovements.unshift({
          id: nextLocalNumericId(updatedMovements),
          business_id: businessId,
          raw_material_id: material.id,
          raw_material_name: material.name,
          movement_type: 'in',
          quantity,
          previous_stock: previousStock,
          new_stock: newStock,
          reference_cost: Number(item.unit_cost || 0),
          notes: `Ingreso por compra ${existing.purchase_number}`,
          created_at: new Date().toISOString(),
          raw_purchase_id: existing.id,
          raw_purchase_number: existing.purchase_number,
        });
      });

      let updatedExpenses = [...context.expenses];
      let payableStatus: RawPurchase['supplier_payable_status'] = null;
      let payableBalance: number | null = null;

      if (financialFlow === 'cash') {
        const expenseId = nextLocalNumericId(updatedExpenses);
        const expense: Expense = {
          id: expenseId,
          business_id: businessId,
          category: 'Compras de insumos',
          amount: Number(existing.total || 0),
          description: `Compra ${existing.purchase_number}`,
          expense_date: existing.purchase_date,
          source_type: 'purchase_payment',
          payment_method: payload?.payment_method || 'cash',
          treasury_account_id: account?.id ?? payload?.treasury_account_id ?? null,
          treasury_account_name: account?.name || null,
          treasury_account_type: account?.account_type || null,
          raw_purchase_id: existing.id,
          raw_purchase_number: existing.purchase_number,
          created_at: new Date().toISOString(),
        };

        updatedExpenses = [expense, ...updatedExpenses.filter((entry) => entry.raw_purchase_id !== existing.id)];
      } else {
        payableStatus = 'pending';
        payableBalance = Number(existing.total || 0);
        updatedExpenses = updatedExpenses.filter((entry) => entry.raw_purchase_id !== existing.id);
      }

      const confirmedPurchase: RawPurchase = {
        ...existing,
        status: 'confirmed',
        financial_flow: financialFlow,
        purchase_payment_method: financialFlow === 'cash' ? payload?.payment_method || 'cash' : null,
        purchase_treasury_account_id: financialFlow === 'cash' ? payload?.treasury_account_id ?? null : null,
        purchase_treasury_account_name: financialFlow === 'cash' ? account?.name || null : null,
        purchase_treasury_account_type: financialFlow === 'cash' ? account?.account_type || null : null,
        supplier_payable_status: payableStatus,
        supplier_payable_balance_due: payableBalance,
        updated_at: new Date().toISOString(),
      };

      context.materials = updatedMaterials;
      context.movements = updatedMovements;
      context.expenses = updatedExpenses;
      context.purchases = context.purchases.map((entry) => (entry.id === purchaseId ? confirmedPurchase : entry));
      persistOfflineContext(businessId, context);
      return enrichPurchase(confirmedPurchase, context.suppliers, context.treasuryAccounts);
    }

    const response = await api.post(`/businesses/${businessId}/raw-purchases/${purchaseId}/confirm`, payload);
    return response.data.raw_purchase;
  },

  async cancel(businessId: number, purchaseId: number): Promise<RawPurchase> {
    if (isPureOfflineRuntime()) {
      const context = readOfflineContext(businessId);
      const existing = context.purchases.find((entry) => entry.id === purchaseId);
      if (!existing) {
        throw new Error('No encontramos esta compra en tu espacio local.');
      }
      const cancelled: RawPurchase = {
        ...existing,
        status: 'cancelled',
        financial_flow: existing.status === 'confirmed' ? existing.financial_flow : null,
        updated_at: new Date().toISOString(),
      };
      context.purchases = context.purchases.map((entry) => (entry.id === purchaseId ? cancelled : entry));
      persistOfflineContext(businessId, context);
      return enrichPurchase(cancelled, context.suppliers, context.treasuryAccounts);
    }

    const response = await api.delete(`/businesses/${businessId}/raw-purchases/${purchaseId}`);
    return response.data.raw_purchase;
  },
};

export const calcRawPurchaseItemSubtotal = calculateRawPurchaseItemSubtotal;
