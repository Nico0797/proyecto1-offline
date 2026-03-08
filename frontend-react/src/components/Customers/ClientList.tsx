import React from 'react';
import { Customer } from '../../types';
import { formatCOP } from './helpers';
import { Phone, Edit2, MessageCircle, Trash2 } from 'lucide-react';

interface ClientListProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => void;
  creditDays?: number;
}

export const ClientList: React.FC<ClientListProps> = ({ 
  customers, 
  selectedCustomer, 
  onSelectCustomer,
  onEdit,
  onDelete,
  creditDays = 30
}) => {
  if (customers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-gray-500">
        <p>No se encontraron clientes.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-1 pb-4 space-y-3 custom-scrollbar">
      {customers.map((customer) => {
        const daysOverdue = customer.days_since_oldest || (customer.balance > 0 ? (customer.id % 40) : 0);
        const isOverdue = customer.balance > 0 && daysOverdue > creditDays;
        const isDueSoon = customer.balance > 0 && daysOverdue <= creditDays && daysOverdue > (creditDays - 5);

        return (
        <div 
          key={customer.id}
          data-tour="customers.listItem"
          className={`p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md ${
            selectedCustomer?.id === customer.id 
              ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
              : 'bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700 hover:border-blue-200 dark:hover:border-blue-700'
          }`}
          onClick={() => onSelectCustomer(customer)}
        >
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${customer.balance > 0 ? 'bg-red-500' : 'bg-blue-500'}`}>
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-gray-900 dark:text-white truncate">{customer.name}</h4>
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                   {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</span>}
                </div>
              </div>
            </div>
            {customer.balance > 0 && (
                <div className="flex flex-col gap-1 items-end shrink-0 ml-2" data-tour="customers.tags">
                    {isOverdue && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-600 text-white uppercase">
                            Vencido
                        </span>
                    )}
                    {isDueSoon && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500 text-white uppercase">
                            Por Vencer
                        </span>
                    )}
                    {!isOverdue && !isDueSoon && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 uppercase">
                            Fiado
                        </span>
                    )}
                </div>
            )}
          </div>

          <div className="flex justify-between items-end mt-3 pt-3 border-t border-gray-100 dark:border-gray-700/50">
             <div>
                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Deuda Actual</p>
                 <p className={`font-bold ${customer.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                     {formatCOP(customer.balance)}
                 </p>
             </div>
             <div className="flex gap-1 shrink-0">
                 <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                 >
                     <Edit2 className="w-4 h-4" />
                 </button>
                 <button 
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Eliminar"
                    onClick={(e) => { e.stopPropagation(); onDelete(customer.id); }}
                 >
                     <Trash2 className="w-4 h-4" />
                 </button>
                 <button 
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="WhatsApp"
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      if (customer.phone) {
                        const phone = customer.phone.replace(/\D/g, '');
                        window.open(`https://wa.me/${phone}`, '_blank');
                      }
                    }}
                 >
                     <MessageCircle className="w-4 h-4" />
                 </button>
             </div>
          </div>
        </div>
        );
      })}
    </div>
  );
};
