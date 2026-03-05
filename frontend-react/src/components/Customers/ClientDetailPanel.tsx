import React, { useState } from 'react';
import { Customer } from '../../types';
import { formatCOP } from './helpers';
import { Button } from '../ui/Button';
import { Phone, Mail, MapPin, Calendar, DollarSign, Edit2, MessageCircle, Plus, ArrowLeft } from 'lucide-react';
import { WhatsAppPreviewModal } from './WhatsAppPreviewModal';

interface ClientDetailPanelProps {
  customer: Customer | null;
  onEdit: () => void;
  onClose: () => void; // For mobile
}

export const ClientDetailPanel: React.FC<ClientDetailPanelProps> = ({ customer, onEdit, onClose }) => {
  const [activeTab, setActiveTab] = useState<'summary' | 'debts' | 'history'>('summary');
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);

  if (!customer) {
    return (
      <div className="h-full hidden lg:flex flex-col items-center justify-center text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 m-4">
        <p>Selecciona un cliente para ver detalles</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden absolute inset-0 lg:relative z-20">
      {/* Header */}
      <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex justify-between items-start mb-4 md:mb-0">
           <div className="flex items-center gap-3 md:gap-4">
              <Button variant="ghost" size="sm" className="lg:hidden mr-1 px-2" onClick={onClose}>
                 <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl md:text-2xl font-bold shadow-lg shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{customer.name}</h2>
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {customer.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {customer.phone}</span>}
                      {customer.email && <span className="flex items-center gap-1 truncate"><Mail className="w-3 h-3" /> {customer.email}</span>}
                  </div>
              </div>
           </div>
           <div className="flex gap-2 shrink-0">
               <Button variant="secondary" size="sm" onClick={onEdit} className="hidden md:flex">
                   <Edit2 className="w-4 h-4 mr-2" /> Editar
               </Button>
               <Button size="sm" variant="secondary" onClick={onEdit} className="md:hidden px-2">
                   <Edit2 className="w-4 h-4" />
               </Button>
               
               <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-none hidden md:flex" onClick={() => setIsWhatsAppOpen(true)} data-tour="customers.whatsappBtn">
                   <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
               </Button>
               <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-none md:hidden px-2" onClick={() => setIsWhatsAppOpen(true)} data-tour="customers.whatsappBtn">
                   <MessageCircle className="w-4 h-4" />
               </Button>
           </div>
        </div>
        
        {/* Quick Stats Strip */}
        <div className="grid grid-cols-3 gap-2 md:gap-4 mt-4 md:mt-6">
            <div className="bg-white dark:bg-gray-800 p-2 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">Deuda Total</p>
                <p className={`text-sm md:text-lg font-bold ${customer.balance > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'}`}>
                    {formatCOP(customer.balance)}
                </p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">Compras</p>
                <p className="text-sm md:text-lg font-bold text-gray-900 dark:text-white">$0</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-2 md:p-3 rounded-lg border border-gray-200 dark:border-gray-700 text-center">
                <p className="text-[10px] md:text-xs text-gray-500 uppercase tracking-wider mb-1">Última Compra</p>
                <p className="text-sm md:text-lg font-bold text-gray-900 dark:text-white">N/A</p>
            </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 px-4 md:px-6 overflow-x-auto">
          <button
            className={`py-3 md:py-4 px-3 md:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'summary' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('summary')}
          >
            Resumen
          </button>
          <button
            className={`py-3 md:py-4 px-3 md:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'debts' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('debts')}
            data-tour="customers.payment"
          >
            Deudas
          </button>
          <button
            className={`py-3 md:py-4 px-3 md:px-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === 'history' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400'}`}
            onClick={() => setActiveTab('history')}
            data-tour="customers.history"
          >
            Historial
          </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {activeTab === 'summary' && (
              <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                          <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Información de Contacto</h3>
                          <div className="space-y-3 text-sm">
                              <div className="flex items-start gap-3" data-tour="customers.address">
                                  <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <span className="text-gray-600 dark:text-gray-300">{customer.address || 'Sin dirección registrada'}</span>
                              </div>
                              <div className="flex items-start gap-3">
                                  <Calendar className="w-4 h-4 text-gray-400 mt-0.5" />
                                  <span className="text-gray-600 dark:text-gray-300">Cliente desde: {new Date(customer.created_at).toLocaleDateString()}</span>
                              </div>
                          </div>
                      </div>
                      
                      <div className="space-y-4">
                          <h3 className="font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Notas Internas</h3>
                          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800/30 text-sm text-yellow-800 dark:text-yellow-200" data-tour="customers.tags">
                              <p>No hay notas registradas para este cliente.</p>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'debts' && (
              <div className="space-y-4">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="font-bold text-gray-900 dark:text-white">Cuentas Pendientes</h3>
                      <Button size="sm">
                          <Plus className="w-4 h-4 mr-2" /> Registrar Abono
                      </Button>
                  </div>
                  
                  {customer.balance > 0 ? (
                      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                          <table className="w-full text-left text-sm">
                              <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium">
                                  <tr>
                                      <th className="px-4 py-3">Fecha</th>
                                      <th className="px-4 py-3">Concepto</th>
                                      <th className="px-4 py-3 text-right">Monto</th>
                                      <th className="px-4 py-3 text-center">Acciones</th>
                                  </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                  {/* Mock Debt Row - Real data would come from sales endpoint */}
                                  <tr>
                                      <td className="px-4 py-3 text-gray-600">2023-10-15</td>
                                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">Venta #1234 (Fiado)</td>
                                      <td className="px-4 py-3 text-right text-red-600 font-bold">{formatCOP(customer.balance)}</td>
                                      <td className="px-4 py-3 text-center">
                                          <button className="text-blue-600 hover:underline text-xs">Ver</button>
                                      </td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  ) : (
                      <div className="text-center p-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-green-200 dark:border-green-900/30">
                          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600 dark:text-green-400">
                              <DollarSign className="w-6 h-6" />
                          </div>
                          <p className="text-gray-900 dark:text-white font-medium">¡Todo al día!</p>
                          <p className="text-sm text-gray-500">Este cliente no tiene deudas pendientes.</p>
                      </div>
                  )}
              </div>
          )}

          {activeTab === 'history' && (
              <div className="text-center text-gray-500 py-8">
                  Historial de transacciones próximamente...
              </div>
          )}
      </div>

      <WhatsAppPreviewModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        phoneNumber={customer.phone || ''}
        customerName={customer.name}
        balance={customer.balance}
        messageType={customer.balance > 0 ? 'collection' : 'greeting'}
      />
    </div>
  );
};
