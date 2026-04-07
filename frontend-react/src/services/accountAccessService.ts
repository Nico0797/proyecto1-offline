import api from './api';
import type { Pricing } from './membershipService';

export type AccountAccessPlan = 'basic' | 'pro' | 'business' | null;
export type AccountAccessStatus = 'active' | 'inactive' | 'expired';
export type AccountAccessSource = 'subscription' | 'manual' | 'existing_access' | 'admin' | 'expired' | 'manual_expired' | 'none';
export type AccountOnboardingMode = 'blocked' | 'simple_store' | 'questionnaire_pro' | 'questionnaire_business';
export type AccountOnboardingFlow = 'basic' | 'pro' | 'business';

export interface AccountAccessStatePayload {
  required: boolean;
  active: boolean;
  status: AccountAccessStatus;
  plan: AccountAccessPlan;
  plan_code?: AccountAccessPlan;
  has_access: boolean;
  requires_onboarding: boolean;
  onboarding_flow: AccountOnboardingFlow;
  source: AccountAccessSource;
  checkout_required: boolean;
  manual_grant: boolean;
  existing_access: boolean;
  onboarding_mode: AccountOnboardingMode;
  membership_plan_code?: string | null;
  membership_start?: string | null;
  membership_end?: string | null;
  demo_preview_available: boolean;
  demo_preview_active: boolean;
  demo_business_id?: number | null;
  demo_business_name?: string | null;
}

export interface AccountAccessResponse {
  account_access: AccountAccessStatePayload;
  pricing: Pricing;
}

export const accountAccessService = {
  async getStatus(): Promise<AccountAccessResponse> {
    const response = await api.get('/account/access');
    return response.data;
  },
  async startPreview(): Promise<AccountAccessResponse> {
    const response = await api.post('/account/preview/start');
    return response.data;
  },
  async stopPreview(): Promise<AccountAccessResponse> {
    const response = await api.post('/account/preview/stop');
    return response.data;
  },
};
