import React, { useEffect, useState } from 'react';
import { MessageCircle, Printer, CheckCircle, Clock, AlertTriangle, Pencil, CalendarDays } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useBusinessStore } from '../../store/businessStore';
import { isBackendCapabilitySupported } from '../../config/backendCapabilities';
import { isOfflineProductMode } from '../../runtime/runtimeMode';
import { Sale, SaleCosting, SaleCostingItem, SaleItem } from '../../types';
import api from '../../services/api';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { MobileDataCard, MobileDataRow } from '../ui/MobileDataCard';
import { buildWhatsAppMessage, formatCOP, getStatusColor, getStatusLabel } from './helpers';

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  onEdit?: (sale: Sale) => void;
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

const renderMobileSaleItem = (item: SaleItem, index: number) => (
  <MobileDataCard key={`${item.product_id || item.name}-${index}`}>
    <div className="mb-3 min-w-0">
      <div className="break-words text-base font-semibold text-gray-900 dark:text-white">{item.name}</div>
    </div>
    <div className="space-y-2.5">
      <MobileDataRow label="Cantidad" value={item.qty} align="end" />
      <MobileDataRow label="Precio" value={formatCOP(item.unit_price)} align="end" />
      <MobileDataRow
        label="Total"
        value={formatCOP(item.total)}
        align="end"
        valueClassName="text-base font-semibold"
        className="border-t border-gray-100 pt-2.5 dark:border-gray-700"
      />
    </div>
  </MobileDataCard>
);

const resolveCostValue = (item: SaleCostingItem) => {
  if (item.consumed_cost_total !== null && item.consumed_cost_total !== undefined) {
    return formatCOP(item.consumed_cost_total);
  }
  if (item.partial_consumed_cost_total !== null && item.partial_consumed_cost_total !== undefined) {
    return `Parcial ${formatCOP(item.partial_consumed_cost_total)}`;
  }
  return '-';
};

const renderMobileCostingItem = (item: SaleCostingItem, index: number) => (
  <MobileDataCard key={`${item.product_id || item.product_name}-${index}`}>
    <div className="mb-3 min-w-0">
      <div className="break-words text-base font-semibold text-gray-900 dark:text-white">
        {item.product_name || 'Producto'}
      </div>
      <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {item.quantity_sold} und
        {item.cost_status_label ? ` - ${item.cost_status_label}` : ''}
      </div>
    </div>
    <div className="space-y-2.5">
      <MobileDataRow label="Ingreso" value={formatCOP(item.revenue_total || 0)} align="end" />
      <MobileDataRow label="Costo" value={resolveCostValue(item)} align="end" />
      <MobileDataRow
        label="Margen"
        value={item.estimated_gross_margin !== null && item.estimated_gross_margin !== undefined ? formatCOP(item.estimated_gross_margin) : '-'}
        align="end"
        valueClassName="text-base font-semibold"
        className="border-t border-gray-100 pt-2.5 dark:border-gray-700"
      />
    </div>
  </MobileDataCard>
);

export const SaleDetailsModal: React.FC<SaleDetailsModalProps> = ({
  isOpen,
  onClose,
  sale,
  onEdit,
}) => {
  const { activeBusiness } = useBusinessStore();
  const supportsSaleCosting = !isOfflineProductMode() && isBackendCapabilitySupported('profitability');
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
  const employeeCommissionAmount = Number(resolvedSale.employee_commission_amount || 0);
  const employeeCommissionPercent = Number(resolvedSale.employee_commission_percent || 0);
  const serviceNetAmount = resolvedSale.sale_origin === 'appointment'
    ? Number(resolvedSale.total || 0) - employeeCommissionAmount
    : null;

  const handleWhatsApp = () => {
    if (!activeBusiness) return;
    const message = buildWhatsAppMessage(resolvedSale, activeBusiness.name);
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleEdit = () => {
    if (!onEdit) return;
    onEdit(resolvedSale);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Detalle de Venta #${resolvedSale.id}`}
      className="max-w-2xl"
    >
      <div className="space-y-6">
        <div className="flex flex-col items-start justify-between gap-4 rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50 sm:flex-row sm:items-center">
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Cliente</p>
            <h3 className="flex items-center gap-2 text-lg font-bold text-gray-900 dark:text-white">
              {resolvedSale.customer_name || 'Cliente Casual'}
            </h3>
          </div>
          <div className="text-right">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Estado</p>
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${getStatusColor(resolvedSale.status || 'completed', resolvedSale.paid)}`}>
              {resolvedSale.paid ? <CheckCircle className="mr-1 h-3 w-3" /> : <Clock className="mr-1 h-3 w-3" />}
              {getStatusLabel(resolvedSale.status || 'completed', resolvedSale.paid)}
            </span>
          </div>
        </div>

        {resolvedSale.sale_origin === 'appointment' && (
          <div className="flex flex-wrap items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-500/30 dark:bg-indigo-500/10">
            <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600 dark:text-indigo-400" />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">Venta originada desde una cita</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-indigo-700 dark:text-indigo-300">
                {resolvedSale.appointment_service && <span>Servicio: <strong>{resolvedSale.appointment_service}</strong></span>}
                {resolvedSale.appointment_employee && <span>Empleado: <strong>{resolvedSale.appointment_employee}</strong></span>}
                {employeeCommissionAmount > 0 && <span>Costo empleado: <strong>{formatCOP(employeeCommissionAmount)}</strong>{employeeCommissionPercent > 0 ? ` (${employeeCommissionPercent}%)` : ''}</span>}
                {serviceNetAmount !== null && employeeCommissionAmount > 0 && <span>Neto estimado: <strong>{formatCOP(serviceNetAmount)}</strong></span>}
                {resolvedSale.payment_method && <span>Pago: <strong>{resolvedSale.payment_method}</strong></span>}
                {!resolvedSale.paid && resolvedSale.balance > 0 && <span className="text-amber-700 dark:text-amber-300">Saldo pendiente: <strong>{formatCOP(resolvedSale.balance)}</strong></span>}
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3 md:hidden">
          {saleLoading && (!resolvedSale.items || resolvedSale.items.length === 0) ? (
            <MobileDataCard>
              <div className="py-2 text-center text-sm text-gray-500 dark:text-gray-400">Cargando detalle...</div>
            </MobileDataCard>
          ) : (
            resolvedSale.items.map((item, index) => renderMobileSaleItem(item, index))
          )}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 md:block">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-center">Cant.</th>
                <th className="px-4 py-3 text-right">Precio</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
              {saleLoading && (!resolvedSale.items || resolvedSale.items.length === 0) ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">Cargando detalle...</td>
                </tr>
              ) : (
                resolvedSale.items.map((item, index) => (
                  <tr key={`${item.product_id || item.name}-${index}`}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                    <td className="px-4 py-3 text-center text-gray-600 dark:text-gray-300">{item.qty}</td>
                    <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">{formatCOP(item.unit_price)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900 dark:text-white">{formatCOP(item.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col items-end gap-3 pt-2">
          <div className="w-full max-w-xs space-y-3">
            <div className="flex justify-between text-gray-600 dark:text-gray-400">
              <span>Subtotal</span>
              <span>{formatCOP(resolvedSale.subtotal)}</span>
            </div>
            {resolvedSale.discount > 0 ? (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Descuento</span>
                <span>-{formatCOP(resolvedSale.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between border-t border-gray-200 pt-3 text-xl font-black text-gray-900 dark:border-gray-700 dark:text-white">
              <span>Total</span>
              <span>{formatCOP(resolvedSale.total)}</span>
            </div>

            {!resolvedSale.paid ? (
              <div className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
                <span className="flex items-center gap-2 text-sm font-medium text-red-700 dark:text-red-300">
                  <AlertTriangle className="h-4 w-4" /> Saldo Pendiente
                </span>
                <span className="text-lg font-bold text-red-700 dark:text-red-300">{formatCOP(resolvedSale.balance)}</span>
              </div>
            ) : null}
          </div>
        </div>

        {supportsSaleCosting ? (
          <div className="space-y-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">Costeo estimado</p>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                  {costingLoading ? 'Cargando...' : (costing?.cost_status_label || '-')}
                </h4>
              </div>
              <div
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  costingLoading
                    ? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    : getCostStatusTone(costing?.cost_status)
                }`}
              >
                {costingLoading ? '...' : (costing?.cost_status || '-')}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Costo consumido estimable</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {costingLoading
                    ? 'Cargando...'
                    : costing?.consumed_cost_total !== null && costing?.consumed_cost_total !== undefined
                      ? formatCOP(costing.consumed_cost_total)
                      : 'No estimable'}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Margen bruto estimado</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {costingLoading
                    ? 'Cargando...'
                    : costing?.estimated_gross_margin !== null && costing?.estimated_gross_margin !== undefined
                      ? formatCOP(costing.estimated_gross_margin)
                      : '-'}
                </div>
              </div>
              <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800/50">
                <div className="text-xs uppercase text-gray-500 dark:text-gray-400">Costo parcial disponible</div>
                <div className="mt-1 font-semibold text-gray-900 dark:text-white">
                  {costingLoading
                    ? 'Cargando...'
                    : costing?.partial_consumed_cost_total !== null && costing?.partial_consumed_cost_total !== undefined && !costing?.is_cost_complete
                      ? formatCOP(costing.partial_consumed_cost_total)
                      : '-'}
                </div>
              </div>
            </div>

            {!costingLoading && costing ? (
              <>
                <div className={`rounded-lg border px-3 py-2 text-sm ${getCostStatusTone(costing.cost_status)}`}>
                  {costing.cost_status_message || 'No fue posible determinar el estado del costeo.'}
                </div>

                <div className="space-y-3 md:hidden">
                  {costing.items.map((item, index) => renderMobileCostingItem(item, index))}
                </div>

                <div className="hidden overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 md:block">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
                      <tr>
                        <th className="px-4 py-3 text-left">Producto</th>
                        <th className="px-4 py-3 text-right">Ingreso</th>
                        <th className="px-4 py-3 text-right">Costo</th>
                        <th className="px-4 py-3 text-right">Margen</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white dark:divide-gray-700 dark:bg-gray-800">
                      {costing.items.map((item, index) => (
                        <tr key={`${item.product_id || item.product_name}-${index}`}>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-900 dark:text-white">{item.product_name || 'Producto'}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {item.quantity_sold} und
        {item.cost_status_label ? ` - ${item.cost_status_label}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{formatCOP(item.revenue_total || 0)}</td>
                          <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{resolveCostValue(item)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">
                            {item.estimated_gross_margin !== null && item.estimated_gross_margin !== undefined ? formatCOP(item.estimated_gross_margin) : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        {resolvedSale.note ? (
          <div className="rounded-xl border border-yellow-100 bg-yellow-50 p-4 dark:border-yellow-800/30 dark:bg-yellow-900/10">
            <p className="mb-1 text-xs font-bold uppercase text-yellow-800 dark:text-yellow-500">Notas</p>
            <p className="text-sm text-yellow-900 dark:text-yellow-200">{resolvedSale.note}</p>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-3 border-t border-gray-200 pt-6 dark:border-gray-700 sm:grid-cols-3">
          <Button variant="secondary" onClick={handleEdit} className="w-full" disabled={!onEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Editar venta
          </Button>
          <Button variant="secondary" onClick={handlePrint} className="w-full">
            <Printer className="mr-2 h-4 w-4" />
            Imprimir Comprobante
          </Button>
          <Button onClick={handleWhatsApp} className="w-full border-none bg-green-600 text-white hover:bg-green-700">
            <MessageCircle className="mr-2 h-4 w-4" />
            Enviar por WhatsApp
          </Button>
        </div>
      </div>
    </Modal>
  );
};
