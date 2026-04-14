import React from 'react';
import { cn } from '../../utils/cn';

type MobileDataCardProps = React.HTMLAttributes<HTMLDivElement> & {
  children: React.ReactNode;
};

type MobileDataRowProps = {
  label: string;
  value: React.ReactNode;
  align?: 'start' | 'end';
  valueClassName?: string;
  className?: string;
};

export const MobileDataCard: React.FC<MobileDataCardProps> = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        'rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export const MobileDataRow: React.FC<MobileDataRowProps> = ({
  label,
  value,
  align = 'start',
  valueClassName,
  className,
}) => {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400 dark:text-gray-500">
        {label}
      </span>
      <div
        className={cn(
          'min-w-0 text-sm font-medium text-gray-900 dark:text-white',
          align === 'end' ? 'text-right' : 'text-left',
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
};
