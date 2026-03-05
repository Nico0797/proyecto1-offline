import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../utils/cn';

interface SummaryCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
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
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-500 border-blue-100 dark:border-blue-500/20',
    green: 'bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-500 border-green-100 dark:border-green-500/20',
    yellow: 'bg-yellow-50 text-yellow-600 dark:bg-yellow-500/10 dark:text-yellow-500 border-yellow-100 dark:border-yellow-500/20',
    red: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-500 border-red-100 dark:border-red-500/20',
  };

  return (
    <div 
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors shadow-sm"
      {...props}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">{title}</p>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-1">{value}</h3>
        </div>
        <div className={cn("p-2 rounded-lg border", colorStyles[color])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      
      {trend && (
        <div className="mt-2 flex items-center text-xs">
          <span className={cn(
            "font-medium",
            trend.value >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"
          )}>
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </span>
          <span className="text-gray-500 dark:text-gray-500 ml-1.5">{trend.label}</span>
        </div>
      )}
    </div>
  );
};
