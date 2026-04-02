import React from 'react';
import { cn } from '../../../utils/cn';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({ 
  title, 
  description, 
  actions, 
  className 
}) => {
  return (
    <div className={cn("app-divider mb-8 flex flex-col justify-between gap-4 border-b pb-6 md:flex-row md:items-end", className)}>
      <div className="space-y-1">
        <h1 className="inline-block bg-gradient-to-r from-[color:var(--app-text)] to-[color:var(--app-text-muted)] bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          {title}
        </h1>
        {description && (
          <p className="max-w-2xl text-sm font-medium leading-relaxed app-text-muted">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-3 animate-fade-in-up">
          {actions}
        </div>
      )}
    </div>
  );
};
