import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Sale } from '../../types';
import { useBusinessStore } from '../../store/businessStore';
import { MessageCircle, Printer, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatCOP, buildWhatsAppMessage, getStatusColor, getStatusLabel } from './helpers';

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  const { activeBusiness } = useBusinessStore();

  if (!sale) return null;

  const handleWhatsApp = () => {
    if (!activeBusiness) return;
    const message = buildWhatsAppMessage(sale, activeBusiness.name);
    const url = `https://wa.me/?text=${message}`;
    window.open(url, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle de Venta #${sale.id}`}
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cliente</p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {sale.customer_name || 'Cliente Casual'}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Estado</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(sale.status || 'completed', sale.paid)}`}>
                {sale.paid ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                {getStatusLabel(sale.status || 'completed', sale.paid)}
            </span>
          </div>
        </div>

        {/* Items Table */}
        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium">
              <tr>
                <th className="text-left px-4 py-3">Producto</th>
                <th className="text-center px-4 py-3">Cant.</th>
                <th className="text-right px-4 py-3">Precio</th>
                <th className="text-right px-4 py-3">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {sale.items.map((item: any, index: number) => (
                <tr key={index}>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{item.qty}</td>
                  <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatCOP(item.unit_price)}</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{formatCOP(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex flex-col items-end gap-3 pt-2">
          <div className="w-full max-w-xs space-y-3">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal</span>
                <span>{formatCOP(sale.subtotal)}</span>
              </div>
              {sale.discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Descuento</span>
                  <span>-{formatCOP(sale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black text-gray-900 dark:text-white pt-3 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span>{formatCOP(sale.total)}</span>
              </div>
              
              {!sale.paid && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 flex justify-between items-center">
                      <span className="text-red-700 dark:text-red-300 font-medium text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Saldo Pendiente
                      </span>
                      <span className="text-red-700 dark:text-red-300 font-bold text-lg">
                          {formatCOP(sale.balance)}
                      </span>
                  </div>
              )}
          </div>
        </div>

        {/* Notes */}
        {sale.note && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800/30">
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-500 uppercase mb-1">Notas</p>
            <p className="text-sm text-yellow-900 dark:text-yellow-200">{sale.note}</p>
          </div>
        )}

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={handlePrint} className="w-full">
            <Printer className="w-4 h-4 mr-2" />
            Imprimir Comprobante
          </Button>
          <Button onClick={handleWhatsApp} className="w-full bg-green-600 hover:bg-green-700 text-white border-none">
            <MessageCircle className="w-4 h-4 mr-2" />
            Enviar por WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  );
};
