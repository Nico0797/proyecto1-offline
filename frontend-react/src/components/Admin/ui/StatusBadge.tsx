import React from 'react';
import { cn } from '../../../utils/cn';
import { CheckCircle, XCircle, AlertCircle, Clock, Ban } from 'lucide-react';

export type StatusVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'blue';

interface StatusBadgeProps {
  variant?: StatusVariant;
  children: React.ReactNode;
  icon?: boolean;
  className?: string;
}

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  error: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  info: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  neutral: "bg-slate-700/50 text-slate-300 border-slate-600/50",
  purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  blue: "bg-sky-500/10 text-sky-400 border-sky-500/20",
};

const iconMap: Record<StatusVariant, any> = {
  success: CheckCircle,
  warning: AlertCircle,
  error: XCircle,
  info: Clock,
  neutral: Ban,
  purple: CheckCircle,
  blue: CheckCircle
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ 
  variant = 'neutral', 
  children, 
  icon = false,
  className 
}) => {
  const Icon = iconMap[variant];

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
      variantStyles[variant],
      className
    )}>
      {icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  );
};
