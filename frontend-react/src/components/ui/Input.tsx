import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
  startAdornment?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  className,
  label,
  error,
  id,
  icon: Icon,
  startAdornment,
  ...props
}) => {
  const isNumber = props.type === 'number';

  // Show a faint "0" placeholder and empty value when the numeric value is 0 or empty
  const computedValue =
    isNumber && (props.value === 0 || props.value === '0' || props.value === undefined || props.value === null || props.value === '')
      ? ''
      : props.value;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-[13px] font-semibold tracking-tight app-text-secondary">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icon className="h-5 w-5 app-text-muted" />
          </div>
        )}
        {startAdornment && !Icon && (
           <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 app-text-muted">
             {startAdornment}
           </div>
        )}
        <input
          id={id}
          className={cn(
            'app-field-surface min-h-11 w-full rounded-2xl px-3.5 py-3 text-[16px] shadow-sm transition sm:text-sm',
            'focus:outline-none',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-[color:var(--app-danger)] focus:border-[color:var(--app-danger)]',
            Icon ? 'pl-11' : (startAdornment ? 'pl-9' : ''),
            isNumber && 'appearance-none',
            className
          )}
          {...props}
          value={computedValue as any}
          placeholder={isNumber ? (props.placeholder ?? '0') : props.placeholder}
        />
      </div>
      {error && <span className="text-[12px] font-medium text-[color:var(--app-danger)]">{error}</span>}
    </div>
  );
};
