export interface Debt {
  id: number;
  business_id: number;
  name: string;
  creditor_name?: string;
  category?: string;
  total_amount: number;
  balance_due: number;
  start_date?: string;
  due_date?: string;
  frequency?: 'unique' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';
  interest_rate?: number;
  installments?: number;
  estimated_installment?: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue';
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
  note?: string;
  created_at?: string;
}

export interface DebtsSummary {
  total_debt: number;
  active_count: number;
  overdue_total: number;
  overdue_count: number;
  next_due?: Debt;
  paid_this_month: number;
}
