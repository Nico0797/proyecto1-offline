import api from './api';
import { TreasuryAccount, TreasuryAccountsSummary, TreasuryMovement } from '../types';

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

export const treasuryService = {
  async listAccounts(businessId: number, filters?: TreasuryAccountsFilters): Promise<TreasuryAccountsResponse> {
    const response = await api.get<TreasuryAccountsResponse>(`/businesses/${businessId}/treasury/accounts`, {
      params: {
        account_type: filters?.account_type,
        include_inactive: filters?.include_inactive ? '1' : undefined,
      },
    });
    return response.data;
  },

  async createAccount(businessId: number, payload: TreasuryAccountPayload): Promise<TreasuryAccountMutationResponse> {
    const response = await api.post<TreasuryAccountMutationResponse>(`/businesses/${businessId}/treasury/accounts`, payload);
    return response.data;
  },

  async updateAccount(businessId: number, accountId: number, payload: TreasuryAccountPayload): Promise<TreasuryAccountMutationResponse> {
    const response = await api.put<TreasuryAccountMutationResponse>(`/businesses/${businessId}/treasury/accounts/${accountId}`, payload);
    return response.data;
  },

  async listMovements(businessId: number, filters?: TreasuryMovementFilters): Promise<TreasuryMovementsResponse> {
    const response = await api.get<TreasuryMovementsResponse>(`/businesses/${businessId}/treasury/movements`, {
      params: buildMovementParams(filters),
    });
    return response.data;
  },
};
