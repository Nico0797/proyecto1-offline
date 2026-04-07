import React from 'react';
import { cn } from '../../../utils/cn';
import { LucideIcon } from 'lucide-react';

interface AdminStatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: LucideIcon;
  trend?: number;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'indigo' | 'pink' | 'orange' | 'red';
  className?: string;
}

const colorMap = {
  blue: 'app-tone-icon-blue',
  green: 'app-tone-icon-green',
  purple: 'border border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-500/20 dark:bg-purple-500/10 dark:text-purple-400',
  yellow: 'app-tone-icon-amber',
  indigo: 'border border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400',
  pink: 'border border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-500/20 dark:bg-pink-500/10 dark:text-pink-400',
  orange: 'border border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-500/20 dark:bg-orange-500/10 dark:text-orange-400',
  red: 'app-tone-icon-red',
};

export const AdminStatCard: React.FC<AdminStatCardProps> = ({ 
  title, 
  value, 
  subtext, 
  icon: Icon, 
  trend, 
  color = "blue",
  className
}) => {
  return (
    <div className={cn("app-stat-card rounded-xl p-6", className)}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide app-text-muted">{title}</p>
          <h3 className="mt-1 text-2xl font-bold tracking-tight app-text">{value}</h3>
        </div>
        <div className={cn("rounded-lg", colorMap[color])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {(subtext || trend !== undefined) && (
        <div className="flex items-center gap-2 text-sm">
          {trend !== undefined && (
            <span className={cn(
              "font-medium px-1.5 py-0.5 rounded text-xs",
              trend >= 0 
                ? "app-status-chip-success" 
                : "app-status-chip-danger"
            )}>
              {trend >= 0 ? "+" : ""}{trend}%
            </span>
          )}
          <span className="app-text-muted">{subtext}</span>
        </div>
      )}
    </div>
  );
};
