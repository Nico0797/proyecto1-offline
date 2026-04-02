import React, { useState } from 'react';
import { Customer } from '../../types';
import { useCustomerStore } from '../../store/customerStore';
import { useBusinessStore } from '../../store/businessStore';
import { useSaleStore } from '../../store/saleStore';
import { Button } from '../ui/Button';
import { Edit2, Trash2, Wallet, MessageSquare, Phone, Mail, CreditCard, Clock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { CreatePaymentModal } from '../Payments/CreatePaymentModal';
import { CreateCustomerModal } from '../Customers/CreateCustomerModal';
import { EditDebtTermModal } from './EditDebtTermModal';
import { debtTermsStore } from '../../utils/debtTermsStore';

interface CustomerDetailPanelProps {
  customer: Customer | null;
  onClose: () => void;
}

const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString();
};

export const CustomerDetailPanel: React.FC<CustomerDetailPanelProps> = ({ customer, onClose }) => {
  const { activeBusiness } = useBusinessStore();
  const { deleteCustomer, fetchCustomers } = useCustomerStore();
  const { sales } = useSaleStore();
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Debt Editing
  const [isEditTermModalOpen, setIsEditTermModalOpen] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState<number | null>(null);

  // Force update UI when terms change (using underscore to indicate unused tick value)
  const [, setTick] = useState(0);

  if (!customer) return (
    <div className="flex-1 flex items-center justify-center text-gray-400">
      Selecciona un cliente para ver detalles.
    </div>
  );

  // Sort sales by date desc
  const customerSales = sales.filter(s => s.customer_id === customer.id).sort((a, b) => new Date(b.sale_date).getTime() - new Date(a.sale_date).getTime());
  const pendingSales = customerSales.filter(s => s.status === 'pending');

  const handlePay = () => {
    setIsPaymentModalOpen(true);
  };

  const handleDelete = async () => {
    if (!activeBusiness || !customer) return;
    if (window.confirm('¿Eliminar cliente?')) {
      await deleteCustomer(activeBusiness.id, customer.id);
      onClose();
    }
  };

  const handleWhatsApp = () => {
    if (!customer.phone) return alert('Cliente sin teléfono');
    const msg = `Hola ${customer.name}, te escribimos de ${activeBusiness?.name}.`;
    window.open(`https://wa.me/57${customer.phone}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const openEditTerm = (saleId: number) => {
      setSelectedSaleId(saleId);
      setIsEditTermModalOpen(true);
  };

  return (
    <div className="app-canvas flex-1 flex flex-col h-full overflow-y-auto">
      {/* Header */}
      <div className="app-page-header sticky top-0 z-20 flex items-center justify-between border-b app-divider p-4 shadow-sm lg:shadow-none md:p-6">
        <div className="flex items-center gap-3">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-full transition-colors active:bg-gray-200 dark:active:bg-gray-600"
            aria-label="Volver"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-0.5">{customer.name}</h2>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-gray-500 dark:text-gray-400">
              {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</span>}
              {customer.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {customer.email}</span>}
            </div>
            <div className="mt-1 text-xs text-gray-400 flex items-center gap-1">
              <span>Registrado por:</span>
              <span className="font-medium text-gray-600 dark:text-gray-300">
                {customer.created_by_name || 'Histórico'}
              </span>
              {customer.created_by_role && (
                <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-[10px] text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-600">
                  {customer.created_by_role}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setIsEditModalOpen(true)} className="h-8 w-8 p-0 flex items-center justify-center">
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button variant="secondary" size="sm" className="h-8 w-8 p-0 flex items-center justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 md:p-6 space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl p-5 md:p-6 text-white shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Saldo Pendiente</p>
                <h3 className="text-3xl md:text-4xl font-bold tracking-tight">${(customer.balance || 0).toLocaleString()}</h3>
            </div>
            <Button 
              onClick={handlePay}
              className="w-full md:w-auto bg-white text-blue-600 hover:bg-blue-50 border-none font-bold shadow-sm py-2 h-auto text-sm md:text-base"
              size="sm"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Registrar Pago
            </Button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button onClick={handleWhatsApp} className="app-surface flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
            <MessageSquare className="w-5 h-5 text-green-500" />
            <span className="text-xs font-medium">WhatsApp</span>
          </button>
          <button className="app-surface flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-gray-700 transition-colors hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700">
            <CreditCard className="w-5 h-5 text-blue-500" />
            <span className="text-xs font-medium">Nueva Venta</span>
          </button>
        </div>

        {/* Active Debts List */}
        {pendingSales.length > 0 && (
            <div className="app-surface rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-500" />
                    Cuentas por Cobrar
                </h3>
                <div className="space-y-4">
                    {pendingSales.map(sale => {
                        const dueDate = debtTermsStore.calculateDueDate(sale.sale_date, sale.id);
                        const isOverdue = new Date() > dueDate;
                        const daysLeft = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

                        return (
                            <div key={sale.id} className="app-soft-surface rounded-lg p-4 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-gray-900 dark:text-white">Venta #{sale.id}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(sale.sale_date)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-bold text-gray-900 dark:text-white">${sale.total.toLocaleString()}</p>
                                        <p className="text-xs text-red-500 font-medium">Debe: ${sale.balance.toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                        {isOverdue ? <AlertTriangle className="w-3 h-3 text-red-500" /> : <Clock className="w-3 h-3" />}
                                        {isOverdue ? `Venció hace ${Math.abs(daysLeft)} días` : `Vence en ${daysLeft} días`}
                                        <span className="text-gray-400 ml-1">({dueDate.toLocaleDateString()})</span>
                                    </p>
                                    <Button size="sm" variant="secondary" className="h-7 text-xs" onClick={() => openEditTerm(sale.id)}>
                                        Editar Plazo
                                    </Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* History / Details Placeholder */}
        <div className="app-surface min-h-[300px] rounded-xl p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Historial Reciente</h3>
          {customerSales.length > 0 ? (
             <div className="space-y-3">
                 {customerSales.slice(0, 5).map(sale => (
                     <div key={sale.id} className="flex justify-between items-center py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
                         <div>
                             <p className="text-sm font-medium text-gray-900 dark:text-white">Venta #{sale.id}</p>
                             <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(sale.sale_date)}</p>
                         </div>
                         <p className="text-sm font-bold text-gray-900 dark:text-white">${sale.total.toLocaleString()}</p>
                     </div>
                 ))}
             </div>
          ) : (
            <div className="text-center text-gray-400 py-12">
                <p>No hay movimientos recientes.</p>
            </div>
          )}
        </div>
      </div>

      <CreatePaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => {
            if (activeBusiness) fetchCustomers(activeBusiness.id);
        }}
        initialCustomerId={customer.id}
      />

      <CreateCustomerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
            if (activeBusiness) fetchCustomers(activeBusiness.id);
        }}
        customerToEdit={customer}
      />

      {selectedSaleId && (
          <EditDebtTermModal 
            isOpen={isEditTermModalOpen}
            onClose={() => setIsEditTermModalOpen(false)}
            saleId={selectedSaleId}
            currentTermDays={debtTermsStore.getTerm(selectedSaleId).termDays}
            currentDueDate={debtTermsStore.getTerm(selectedSaleId).dueDate}
            onSave={() => setTick(t => t + 1)} // Refresh
          />
      )}
    </div>
  );
};
