import React, { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Sale, SaleCosting } from '../../types';
import { useBusinessStore } from '../../store/businessStore';
import { MessageCircle, Printer, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatCOP, buildWhatsAppMessage, getStatusColor, getStatusLabel } from './helpers';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import { isBackendCapabilitySupported } from '../../config/backendCapabilities';

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
}

const getCostStatusTone = (status?: string) => {
  if (status === 'complete') {
    return 'border-green-200 bg-green-50 text-green-700 dark:border-green-900/40 dark:bg-green-900/10 dark:text-green-300';
  }
  if (status === 'missing_cost') {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-300';
  }
  if (status === 'no_consumption') {
    return 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-300';
};

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  isOpen,
  onClose,
  sale,
}) => {
  const { activeBusiness } = useBusinessStore();
  const supportsSaleCosting = isBackendCapabilitySupported('profitability');
  const [saleDetail, setSaleDetail] = useState<Sale | null>(null);
  const [saleLoading, setSaleLoading] = useState(false);
  const [costing, setCosting] = useState<SaleCosting | null>(null);
  const [costingLoading, setCostingLoading] = useState(false);

  useEffect(() => {
    const loadSale = async () => {
      if (!isOpen || !sale || !activeBusiness) {
        setSaleDetail(null);
        setSaleLoading(false);
        return;
      }
      setSaleLoading(true);
      try {
        const response = await api.get(`/businesses/${activeBusiness.id}/sales/${sale.id}`);
        setSaleDetail(response.data?.sale || sale);
      } catch {
        setSaleDetail(sale);
      } finally {
        setSaleLoading(false);
      }
    };

    loadSale();
  }, [activeBusiness, isOpen, sale]);

  useEffect(() => {
    const loadCosting = async () => {
      if (!isOpen || !sale || !activeBusiness || !supportsSaleCosting) {
        setCosting(null);
        setCostingLoading(false);
        return;
      }
      setCostingLoading(true);
      try {
        const response = await api.get(`/businesses/${activeBusiness.id}/sales/${sale.id}/costing`);
        setCosting(response.data?.costing || null);
      } catch (error: any) {
        setCosting(null);
        if (error?.response?.status !== 404) {
          toast.error(error?.response?.data?.error || 'No fue posible cargar el costeo de la venta');
        }
      } finally {
        setCostingLoading(false);
      }
    };

    loadCosting();
  }, [activeBusiness, isOpen, sale, supportsSaleCosting]);

  if (!sale) return null;

  const resolvedSale = saleDetail || sale;

  const handleWhatsApp = () => {
    if (!activeBusiness) return;
    const message = buildWhatsAppMessage(resolvedSale, activeBusiness.name);
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
      title={`Detalle de Venta #${resolvedSale.id}`}
      className="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Header Info */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Cliente</p>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                {resolvedSale.customer_name || 'Cliente Casual'}
            </h3>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Estado</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(resolvedSale.status || 'completed', resolvedSale.paid)}`}>
                {resolvedSale.paid ? <CheckCircle className="w-3 h-3 mr-1" /> : <Clock className="w-3 h-3 mr-1" />}
                {getStatusLabel(resolvedSale.status || 'completed', resolvedSale.paid)}
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
              {saleLoading && (!resolvedSale.items || resolvedSale.items.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">Cargando detalle...</td>
                </tr>
              ) : resolvedSale.items.map((item: any, index: number) => (
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
                <span>{formatCOP(resolvedSale.subtotal)}</span>
              </div>
              {resolvedSale.discount > 0 && (
                <div className="flex justify-between text-green-600 dark:text-green-400">
                  <span>Descuento</span>
                  <span>-{formatCOP(resolvedSale.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xl font-black text-gray-900 dark:text-white pt-3 border-t border-gray-200 dark:border-gray-700">
                <span>Total</span>
                <span>{formatCOP(resolvedSale.total)}</span>
              </div>
              
              {!resolvedSale.paid && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800 flex justify-between items-center">
                      <span className="text-red-700 dark:text-red-300 font-medium text-sm flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Saldo Pendiente
                      </span>
                      <span className="text-red-700 dark:text-red-300 font-bold text-lg">
                          {formatCOP(resolvedSale.balance)}
                      </span>
                  </div>
              )}
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Costeo estimado</p>
              <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                {!supportsSaleCosting ? 'No disponible' : costingLoading ? 'Cargando...' : (costing?.cost_status_label || '—')}
              </h4>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
              !supportsSaleCosting
                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                : costingLoading
                ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                : getCostStatusTone(costing?.cost_status)
            }`}>
              {!supportsSaleCosting ? 'backend pendiente' : costingLoading ? '...' : (costing?.cost_status || '—')}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
              <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Costo consumido estimable</div>
              <div className="mt-1 font-semibold text-gray-900 dark:text-white">
                {!supportsSaleCosting
                  ? 'No disponible'
                  : costingLoading
                  ? 'Cargando...'
                  : costing?.consumed_cost_total !== null && costing?.consumed_cost_total !== undefined
                    ? formatCOP(costing.consumed_cost_total)
                    : 'No estimable'}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
              <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Margen bruto estimado</div>
              <div className="mt-1 font-semibold text-gray-900 dark:text-white">
                {!supportsSaleCosting
                  ? 'No disponible'
                  : costingLoading
                  ? 'Cargando...'
                  : costing?.estimated_gross_margin !== null && costing?.estimated_gross_margin !== undefined
                    ? formatCOP(costing.estimated_gross_margin)
                    : '—'}
              </div>
            </div>
            <div className="rounded-lg bg-gray-50 dark:bg-gray-800/50 p-3">
              <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Costo parcial disponible</div>
              <div className="mt-1 font-semibold text-gray-900 dark:text-white">
                {!supportsSaleCosting
                  ? 'No disponible'
                  : costingLoading
                  ? 'Cargando...'
                  : costing?.partial_consumed_cost_total !== null && costing?.partial_consumed_cost_total !== undefined && !costing?.is_cost_complete
                    ? formatCOP(costing.partial_consumed_cost_total)
                    : '—'}
              </div>
            </div>
          </div>

          {!supportsSaleCosting ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/40 dark:text-gray-300">
              El backend actual no expone todavia el costeo por venta, asi que este bloque se muestra como no disponible sin lanzar errores.
            </div>
          ) : !costingLoading && costing ? (
            <>
              <div className={`rounded-lg border px-3 py-2 text-sm ${getCostStatusTone(costing.cost_status)}`}>
                {costing.cost_status_message || 'No fue posible determinar el estado del costeo.'}
              </div>

              <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400 font-medium">
                    <tr>
                      <th className="text-left px-4 py-3">Producto</th>
                      <th className="text-right px-4 py-3">Ingreso</th>
                      <th className="text-right px-4 py-3">Costo</th>
                      <th className="text-right px-4 py-3">Margen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {costing.items.map((item, index) => (
                      <tr key={`${item.product_id || item.product_name}-${index}`}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 dark:text-white">{item.product_name || 'Producto'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {item.quantity_sold} und
                            {item.cost_status_label ? ` • ${item.cost_status_label}` : ''}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCOP(item.revenue_total || 0)}</td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {item.consumed_cost_total !== null && item.consumed_cost_total !== undefined
                            ? formatCOP(item.consumed_cost_total)
                            : item.partial_consumed_cost_total !== null && item.partial_consumed_cost_total !== undefined
                              ? `Parcial ${formatCOP(item.partial_consumed_cost_total)}`
                            : '—'}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                          {item.estimated_gross_margin !== null && item.estimated_gross_margin !== undefined
                            ? formatCOP(item.estimated_gross_margin)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </div>

        {/* Notes */}
        {resolvedSale.note && (
          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-xl border border-yellow-100 dark:border-yellow-800/30">
            <p className="text-xs font-bold text-yellow-800 dark:text-yellow-500 uppercase mb-1">Notas</p>
            <p className="text-sm text-yellow-900 dark:text-yellow-200">{resolvedSale.note}</p>
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
