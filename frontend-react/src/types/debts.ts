export interface Debt {
  id: number;
  business_id: number;
  name: string;
  creditor_name?: string;
  category?: string;
  scope?: 'operational' | 'financial';
  total_amount: number;
  balance_due: number;
  start_date?: string;
  due_date?: string;
  frequency?: 'unique' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  interest_rate?: number;
  installments?: number;
  estimated_installment?: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
  status_label?: string;
  amount_paid?: number;
  origin_type?: 'manual' | 'recurring';
  recurring_expense_id?: number | null;
  generated_from_due_date?: string | null;
  is_overdue?: boolean;
  is_due_today?: boolean;
  is_due_soon?: boolean;
  days_until_due?: number | null;
  days_overdue?: number;
  notes?: string;
  reminder_enabled: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DebtPayment {
  id: number;
  debt_id: number;
  amount: number;
  payment_date: string;
  payment_method?: string;
  treasury_account_id?: number | null;
  treasury_account_name?: string | null;
  treasury_account_type?: string | null;
  note?: string;
  created_at?: string;
}

export interface DebtsSummary {
  total_debt: number;
  active_count: number;
  overdue_total: number;
  overdue_count: number;
  due_today_total?: number;
  due_soon_total?: number;
  next_due?: Debt;
  paid_this_month: number;
}
