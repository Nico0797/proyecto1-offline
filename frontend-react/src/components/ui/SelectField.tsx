import React from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SelectFieldProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  helper?: string;
  icon?: React.ElementType;
  wrapperClassName?: string;
}

export const SelectField: React.FC<SelectFieldProps> = ({
  className,
  wrapperClassName,
  label,
  helper,
  icon: Icon,
  id,
  children,
  ...props
}) => {
  return (
    <div className={cn('flex flex-col gap-1.5', wrapperClassName)}>
      {label ? (
        <label htmlFor={id} className="text-[13px] font-semibold tracking-tight app-text-secondary">
          {label}
        </label>
      ) : null}
      <div className="relative">
        {Icon ? (
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <Icon className="h-5 w-5 app-text-muted" />
          </div>
        ) : null}
        <select
          id={id}
          className={cn(
            'app-select min-h-11 rounded-2xl px-3.5 py-3 pr-11 text-[16px] shadow-sm transition sm:text-sm',
            'focus:outline-none',
            'disabled:cursor-not-allowed disabled:opacity-50',
            Icon ? 'pl-11' : '',
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
          <ChevronDown className="h-4 w-4 app-text-muted" />
        </div>
      </div>
      {helper ? <span className="text-xs app-text-muted">{helper}</span> : null}
    </div>
  );
};
