import React from 'react';
import { cn } from '../../utils/cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ElementType;
}

export const Input: React.FC<InputProps> = ({
  className,
  label,
  error,
  id,
  icon: Icon,
  ...props
}) => {
  const isNumber = props.type === 'number';

  // Show a faint "0" placeholder and empty value when the numeric value is 0 or empty
  const computedValue =
    isNumber && (props.value === 0 || props.value === '0' || props.value === undefined || props.value === null || props.value === '')
      ? ''
      : props.value;

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-5 w-5 text-gray-400" />
          </div>
        )}
        <input
          id={id}
          className={cn(
            'w-full px-3 py-2 bg-white dark:bg-gray-800/50 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500',
            'focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-red-500 focus:ring-red-500/50 focus:border-red-500',
            Icon && 'pl-10',
            isNumber && 'appearance-none',
            className
          )}
          {...props}
          value={computedValue as any}
          placeholder={isNumber ? (props.placeholder ?? '0') : props.placeholder}
        />
      </div>
      {error && <span className="text-xs text-red-500 dark:text-red-400">{error}</span>}
    </div>
  );
};
