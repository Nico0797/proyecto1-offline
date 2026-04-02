import React from 'react';
import { cn } from '../../../utils/cn';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T;
  cell?: (item: T) => React.ReactNode;
  className?: string;
  align?: 'left' | 'center' | 'right';
}

interface AdminTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyMessage?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    totalItems?: number;
    itemsPerPage?: number;
  };
  onRowClick?: (item: T) => void;
}

export function AdminTable<T extends { id: number | string }>({ 
  columns, 
  data, 
  isLoading, 
  emptyMessage = "No se encontraron datos",
  pagination,
  onRowClick
}: AdminTableProps<T>) {
  const safeData = Array.isArray(data) ? data : [];
  
  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center gap-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="text-slate-500 text-sm animate-pulse">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="app-table-head border-b app-divider">
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={cn(
                    "px-6 py-4 text-xs font-bold uppercase tracking-wider first:rounded-tl-lg last:rounded-tr-lg text-gray-500 dark:text-slate-400",
                    col.align === 'right' && "text-right",
                    col.align === 'center' && "text-center",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-white/5">
            {safeData.length > 0 ? (
              safeData.map((item, index) => (
                <tr 
                  key={item.id} 
                  className={cn(
                    "group transition-all duration-200 hover:bg-blue-500/5",
                    onRowClick && "cursor-pointer hover:shadow-md hover:shadow-blue-500/5 hover:translate-x-1"
                  )}
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => onRowClick && onRowClick(item)}
                >
                  {columns.map((col, idx) => (
                    <td 
                      key={idx} 
                      className={cn(
                        "px-6 py-4 text-sm text-gray-700 dark:text-slate-300",
                        col.align === 'right' && "text-right",
                        col.align === 'center' && "text-center",
                        col.className
                      )}
                    >
                      {col.cell 
                        ? col.cell(item) 
                        : (col.accessorKey ? String(item[col.accessorKey]) : '')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <div className="app-muted-panel w-16 h-16 rounded-full flex items-center justify-center">
                      <ChevronsRight className="text-gray-400 dark:text-slate-600" size={32} />
                    </div>
                    <p className="text-gray-500 dark:text-slate-500 font-medium">{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && (
        <div className="app-table-head px-6 py-4 border-t app-divider flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 dark:text-slate-500">
            Mostrando <span className="font-bold text-gray-900 dark:text-white">{(pagination.currentPage - 1) * (pagination.itemsPerPage || 20) + 1}</span> a <span className="font-bold text-gray-900 dark:text-white">{Math.min(pagination.currentPage * (pagination.itemsPerPage || 20), pagination.totalItems || 0)}</span> de <span className="font-bold text-gray-900 dark:text-white">{pagination.totalItems}</span> registros
          </div>
          
          <div className="flex items-center gap-1">
            <button
              onClick={() => pagination.onPageChange(1)}
              disabled={pagination.currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Primera página"
            >
              <ChevronsLeft size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(Math.max(1, pagination.currentPage - 1))}
              disabled={pagination.currentPage === 1}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Anterior"
            >
              <ChevronLeft size={16} />
            </button>
            
            <div className="app-chip px-4 py-1.5 rounded-lg text-xs font-medium min-w-[3rem] text-center">
              {pagination.currentPage} / {pagination.totalPages}
            </div>

            <button
              onClick={() => pagination.onPageChange(Math.min(pagination.totalPages, pagination.currentPage + 1))}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Siguiente"
            >
              <ChevronRight size={16} />
            </button>
            <button
              onClick={() => pagination.onPageChange(pagination.totalPages)}
              disabled={pagination.currentPage === pagination.totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              title="Última página"
            >
              <ChevronsRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
