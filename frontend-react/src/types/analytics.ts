export type Trend = 'up' | 'down' | 'neutral';

export interface KPI {
  id: string;
  label: string;
  value: number;
  previousValue?: number;
  change: number;
  trend: Trend;
  format?: 'currency' | 'number' | 'percent';
  inverse?: boolean;
}

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'warning' | 'neutral';
  title: string;
  description: string;
  metric: 'sales' | 'expenses' | 'profit' | 'products' | 'clients' | string;
}

export interface Forecast {
  projectedRevenue: number;
  projectedProfit: number;
  confidence: { min: number; max: number; level?: number };
  trend: Trend;
  suggestions: string[];
}

export interface HealthScore {
  score: number;
  status: 'good' | 'warning' | 'critical';
  indicators: Array<{
    label: string;
    status: 'ok' | 'warning' | 'critical';
    message: string;
  }>;
}

export interface SalesTrendPoint {
  date: string;
  amount: number;
  count: number;
}

export interface ExpenseCategory {
  category: string;
  total: number;
}

export interface TopProduct {
  id: number;
  name: string;
  qty: number;
  total: number;
}
