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
  error: 'border-red-200/80 bg-red-50/95 text-red-900 shadow-[0_18px_40px_-28px_rgba(220,38,38,0.45)] dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100',
  warning: 'border-amber-200/80 bg-amber-50/95 text-amber-900 shadow-[0_18px_40px_-28px_rgba(217,119,6,0.4)] dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100',
  info: 'border-blue-200/80 bg-blue-50/95 text-blue-900 shadow-[0_18px_40px_-28px_rgba(37,99,235,0.4)] dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-blue-100',
  success: 'border-emerald-200/80 bg-emerald-50/95 text-emerald-900 shadow-[0_18px_40px_-28px_rgba(5,150,105,0.4)] dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100',
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
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-white/10">
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
