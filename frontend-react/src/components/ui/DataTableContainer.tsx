import React from 'react';
import { cn } from '../../utils/cn';

interface DataTableContainerProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'page' | 'modal'; // 'page' subtracts more height for headers/toolbars
}

export const DataTableContainer: React.FC<DataTableContainerProps> = ({ 
  children, 
  className,
  variant = 'page' 
}) => {
  // Desktop: max-h-[calc(100vh-220px)]
  // Mobile: max-h-[calc(100vh-260px)]
  // We apply these classes to ensure internal scrolling
  const heightClass = variant === 'page' 
    ? 'max-h-[calc(100vh-260px)] md:max-h-[calc(100vh-220px)]' 
    : 'max-h-[60vh]';

  return (
    <div className={cn(
      "w-full overflow-hidden flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm",
      className
    )}>
      <div className={cn(
        "overflow-auto w-full",
        heightClass
      )}>
        {/* We inject styles to children tables to ensure sticky headers if they don't have them */}
        <div className="min-w-full inline-block align-middle">
          {children}
        </div>
      </div>
    </div>
  );
};
