export type Trend = 'up' | 'down' | 'neutral';

export interface KPI {
  id: string;
  label: string;
  value: number | string;
  previousValue?: number;
  change?: number;
  trend: Trend;
  format?: 'currency' | 'number' | 'percent';
  inverse?: boolean;
  prefix?: string;
  suffix?: string;
  color?: string;
}

export interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'warning' | 'neutral' | 'alert' | 'risk' | 'opportunity';
  title: string;
  description: string;
  metric: 'sales' | 'expenses' | 'profit' | 'products' | 'clients' | string;
  severity?: 'critical' | 'warning' | 'info';
  actionLabel?: string;
}

export interface Forecast {
  projectedRevenue: number;
  projectedResult: number;
  resultLabel: string;
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

export type AnalyticsCostCoverage = 'complete' | 'partial' | 'missing';

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
