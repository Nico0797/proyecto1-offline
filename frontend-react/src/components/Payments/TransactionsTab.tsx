import React from 'react';
import { Payment } from '../../store/paymentStore';
import { Button } from '../ui/Button';
import { Eye, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { DataTableContainer } from '../Layout/PageLayout';

interface TransactionsTabProps {
  payments: Payment[];
  loading: boolean;
  onView: (payment: Payment) => void;
  onEdit: (payment: Payment) => void;
  onDelete: (id: number) => void;
}

export const TransactionsTab: React.FC<TransactionsTabProps> = ({
  payments,
  loading,
  onView,
  onEdit,
  onDelete
}) => {
  if (loading && payments.length === 0) {
    return <div className="p-8 text-center text-gray-500">Cargando transacciones...</div>;
  }

  if (payments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sin transacciones</h3>
        <p className="text-gray-500 text-center max-w-sm mt-2">
          No hay registros de pagos recientes.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Card List */}
      <div className="lg:hidden space-y-3">
        {payments.map((payment) => (
            <div key={payment.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 active:scale-[0.99] transition-transform" onClick={() => onView(payment)}>
               <div className="flex justify-between items-start mb-2">
                   <div>
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">{new Date(payment.payment_date).toLocaleDateString()}</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{payment.customer_name || 'Desconocido'}</h3>
                   </div>
                   <span className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
                    payment.method === 'transfer' 
                      ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                      : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                  )}>
                    {payment.method === 'transfer' ? 'Transf.' : 'Efec.'}
                  </span>
               </div>
               
               <div className="flex justify-between items-end border-t border-gray-50 dark:border-gray-700/50 pt-3">
                   <div className="max-w-[60%]">
                       <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{payment.note || '-'}</p>
                   </div>
                   <div className="text-right">
                       <span className="text-xs text-gray-500 dark:text-gray-400">Monto</span>
                       <p className="text-lg font-bold text-gray-900 dark:text-white">${payment.amount.toLocaleString()}</p>
                   </div>
               </div>
            </div>
        ))}
      </div>

      {/* Desktop Table */}
      <div className="hidden lg:block">
        <DataTableContainer>
            <table className="w-full text-left text-sm text-gray-500 dark:text-gray-400">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs uppercase text-gray-500 font-medium tracking-wider sticky top-0 z-10 shadow-sm">
                <tr>
                <th className="px-6 py-3">Fecha</th>
                <th className="px-6 py-3">Cliente</th>
                <th className="px-6 py-3">Método</th>
                <th className="px-6 py-3">Referencia / Nota</th>
                <th className="px-6 py-3 text-right">Monto</th>
                <th className="px-6 py-3 text-right">Acciones</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {payments.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group cursor-pointer" onClick={() => onView(payment)}>
                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                        {new Date(payment.payment_date).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                        {payment.customer_name || 'Desconocido'}
                        </td>
                        <td className="px-6 py-4">
                        <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize",
                            payment.method === 'transfer' 
                            ? "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400"
                            : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                        )}>
                            {payment.method === 'transfer' ? 'Transferencia' : 'Efectivo'}
                        </span>
                        </td>
                        <td className="px-6 py-4 max-w-xs truncate" title={payment.note}>
                        {payment.note || '-'}
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-gray-900 dark:text-white">
                        ${payment.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onView(payment); }}>
                            <Eye className="w-4 h-4 text-blue-500" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); onEdit(payment); }}>
                            <Edit2 className="w-4 h-4 text-gray-500" />
                            </Button>
                            <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" 
                            onClick={(e) => { e.stopPropagation(); onDelete(payment.id); }}
                            >
                            <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                        </td>
                    </tr>
                    ))}
                </tbody>
            </table>
        </DataTableContainer>
      </div>
    </>
  );
};
