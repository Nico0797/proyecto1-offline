import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../utils/cn';

type FormAlertTone = 'error' | 'warning' | 'info' | 'success';

interface FormAlertProps {
  title?: string;
  message: string;
  tone?: FormAlertTone;
  details?: string[];
  className?: string;
}

const toneStyles: Record<FormAlertTone, string> = {
  error: 'border-[color:var(--app-danger-soft-border)] bg-[color:color-mix(in_srgb,var(--app-danger-soft)_90%,white_10%)] text-[color:color-mix(in_srgb,var(--app-danger)_78%,var(--app-text)_22%)] shadow-[var(--app-shadow-soft)]',
  warning: 'border-[color:var(--app-warning-soft-border)] bg-[color:color-mix(in_srgb,var(--app-warning-soft)_92%,white_8%)] text-[color:color-mix(in_srgb,var(--app-warning)_80%,var(--app-text)_20%)] shadow-[var(--app-shadow-soft)]',
  info: 'border-[color:var(--app-primary-soft-border)] bg-[color:color-mix(in_srgb,var(--app-primary-soft)_88%,white_12%)] text-[color:color-mix(in_srgb,var(--app-primary)_78%,var(--app-text)_22%)] shadow-[var(--app-shadow-soft)]',
  success: 'border-[color:var(--app-success-soft-border)] bg-[color:color-mix(in_srgb,var(--app-success-soft)_90%,white_10%)] text-[color:color-mix(in_srgb,var(--app-success)_80%,var(--app-text)_20%)] shadow-[var(--app-shadow-soft)]',
};

const iconMap = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle2,
} satisfies Record<FormAlertTone, React.ElementType>;

export const FormAlert: React.FC<FormAlertProps> = ({
  title,
  message,
  tone = 'error',
  details,
  className,
}) => {
  const Icon = iconMap[tone];

  return (
    <div
      className={cn(
        'rounded-2xl border px-4 py-3.5 backdrop-blur-sm',
        toneStyles[tone],
        className,
      )}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:color-mix(in_srgb,var(--app-surface-elevated)_92%,white_8%)]">
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          {title ? <div className="text-sm font-semibold tracking-tight">{title}</div> : null}
          <div className={cn('text-sm leading-6', title ? 'mt-1' : '')}>{message}</div>
          {details && details.length > 0 ? (
            <ul className="mt-2.5 space-y-1.5 text-sm leading-6 opacity-95">
              {details.map((detail, index) => (
                <li key={`${detail}-${index}`} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-70" />
                  <span>{detail}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
};
