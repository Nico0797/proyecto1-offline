import React from 'react';
import { Customer } from '../../types';
import { formatCOP } from './helpers';
import { Phone, Edit2, MessageCircle, Trash2, ArrowRight } from 'lucide-react';
import { TeachingEmptyState } from '../ui/TeachingEmptyState';

interface ClientListProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelectCustomer: (customer: Customer) => void;
  onEdit: (customer: Customer) => void;
  onDelete: (id: number) => void;
  creditDays?: number;
  onCreate?: () => void;
}

export const ClientList: React.FC<ClientListProps> = ({ 
  customers, 
  selectedCustomer, 
  onSelectCustomer,
  onEdit,
  onDelete,
  onCreate
}) => {
  if (customers.length === 0) {
    return (
      <TeachingEmptyState
        icon={Phone}
        title="No se encontraron clientes"
        description="Cuando empieces a registrar clientes, aquí podrás ver su historial comercial, saldo y acciones rápidas."
        nextStep="Crea tu primer cliente para facilitar ventas repetidas, seguimiento y cobranza."
        primaryActionLabel={onCreate ? 'Crear cliente' : undefined}
        onPrimaryAction={onCreate}
        compact
      />
    );
  }

  return (
    <div className="custom-scrollbar flex-1 space-y-3 overflow-y-auto px-1 pb-4">
      {customers.map((customer) => {
        const isOverdue = customer.receivable_status === 'overdue';
        const isDueSoon = customer.balance > 0 && ['due_soon', 'due_today'].includes(customer.receivable_status || '');

        return (
        <div 
          key={customer.id}
          data-tour="customers.listItem"
          className={`group app-surface cursor-pointer p-3.5 transition-all hover:shadow-md ${
            selectedCustomer?.id === customer.id 
              ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800' 
              : 'hover:border-blue-200 dark:hover:border-blue-700'
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

          <div className="app-divider mt-3 flex justify-between items-end gap-3 border-t pt-3">
             <div className="min-w-0">
                 <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">Saldo actual</p>
                 <p className={`text-lg font-bold ${customer.balance > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}>
                     {formatCOP(customer.balance)}
                 </p>
                 {customer.receivable_due_date && customer.balance > 0 && (
                   <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                     Vence {new Date(customer.receivable_due_date).toLocaleDateString()}
                   </p>
                 )}
             </div>
             <div className="flex items-center gap-1 shrink-0">
                 <button
                    onClick={(e) => { e.stopPropagation(); onSelectCustomer(customer); }}
                    className="app-inline-action inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800"
                    title="Ver detalle"
                 >
                    Ver
                    <ArrowRight className="w-3.5 h-3.5" />
                 </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); onEdit(customer); }}
                    className="app-icon-button rounded-lg p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-gray-800 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                    title="Editar"
                 >
                     <Edit2 className="w-4 h-4" />
                 </button>
                 <button 
                    className="app-icon-button rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300 dark:focus-visible:ring-offset-gray-800 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
                    title="Eliminar"
                    onClick={(e) => { e.stopPropagation(); onDelete(customer.id); }}
                 >
                     <Trash2 className="w-4 h-4" />
                 </button>
                 <button 
                    className="app-icon-button rounded-lg p-1.5 text-green-600 transition-colors hover:bg-green-50 hover:text-green-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:text-green-400 dark:hover:bg-green-900/20 dark:hover:text-green-300 dark:focus-visible:ring-offset-gray-800 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-visible:opacity-100"
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
