import api from './api';
import { TreasuryAccount, TreasuryAccountsSummary, TreasuryMovement } from '../types';
import { offlineSyncService } from './offlineSyncService';
import { isPureOfflineRuntime, nextLocalNumericId, normalizeText, readCompatibleOfflineExpenses, readLocalCollection, writeLocalCollection } from './offlineLocalData';

export interface TreasuryAccountsResponse {
  accounts: TreasuryAccount[];
  summary?: TreasuryAccountsSummary;
}

export interface TreasuryAccountsFilters {
  account_type?: string;
  include_inactive?: boolean;
}

export interface TreasuryAccountPayload {
  name: string;
  account_type: string;
  currency?: string | null;
  opening_balance?: number;
  notes?: string | null;
  is_active?: boolean;
  is_default?: boolean;
}

export interface TreasuryAccountMutationResponse {
  account: TreasuryAccount;
}

export interface TreasuryMovementFilters {
  account_id?: number;
  account_type?: string;
  origin?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

export interface TreasuryMovementsResponse {
  movements: TreasuryMovement[];
}

const TREASURY_ACCOUNTS_COLLECTION = 'treasury_accounts';

const buildMovementParams = (filters?: TreasuryMovementFilters) => {
  const params: Record<string, string | number> = {};

  if (!filters) return params;

  if (filters.account_id) params.account_id = filters.account_id;
  if (filters.account_type) params.account_type = filters.account_type;
  if (filters.origin) params.origin = filters.origin;
  if (filters.start_date) params.start_date = filters.start_date;
  if (filters.end_date) params.end_date = filters.end_date;
  if (filters.search) params.search = filters.search;

  return params;
};

const readLocalAccounts = (businessId: number) => readLocalCollection<TreasuryAccount>(businessId, TREASURY_ACCOUNTS_COLLECTION);

const sortAccounts = (accounts: TreasuryAccount[]) => {
  return [...accounts].sort((left, right) => {
    if (Boolean(left.is_default) !== Boolean(right.is_default)) {
      return Number(Boolean(right.is_default)) - Number(Boolean(left.is_default));
    }
    if (Boolean(left.is_active) !== Boolean(right.is_active)) {
      return Number(Boolean(right.is_active)) - Number(Boolean(left.is_active));
    }
    return normalizeText(left.name).localeCompare(normalizeText(right.name));
  });
};

const buildLocalMovements = async (businessId: number, filters?: TreasuryMovementFilters): Promise<TreasuryMovement[]> => {
  const [sales, payments, receivablesOverview] = await Promise.all([
    offlineSyncService.getSalesFromLocal(businessId),
    offlineSyncService.getPaymentsFromLocal(businessId),
    offlineSyncService.buildReceivablesOverviewFromLocal(businessId),
  ]);
  const expenses = readCompatibleOfflineExpenses(businessId);
  const accounts = readLocalAccounts(businessId);
  const accountById = new Map(accounts.map((account) => [account.id, account]));
  const currency = accounts.find((account) => account.currency)?.currency || 'COP';

  const saleMovements: TreasuryMovement[] = sales
    .filter((sale: any) => Number(sale.amount_paid ?? sale.collected_amount ?? sale.total ?? 0) > 0)
    .map((sale: any) => {
      const account = accountById.get(Number(sale.treasury_account_id));
      return {
        id: `sale-${sale.id}`,
        date: sale.sale_date || sale.created_at || new Date().toISOString(),
        description: sale.customer_name ? `Venta a ${sale.customer_name}` : `Venta ${sale.id}`,
        amount: Number(sale.amount_paid ?? sale.collected_amount ?? sale.total ?? 0),
        type: 'income',
        direction: 'in',
        category: 'Ventas',
        source_type: 'sale',
        source_label: 'Venta',
        flow_group: 'sales',
        scope: 'operational',
        treasury_account_id: account?.id ?? sale.treasury_account_id ?? null,
        treasury_account_name: account?.name || sale.treasury_account_name || null,
        treasury_account_type: account?.account_type || sale.treasury_account_type || null,
        currency: account?.currency || currency,
        payment_method: sale.payment_method || null,
        document_label: sale.sale_number || sale.reference || null,
        counterparty_name: sale.customer_name || null,
      };
    });

  const receivableMovements: TreasuryMovement[] = payments.map((payment: any) => {
    const account = accountById.get(Number(payment.treasury_account_id));
    return {
      id: `payment-${payment.id}`,
      date: payment.payment_date || payment.created_at || new Date().toISOString(),
      description: payment.customer_name ? `Cobro de ${payment.customer_name}` : 'Cobro',
      amount: Number(payment.amount || 0),
      type: Number(payment.amount || 0) >= 0 ? 'income' : 'expense',
      direction: Number(payment.amount || 0) >= 0 ? 'in' : 'out',
      category: 'Cartera',
      source_type: 'accounts_receivable_payment',
      source_label: 'Cobro',
      flow_group: 'receivables',
      scope: 'financial',
      treasury_account_id: account?.id ?? payment.treasury_account_id ?? null,
      treasury_account_name: account?.name || payment.treasury_account_name || null,
      treasury_account_type: account?.account_type || payment.treasury_account_type || null,
      currency: account?.currency || currency,
      payment_method: payment.payment_method || null,
      document_label: payment.reference || payment.invoice_number || null,
      counterparty_name: payment.customer_name || null,
    };
  });

  const invoiceMovements: TreasuryMovement[] = (receivablesOverview.payments || []).map((payment: any) => {
    const account = accountById.get(Number(payment.treasury_account_id));
    return {
      id: `invoice-payment-${payment.id}`,
      date: payment.payment_date || payment.created_at || new Date().toISOString(),
      description: payment.invoice_number ? `Pago factura ${payment.invoice_number}` : 'Pago de factura',
      amount: Math.abs(Number(payment.signed_amount || payment.amount || 0)),
      type: Number(payment.signed_amount || payment.amount || 0) >= 0 ? 'income' : 'expense',
      direction: Number(payment.signed_amount || payment.amount || 0) >= 0 ? 'in' : 'out',
      category: 'Facturas',
      source_type: 'invoice_payment',
      source_label: 'Factura',
      flow_group: 'invoices',
      scope: 'financial',
      treasury_account_id: account?.id ?? payment.treasury_account_id ?? null,
      treasury_account_name: account?.name || payment.treasury_account_name || null,
      treasury_account_type: account?.account_type || payment.treasury_account_type || null,
      currency: account?.currency || currency,
      payment_method: payment.payment_method || null,
      document_label: payment.invoice_number || null,
      counterparty_name: payment.customer_name || null,
    };
  });

  const expenseMovements: TreasuryMovement[] = expenses.map((expense) => {
    const account = accountById.get(Number(expense.treasury_account_id));
    return {
      id: `expense-${expense.id}`,
      date: expense.expense_date || expense.created_at || new Date().toISOString(),
      description: expense.description || expense.category || 'Gasto',
      amount: Math.abs(Number(expense.amount || 0)),
      type: 'expense',
      direction: 'out',
      category: expense.category || null,
      source_type: expense.source_type || 'expense',
      source_label: 'Gasto',
      flow_group: 'expenses',
      scope: 'operational',
      treasury_account_id: account?.id ?? expense.treasury_account_id ?? null,
      treasury_account_name: account?.name || expense.treasury_account_name || null,
      treasury_account_type: account?.account_type || expense.treasury_account_type || null,
      currency: account?.currency || currency,
      payment_method: expense.payment_method || null,
      document_label: expense.raw_purchase_number || null,
      counterparty_name: expense.category || null,
    };
  });

  const combined = [...saleMovements, ...receivableMovements, ...invoiceMovements, ...expenseMovements]
    .filter((movement) => {
      if (filters?.account_id && Number(movement.treasury_account_id || 0) !== Number(filters.account_id)) return false;
      if (filters?.account_type && String(movement.treasury_account_type || '') !== String(filters.account_type)) return false;
      if (filters?.origin && String(movement.source_type || '') !== String(filters.origin)) return false;
      if (filters?.start_date && String(movement.date || '').slice(0, 10) < filters.start_date) return false;
      if (filters?.end_date && String(movement.date || '').slice(0, 10) > filters.end_date) return false;
      if (filters?.search) {
        const haystack = [
          movement.description,
          movement.document_label,
          movement.counterparty_name,
          movement.treasury_account_name,
          movement.category,
        ].map(normalizeText).join(' ');
        if (!haystack.includes(normalizeText(filters.search))) return false;
      }
      return true;
    })
    .sort((left, right) => new Date(right.date || 0).getTime() - new Date(left.date || 0).getTime());

  return combined;
};

const buildAccountsSummary = (accounts: TreasuryAccount[]): TreasuryAccountsSummary => {
  const byTypeMap = new Map<string, { account_type: string; accounts_count: number; total_balance: number }>();

  accounts.forEach((account) => {
    const key = String(account.account_type || 'other');
    const current = byTypeMap.get(key) || { account_type: key, accounts_count: 0, total_balance: 0 };
    current.accounts_count += 1;
    current.total_balance += Number(account.current_balance || 0);
    byTypeMap.set(key, current);
  });

  return {
    accounts_count: accounts.length,
    active_accounts_count: accounts.filter((account) => account.is_active).length,
    inactive_accounts_count: accounts.filter((account) => !account.is_active).length,
    total_balance: accounts.reduce((sum, account) => sum + Number(account.current_balance || 0), 0),
    by_type: Array.from(byTypeMap.values()),
  };
};

const decorateAccountsWithBalance = async (businessId: number, accounts: TreasuryAccount[]) => {
  const movements = await buildLocalMovements(businessId);
  const aggregates = new Map<number, { inflows: number; outflows: number }>();

  movements.forEach((movement) => {
    const accountId = Number(movement.treasury_account_id || 0);
    if (!accountId) return;
    const current = aggregates.get(accountId) || { inflows: 0, outflows: 0 };
    if (movement.type === 'income' || movement.direction === 'in') {
      current.inflows += Number(movement.amount || 0);
    } else {
      current.outflows += Number(movement.amount || 0);
    }
    aggregates.set(accountId, current);
  });

  return sortAccounts(accounts).map((account) => {
    const aggregate = aggregates.get(account.id) || { inflows: 0, outflows: 0 };
    const openingBalance = Number(account.opening_balance || 0);
    return {
      ...account,
      inflows_total: aggregate.inflows,
      outflows_total: aggregate.outflows,
      current_balance: Number((openingBalance + aggregate.inflows - aggregate.outflows).toFixed(2)),
    };
  });
};

export const treasuryService = {
  async listAccounts(businessId: number, filters?: TreasuryAccountsFilters): Promise<TreasuryAccountsResponse> {
    if (isPureOfflineRuntime()) {
      const accounts = await decorateAccountsWithBalance(businessId, readLocalAccounts(businessId));
      const visibleAccounts = accounts.filter((account) => {
        if (!filters?.include_inactive && !account.is_active) return false;
        if (filters?.account_type && String(account.account_type) !== String(filters.account_type)) return false;
        return true;
      });
      return {
        accounts: visibleAccounts,
        summary: buildAccountsSummary(accounts),
      };
    }

    const response = await api.get<TreasuryAccountsResponse>(`/businesses/${businessId}/treasury/accounts`, {
      params: {
        account_type: filters?.account_type,
        include_inactive: filters?.include_inactive ? '1' : undefined,
      },
    });
    return response.data;
  },

  async createAccount(businessId: number, payload: TreasuryAccountPayload): Promise<TreasuryAccountMutationResponse> {
    if (isPureOfflineRuntime()) {
      const accounts = readLocalAccounts(businessId);
      const timestamp = new Date().toISOString();
      const account: TreasuryAccount = {
        id: nextLocalNumericId(accounts),
        business_id: businessId,
        name: payload.name.trim(),
        account_type: payload.account_type,
        currency: payload.currency || 'COP',
        opening_balance: Number(payload.opening_balance || 0),
        notes: payload.notes?.trim() || null,
        is_active: payload.is_active ?? true,
        is_default: payload.is_default ?? accounts.length === 0,
        created_at: timestamp,
        updated_at: timestamp,
      };

      const persistedAccounts = account.is_default
        ? accounts.map((entry) => ({ ...entry, is_default: false }))
        : [...accounts];
      writeLocalCollection(businessId, TREASURY_ACCOUNTS_COLLECTION, sortAccounts([account, ...persistedAccounts]));

      const [decorated] = await decorateAccountsWithBalance(businessId, sortAccounts([account, ...persistedAccounts]));
      return { account: decorated };
    }

    const response = await api.post<TreasuryAccountMutationResponse>(`/businesses/${businessId}/treasury/accounts`, payload);
    return response.data;
  },

  async updateAccount(businessId: number, accountId: number, payload: TreasuryAccountPayload): Promise<TreasuryAccountMutationResponse> {
    if (isPureOfflineRuntime()) {
      const accounts = readLocalAccounts(businessId);
      const existing = accounts.find((entry) => entry.id === accountId);
      if (!existing) {
        throw new Error('No encontramos esta cuenta en tu espacio local.');
      }
      const updated: TreasuryAccount = {
        ...existing,
        ...payload,
        name: payload.name?.trim() || existing.name,
        currency: payload.currency === undefined ? existing.currency || 'COP' : payload.currency || 'COP',
        notes: payload.notes === undefined ? existing.notes ?? null : payload.notes?.trim() || null,
        opening_balance: payload.opening_balance === undefined ? Number(existing.opening_balance || 0) : Number(payload.opening_balance || 0),
        is_active: payload.is_active ?? existing.is_active,
        is_default: payload.is_default ?? existing.is_default,
        updated_at: new Date().toISOString(),
      };
      const nextAccounts = (updated.is_default ? accounts.map((entry) => ({ ...entry, is_default: false })) : accounts)
        .map((entry) => (entry.id === accountId ? updated : entry));
      writeLocalCollection(businessId, TREASURY_ACCOUNTS_COLLECTION, sortAccounts(nextAccounts));

      const decoratedAccounts = await decorateAccountsWithBalance(businessId, sortAccounts(nextAccounts));
      return {
        account: decoratedAccounts.find((entry) => entry.id === accountId) || updated,
      };
    }

    const response = await api.put<TreasuryAccountMutationResponse>(`/businesses/${businessId}/treasury/accounts/${accountId}`, payload);
    return response.data;
  },

  async listMovements(businessId: number, filters?: TreasuryMovementFilters): Promise<TreasuryMovementsResponse> {
    if (isPureOfflineRuntime()) {
      return {
        movements: await buildLocalMovements(businessId, filters),
      };
    }

    const response = await api.get<TreasuryMovementsResponse>(`/businesses/${businessId}/treasury/movements`, {
      params: buildMovementParams(filters),
    });
    return response.data;
  },
};
