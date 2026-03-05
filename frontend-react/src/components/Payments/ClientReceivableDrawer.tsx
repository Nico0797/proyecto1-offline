import React, { useMemo } from 'react';
import { ClientReceivable, getUnpaidInvoices } from '../../utils/receivables.compute';
import { Sale } from '../../types';
import { Button } from '../ui/Button';
import { MessageSquare, Wallet, X, FileText, Calendar, Clock } from 'lucide-react';
import { cn } from '../../utils/cn';

interface ClientReceivableDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientReceivable | null;
  sales: Sale[];
  onQuickPay: (client: ClientReceivable) => void;
  onWhatsApp: (client: ClientReceivable) => void;
}

export const ClientReceivableDrawer: React.FC<ClientReceivableDrawerProps> = ({
  isOpen,
  onClose,
  client,
  sales,
  onQuickPay,
  onWhatsApp
}) => {
  const unpaidInvoices = useMemo(() => 
    client ? getUnpaidInvoices(sales, client.customerId) : [],
  [sales, client]);

  if (!isOpen || !client) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end pointer-events-none">
      <div 
        className="absolute inset-0 bg-black/50 pointer-events-auto transition-opacity backdrop-blur-sm"
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md bg-white dark:bg-gray-900 h-full shadow-2xl pointer-events-auto transform transition-transform duration-300 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start bg-gray-50 dark:bg-gray-900/50">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">{client.customerName}</h2>
            <div className="flex items-center mt-1 text-sm text-gray-500">
              <UserIcon className="w-4 h-4 mr-1" />
              ID: {client.customerId}
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 dark:hover:bg-gray-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Summary Card */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Saldo Total</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${client.totalDebt.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400 font-medium mb-1">Vencido</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">${client.overdueDebt.toLocaleString()}</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              onClick={() => onQuickPay(client)}
              className="bg-green-600 hover:bg-green-700 text-white border-none shadow-sm py-6"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Registrar Abono
            </Button>
            <Button 
              variant="secondary"
              onClick={() => onWhatsApp(client)}
              className="py-6 border-gray-200 dark:border-gray-700"
            >
              <MessageSquare className="w-5 h-5 mr-2 text-green-500" />
              WhatsApp
            </Button>
          </div>

          {/* Unpaid Invoices List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-gray-400" />
              Facturas Pendientes ({unpaidInvoices.length})
            </h3>
            
            {unpaidInvoices.length === 0 ? (
              <p className="text-gray-500 text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                No hay facturas pendientes.
              </p>
            ) : (
              <div className="space-y-3">
                {unpaidInvoices.map((inv) => (
                  <div 
                    key={inv.id} 
                    className={cn(
                      "p-4 rounded-xl border transition-all hover:shadow-sm",
                      inv.isOverdue 
                        ? "bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/30" 
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                    )}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white">Venta #{inv.id}</span>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Calendar className="w-3 h-3 mr-1" />
                          {new Date(inv.saleDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 dark:text-white">${inv.balance.toLocaleString()}</span>
                        <div className="text-xs text-gray-400 mt-1">de ${inv.total.toLocaleString()}</div>
                      </div>
                    </div>
                    
                    {inv.isOverdue && (
                      <div className="flex items-center text-xs font-medium text-red-600 dark:text-red-400 mt-2 bg-white dark:bg-gray-900/50 w-fit px-2 py-1 rounded">
                        <Clock className="w-3 h-3 mr-1" />
                        Vencida hace {inv.daysOverdue} días
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
           <Button variant="ghost" className="w-full text-gray-500" onClick={onClose}>
             Cerrar Detalle
           </Button>
        </div>
      </div>
    </div>
  );
};

const UserIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
