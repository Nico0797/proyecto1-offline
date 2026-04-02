import type { ReactNode } from 'react';
import { cn } from '../../utils/cn';
import type { ModuleTone } from '../../theme/moduleVisualTokens';

type StatusTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger' | ModuleTone;

type AppStatusBadgeProps = {
  children: ReactNode;
  tone?: StatusTone;
  className?: string;
};

const toneClasses: Record<StatusTone, string> = {
  neutral: 'app-status-chip-neutral',
  info: 'app-status-chip-info',
  success: 'app-status-chip-success',
  warning: 'app-status-chip-warning',
  danger: 'app-status-chip-danger',
  sales: 'app-status-chip-module app-module-sales',
  expenses: 'app-status-chip-module app-module-expenses',
  products: 'app-status-chip-module app-module-products',
  alerts: 'app-status-chip-module app-module-alerts',
  settings: 'app-status-chip-module app-module-settings',
  sync: 'app-status-chip-module app-module-sync',
};

export const AppStatusBadge = ({ children, tone = 'neutral', className }: AppStatusBadgeProps) => {
  return <span className={cn('app-status-chip', toneClasses[tone], className)}>{children}</span>;
};
