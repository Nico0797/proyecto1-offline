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
    primary: 'app-button-primary hover:-translate-y-[1px] focus-visible:ring-blue-500',
    secondary: 'app-button-secondary focus-visible:ring-blue-500',
    danger: 'border border-transparent bg-red-600 text-white shadow-[0_10px_24px_-18px_rgba(220,38,38,0.55)] hover:-translate-y-[1px] hover:bg-red-500 hover:shadow-[0_16px_32px_-20px_rgba(220,38,38,0.52)] focus-visible:ring-red-500',
    ghost: 'app-button-ghost focus-visible:ring-blue-500',
    outline: 'app-button-outline focus-visible:ring-blue-500',
  };

  const sizes = {
    sm: 'min-h-10 px-3.5 text-sm',
    md: 'min-h-11 px-4 text-sm',
    lg: 'min-h-12 px-5 text-base',
    icon: 'h-11 w-11 p-0',
  };

  return (
    <button
      className={cn(
        'inline-flex min-w-0 max-w-full items-center justify-center gap-2 rounded-2xl font-medium leading-none transition-all duration-200',
        '[&_svg]:pointer-events-none [&_svg]:shrink-0',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--app-surface-elevated)]',
        'active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0 disabled:active:scale-100',
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
