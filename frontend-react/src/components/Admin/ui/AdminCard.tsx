import React from 'react';
import { cn } from '../../../utils/cn';

interface AdminCardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  noPadding?: boolean;
}

export const AdminCard: React.FC<AdminCardProps> = ({ 
  children, 
  className, 
  title, 
  actions,
  noPadding = false 
}) => {
  return (
    <div className={cn(
      "app-surface rounded-2xl overflow-hidden shadow-xl transition-all hover:border-gray-300 dark:hover:border-white/10", 
      className
    )}>
      {(title || actions) && (
        <div className="app-table-head flex items-center justify-between border-b px-6 py-4">
          {title && <h3 className="text-sm font-bold uppercase tracking-tight app-text">{title}</h3>}
          {actions && <div className="flex gap-2">{actions}</div>}
        </div>
      )}
      <div className={cn(noPadding ? "" : "p-6")}>
        {children}
      </div>
    </div>
  );
};
