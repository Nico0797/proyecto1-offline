import React, { useState } from 'react';
import { Sale } from '../../types';
import { formatCOP } from './helpers';
import { Calendar, Check } from 'lucide-react';
import { Button } from '../ui/Button';

interface ReceivablesTabProps {
  sales: Sale[];
  onView: (sale: Sale) => void;
}

export const ReceivablesTab: React.FC<ReceivablesTabProps> = ({ sales, onView }) => {
  const receivables = sales.filter(s => !s.paid && (s.balance || 0) > 0);
  
  const [filter, setFilter] = useState<'all'>('all');

  // Helper for timezone-safe date formatting
  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
  };

  if (receivables.length === 0) {
    return (
      <div className="app-empty-state flex flex-col items-center justify-center p-12 text-center">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">¡Todo al día!</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">No tienes cuentas por cobrar pendientes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
       <div className="flex gap-2 mb-4">
          <Button 
            variant={filter === 'all' ? 'primary' : 'secondary'} 
            size="sm" 
            onClick={() => setFilter('all')}
          >
            Todas ({receivables.length})
          </Button>
       </div>

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {receivables.map(sale => (
             <div key={sale.id} className="app-surface p-4 rounded-xl transition-shadow hover:shadow-md">
                <div className="flex justify-between items-start mb-3">
                   <div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-lg">
                          {sale.customer_name || 'Cliente sin nombre'}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                         <Calendar className="w-3 h-3" /> {formatDate(sale.sale_date)}
                      </p>
                   </div>
                   <span className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 text-xs font-bold px-2 py-1 rounded-full">
                      Pendiente
                   </span>
                </div>

                <div className="flex justify-between items-end mb-4">
                   <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Saldo Pendiente</p>
                      <p className="text-xl font-bold text-red-600 dark:text-red-400">{formatCOP(sale.balance || 0)}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Total Venta</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{formatCOP(sale.total)}</p>
                   </div>
                </div>

                <div className="flex gap-2">
                   <Button className="w-full" size="sm" onClick={() => onView(sale)}>
                      Ver / Cobrar
                   </Button>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
};
