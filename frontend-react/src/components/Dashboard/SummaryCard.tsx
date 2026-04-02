import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SummaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number | string;
    label: string;
    isRaw?: boolean;
  };
  color?: 'blue' | 'green' | 'yellow' | 'red';
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  color = 'blue',
  ...props
}) => {
  const colorStyles = {
    blue: 'app-tone-icon-blue',
    green: 'app-tone-icon-green',
    yellow: 'app-tone-icon-amber',
    red: 'app-tone-icon-red',
  };

  return (
    <div 
      className="app-stat-card min-h-[138px] rounded-[24px] p-4 transition-colors hover:border-gray-300 dark:hover:border-gray-600 sm:p-5 lg:min-h-[156px] lg:p-6"
      {...props}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500 dark:text-gray-400 sm:text-xs">{title}</p>
          <h3 className="mt-2 text-xl font-bold tracking-tight text-gray-900 sm:text-2xl dark:text-white">{value}</h3>
        </div>
        <div className={cn("shrink-0", colorStyles[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      {trend && (
        <div className="mt-3 flex items-center text-[11px] sm:text-xs">
          <span className={cn(
            "font-medium",
            !trend.isRaw && typeof trend.value === 'number' && trend.value < 0
              ? "text-red-600 dark:text-red-500"
              : "text-green-600 dark:text-green-500"
          )}>
            {trend.isRaw
              ? trend.value
              : `${typeof trend.value === 'number' && trend.value > 0 ? '+' : ''}${trend.value}%`}
          </span>
          <span className="ml-1.5 text-gray-500 dark:text-gray-400">{trend.label}</span>
        </div>
      )}
    </div>
  );
};
