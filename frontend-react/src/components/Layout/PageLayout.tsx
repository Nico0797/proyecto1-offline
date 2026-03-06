import React, { useState } from 'react';
import { cn } from '../../utils/cn';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';

// --- PageLayout ---
// Main container for the page content.
// Takes full height and width, flex column layout.
export const PageLayout: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={cn("flex flex-col h-full w-full bg-gray-50 dark:bg-gray-900 overflow-hidden", className)}>
      {children}
    </div>
  );
};

// --- PageHeader ---
// Fixed header at the top of the page.
export const PageHeader: React.FC<{ title: string; description?: string; action?: React.ReactNode; className?: string }> = ({ title, description, action, className }) => {
  return (
    <div className={cn("flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 z-20 pt-safe", className)}>
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-gray-900 dark:text-white truncate">{title}</h1>
        {description && <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate">{description}</p>}
      </div>
      {action && <div className="ml-4 shrink-0 flex items-center">{action}</div>}
    </div>
  );
};

// --- PageFilters ---
// Container for filters, search, etc.
// Collapsible on mobile.
export const PageFilters: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn("bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shrink-0 z-10 transition-all duration-300", className)}>
      {/* Mobile Toggle Header - visible only on mobile */}
      <div 
        className="lg:hidden px-4 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300">
          <Filter className="w-4 h-4" />
          <span>Filtros y Búsqueda</span>
        </div>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </div>

      {/* Content Container */}
      <div className={cn(
        "px-4 gap-3 flex flex-col lg:flex-row lg:items-center lg:flex-wrap transition-all duration-300 ease-in-out overflow-hidden",
        "lg:h-auto lg:py-3 lg:opacity-100 lg:visible", // Desktop: always visible
        isExpanded ? "py-3 max-h-96 opacity-100 visible" : "max-h-0 opacity-0 invisible lg:max-h-none lg:visible" // Mobile: toggle
      )}>
        {children}
      </div>
    </div>
  );
};

// --- PageBody ---
// Scrollable area for the main content.
export const PageBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={cn("flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative scroll-smooth", className)}>
      <div className="p-4 pb-24 lg:pb-8 w-full max-w-full">
        {children}
      </div>
    </div>
  );
};

// --- DataTableContainer ---
// Wrapper for tables to ensure they handle overflow correctly.
export const DataTableContainer: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
  return (
    <div className={cn("w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-800 shadow-sm bg-white dark:bg-gray-900 flex flex-col", className)}>
      <div className="overflow-x-auto custom-scrollbar flex-1">
          {children}
      </div>
    </div>
  );
};
