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
      "app-surface flex w-full flex-col overflow-hidden",
      className
    )}>
      <div className={cn(
        "custom-scrollbar w-full overflow-auto overscroll-x-contain",
        heightClass
      )}>
        <div className="min-w-full inline-block align-middle">
          {children}
        </div>
      </div>
    </div>
  );
};
