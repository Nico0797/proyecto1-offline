import { Building2, CalendarDays, CreditCard, Phone, UserRound } from 'lucide-react';
import { Business, Customer, Invoice, InvoiceSettings } from '../../types';
import { cn } from '../../utils/cn';
import {
  formatInvoiceDate,
  formatInvoiceMoney,
  INVOICE_STATUS_META,
} from './invoiceHelpers';

interface InvoiceDocumentPreviewProps {
  business: Business | null;
  customer?: Customer | null;
  invoice: Invoice;
  settings: InvoiceSettings | null;
  compact?: boolean;
}

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">
    {children}
  </div>
);

const InfoCard = ({
  label,
  children,
  compact = false,
}: {
  label: string;
  children: React.ReactNode;
  compact?: boolean;
}) => (
  <div
    className={cn(
      'min-w-0 rounded-[22px] border border-slate-200 bg-slate-50/90 shadow-sm dark:border-slate-800 dark:bg-slate-900/80',
      compact ? 'px-4 py-4' : 'px-4 py-4 sm:px-5 sm:py-5'
    )}
  >
    <SectionLabel>{label}</SectionLabel>
    <div className="mt-3 min-w-0">{children}</div>
  </div>
);

const SummaryRow = ({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) => (
  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
    <span className={cn('min-w-0 text-slate-500 dark:text-slate-400', emphasize && 'text-slate-700 dark:text-slate-300')}>
      {label}
    </span>
    <span
      className={cn(
        'max-w-full text-right font-medium text-slate-900 [overflow-wrap:anywhere] dark:text-slate-100',
        emphasize && 'text-base font-semibold text-slate-950 dark:text-white'
      )}
    >
      {value}
    </span>
  </div>
);

const InfoDetailCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) => (
  <div className="min-w-0 rounded-[18px] border border-slate-200/90 bg-white/80 px-3.5 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
    <div className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
      {icon}
      <span>{label}</span>
    </div>
    <div className="mt-2 text-sm font-semibold leading-6 text-slate-900 [overflow-wrap:anywhere] dark:text-white">
      {value}
    </div>
  </div>
);

const ItemMetaRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => (
  <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-sm">
    <span className="text-slate-500 dark:text-slate-400">{label}</span>
    <span className="text-right font-medium text-slate-900 [overflow-wrap:anywhere] dark:text-slate-100">
      {value}
    </span>
  </div>
);

export const InvoiceDocumentPreview = ({
  business,
  customer,
  invoice,
  settings,
  compact = false,
}: InvoiceDocumentPreviewProps) => {
  const statusMeta = INVOICE_STATUS_META[invoice.status];
  const logoUrl = settings?.logo_url || business?.settings?.logo || business?.settings?.logo_url || null;
  const customerName = customer?.name || invoice.customer_name || 'Cliente ocasional';
  const customerAddress = customer?.address || invoice.customer_address;
  const customerPhone = customer?.phone || invoice.customer_phone;
  const invoiceNumber = invoice.invoice_number || 'INV-BORRADOR';
  const shellSpacing = compact ? 'space-y-5 p-4 sm:p-5' : 'space-y-7 p-5 sm:p-7';
  const topGridClass = compact
    ? 'grid gap-5 lg:grid-cols-[minmax(0,1.18fr)_minmax(17rem,0.92fr)] xl:grid-cols-[minmax(0,1.26fr)_minmax(18.25rem,0.88fr)] xl:items-start'
    : 'grid gap-6 lg:grid-cols-[minmax(0,1.28fr)_minmax(18.5rem,0.9fr)] xl:grid-cols-[minmax(0,1.42fr)_minmax(20rem,0.84fr)] xl:items-start';
  const noteGridClass = compact
    ? 'grid gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(18rem,0.94fr)]'
    : 'grid gap-4 lg:grid-cols-[minmax(0,1.16fr)_minmax(18.5rem,0.84fr)]';

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200/90 bg-white shadow-[0_30px_80px_-42px_rgba(15,23,42,0.45)] ring-1 ring-slate-950/5 dark:border-slate-800 dark:bg-slate-950 dark:ring-white/5">
      <div
        className="h-2 rounded-t-[28px]"
        style={{
          background: `linear-gradient(90deg, ${settings?.brand_color || '#2563EB'}, ${settings?.accent_color || '#0F172A'})`,
        }}
      />
      <div className={shellSpacing}>
        <div className={topGridClass}>
          <div className="min-w-0 space-y-4">
            <div className="flex min-w-0 items-start gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Logo del negocio"
                  className="h-14 w-14 shrink-0 rounded-2xl border border-slate-200 object-cover shadow-sm dark:border-slate-800"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-500">
                  <Building2 className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500">
                  Documento digital
                </div>
                <h2 className="mt-1 text-balance text-[clamp(1.45rem,2.2vw,2.15rem)] font-semibold tracking-tight text-slate-950 [overflow-wrap:anywhere] dark:text-white">
                  {business?.name || 'Tu negocio'}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Vista previa lista para compartir, descargar o imprimir.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.16fr)_minmax(0,0.94fr)]">
              <InfoCard label="Cliente" compact={compact}>
                <div className="flex min-w-0 items-start gap-3 text-sm text-slate-700 dark:text-slate-200">
                  <div className="rounded-2xl bg-white/80 p-2 text-slate-400 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-950 dark:ring-slate-800">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="font-medium leading-6 text-slate-900 [overflow-wrap:anywhere] dark:text-white">{customerName}</div>
                    {customerAddress && (
                      <div className="text-sm leading-6 text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
                        {customerAddress}
                      </div>
                    )}
                    {customerPhone && (
                      <div className="flex min-w-0 items-start gap-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                        <Phone className="mt-1 h-3.5 w-3.5 shrink-0" />
                        <span className="[overflow-wrap:anywhere]">{customerPhone}</span>
                      </div>
                    )}
                  </div>
                </div>
              </InfoCard>
              <InfoCard label="Fechas y pago" compact={compact}>
                <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
                  <InfoDetailCard
                    label="Emision"
                    value={formatInvoiceDate(invoice.issue_date)}
                    icon={<CalendarDays className="h-3.5 w-3.5 shrink-0" />}
                  />
                  <InfoDetailCard
                    label="Vencimiento"
                    value={formatInvoiceDate(invoice.due_date)}
                  />
                  <InfoDetailCard
                    label="Metodo"
                    value={invoice.payment_method || 'Por definir'}
                  />
                </div>
              </InfoCard>
            </div>
          </div>

          <div className="min-w-0 rounded-[24px] border border-slate-200 bg-gradient-to-br from-slate-50 via-white to-slate-100/80 p-5 shadow-sm dark:border-slate-800 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900/60 sm:p-6">
            <SectionLabel>Factura</SectionLabel>
            <div className="mt-3 flex flex-wrap items-start gap-3">
              <h3
                className={cn(
                  'min-w-0 flex-1 font-semibold tracking-tight text-slate-950 [overflow-wrap:anywhere] dark:text-white',
                  compact ? 'text-[clamp(1.55rem,2.8vw,2.25rem)] leading-tight' : 'text-[clamp(1.7rem,3vw,2.65rem)] leading-[1.05]'
                )}
              >
                {invoiceNumber}
              </h3>
              <div className={cn('shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', statusMeta.className)}>
                {statusMeta.label}
              </div>
            </div>
            <div className="mt-4 rounded-[20px] border border-white/70 bg-white/85 px-4 py-3.5 shadow-sm dark:border-white/5 dark:bg-slate-950/80">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <SectionLabel>Emitida para</SectionLabel>
                  <div className="mt-1.5 text-sm font-medium leading-6 text-slate-900 [overflow-wrap:anywhere] dark:text-white">
                    {customerName}
                  </div>
                </div>
                <div className="min-w-0 sm:text-right">
                  <SectionLabel>Total actual</SectionLabel>
                  <div className="mt-1.5 text-xl font-semibold tracking-tight text-slate-950 [overflow-wrap:anywhere] dark:text-white">
                    {formatInvoiceMoney(invoice.total, invoice.currency)}
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <SummaryRow label="Subtotal" value={formatInvoiceMoney(invoice.subtotal, invoice.currency)} />
              <SummaryRow label="Descuentos" value={formatInvoiceMoney(invoice.discount_total, invoice.currency)} />
              <SummaryRow label="Impuestos" value={formatInvoiceMoney(invoice.tax_total, invoice.currency)} />
              <SummaryRow label="Pagado" value={formatInvoiceMoney(invoice.amount_paid, invoice.currency)} />
              <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                <SummaryRow label="Total" value={formatInvoiceMoney(invoice.total, invoice.currency)} emphasize />
              </div>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[20px] border border-slate-200 bg-white px-4 py-3.5 text-sm shadow-sm dark:border-slate-800 dark:bg-slate-950">
                <span className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <CreditCard className="h-4 w-4" /> Saldo pendiente
                </span>
                <span className="text-right text-base font-semibold text-slate-950 [overflow-wrap:anywhere] dark:text-white">
                  {formatInvoiceMoney(invoice.outstanding_balance, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-slate-200 dark:border-slate-800">
          <div className="divide-y divide-slate-200 bg-white md:hidden dark:divide-slate-800 dark:bg-slate-950">
            {invoice.items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                Agrega lineas para ver el documento completo.
              </div>
            ) : (
              invoice.items.map((item, index) => (
                <div key={`${item.id || index}-${index}`} className="space-y-4 px-4 py-4">
                  <div className="space-y-1.5">
                    <div className="font-medium leading-6 text-slate-900 [overflow-wrap:anywhere] dark:text-white">
                      {item.description}
                    </div>
                    <div className="text-xs leading-5 text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
                      {item.product_name || 'Linea manual'}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <ItemMetaRow label="Cantidad" value={String(item.quantity)} />
                    <ItemMetaRow label="Unitario" value={formatInvoiceMoney(item.unit_price, invoice.currency)} />
                    <ItemMetaRow label="Descuento" value={formatInvoiceMoney(item.discount ?? 0, invoice.currency)} />
                    <ItemMetaRow label="Impuesto" value={`${item.tax_rate ?? 0}%`} />
                    <div className="border-t border-slate-200 pt-2 dark:border-slate-800">
                      <ItemMetaRow label="Total" value={formatInvoiceMoney(item.line_total ?? item.total ?? 0, invoice.currency)} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="custom-scrollbar hidden overflow-x-auto md:block">
            <table className="min-w-[760px] w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  <th className="px-4 py-3">Descripcion</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Cant.</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Unitario</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Desc.</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Imp.</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white dark:divide-slate-800 dark:bg-slate-950">
                {invoice.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                      Agrega lineas para ver el documento completo.
                    </td>
                  </tr>
                ) : (
                  invoice.items.map((item, index) => (
                    <tr key={`${item.id || index}-${index}`}>
                      <td className="w-[38%] px-4 py-3.5 align-top">
                        <div className="font-medium leading-6 text-slate-900 [overflow-wrap:anywhere] dark:text-white">{item.description}</div>
                        <div className="mt-1 text-xs leading-5 text-slate-500 [overflow-wrap:anywhere] dark:text-slate-400">
                          {item.product_name || 'Linea manual'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatInvoiceMoney(item.unit_price, invoice.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">
                        {formatInvoiceMoney(item.discount ?? 0, invoice.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap text-slate-600 dark:text-slate-300">{item.tax_rate ?? 0}%</td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-semibold text-slate-900 dark:text-white">
                        {formatInvoiceMoney(item.line_total ?? item.total ?? 0, invoice.currency)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={noteGridClass}>
          <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-900/85">
            <SectionLabel>Notas</SectionLabel>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">
              {invoice.notes || settings?.default_notes || 'Sin notas para esta factura.'}
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <SectionLabel>Terminos</SectionLabel>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">
                {settings?.default_terms || 'Sin terminos adicionales para este documento.'}
              </div>
            </div>
            <div className="rounded-[24px] border border-slate-200 bg-slate-50/90 p-5 dark:border-slate-800 dark:bg-slate-900/85">
              <SectionLabel>Pie de documento</SectionLabel>
              <div className="mt-3 text-sm leading-6 text-slate-700 [overflow-wrap:anywhere] dark:text-slate-200">
                {settings?.footer_text || 'Gracias por tu confianza.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
