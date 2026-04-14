import React from 'react';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  className,
  variant = 'primary',
  size = 'md',
  isLoading,
  children,
  disabled,
  ...props
}) => {
  const variants = {
    primary: 'app-button-primary hover:-translate-y-[1px] focus-visible:ring-[color:var(--accent)]',
    secondary: 'app-button-secondary focus-visible:ring-[color:var(--accent)]',
    danger: 'border border-[color:var(--app-danger-soft-border)] bg-[color:var(--app-danger)] text-white shadow-[0_10px_22px_-18px_rgba(220,38,38,0.34)] hover:-translate-y-[1px] hover:brightness-105 hover:shadow-[0_14px_26px_-20px_rgba(220,38,38,0.36)] focus-visible:ring-[color:var(--app-danger)]',
    ghost: 'app-button-ghost focus-visible:ring-[color:var(--accent)]',
    outline: 'app-button-outline focus-visible:ring-[color:var(--accent)]',
  };

  const sizes = {
    sm: 'min-h-9 px-3 text-[13px]',
    md: 'min-h-10 px-3.5 text-[13px] sm:text-sm',
    lg: 'min-h-11 px-4.5 text-sm sm:text-[15px]',
    icon: 'h-10 w-10 p-0',
  };

  return (
    <button
      className={cn(
        'inline-flex min-w-0 max-w-full items-center justify-center gap-2 rounded-full font-medium leading-none tracking-tight transition-all duration-200',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)]',
        'active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
};
