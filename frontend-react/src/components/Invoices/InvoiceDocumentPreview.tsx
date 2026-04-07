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
  <div className="text-[11px] font-semibold uppercase tracking-[0.24em] app-text-muted">
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
      'app-inline-panel min-w-0 rounded-[22px] shadow-sm',
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
    <span className={cn('min-w-0 app-text-muted', emphasize && 'app-text-secondary')}>
      {label}
    </span>
    <span
      className={cn(
        'max-w-full text-right font-medium app-text [overflow-wrap:anywhere]',
        emphasize && 'text-base font-semibold app-text'
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
  <div className="app-surface min-w-0 rounded-[18px] px-3.5 py-3 shadow-sm">
    <div className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] app-text-muted">
      {icon}
      <span>{label}</span>
    </div>
    <div className="mt-2 text-sm font-semibold leading-6 app-text [overflow-wrap:anywhere]">
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
    <span className="app-text-muted">{label}</span>
    <span className="text-right font-medium app-text [overflow-wrap:anywhere]">
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
    <div className="app-elevated-card overflow-hidden rounded-[28px] ring-1 ring-[color:color-mix(in_srgb,var(--app-border)_72%,transparent)]">
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
                  className="h-14 w-14 shrink-0 rounded-2xl border app-divider object-cover shadow-sm"
                />
              ) : (
                <div className="app-inline-panel flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-dashed app-text-muted shadow-sm">
                  <Building2 className="h-6 w-6" />
                </div>
              )}
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.3em] app-text-muted">
                  Documento digital
                </div>
                <h2 className="mt-1 text-balance text-[clamp(1.45rem,2.2vw,2.15rem)] font-semibold tracking-tight app-text [overflow-wrap:anywhere]">
                  {business?.name || 'Tu negocio'}
                </h2>
                <p className="mt-1 max-w-2xl text-sm leading-6 app-text-muted">
                  Vista previa lista para compartir, descargar o imprimir.
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[minmax(0,1.16fr)_minmax(0,0.94fr)]">
              <InfoCard label="Cliente" compact={compact}>
                <div className="flex min-w-0 items-start gap-3 text-sm app-text-secondary">
                  <div className="app-surface rounded-2xl p-2 app-text-muted shadow-sm">
                    <UserRound className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="font-medium leading-6 app-text [overflow-wrap:anywhere]">{customerName}</div>
                    {customerAddress && (
                      <div className="text-sm leading-6 app-text-muted [overflow-wrap:anywhere]">
                        {customerAddress}
                      </div>
                    )}
                    {customerPhone && (
                      <div className="flex min-w-0 items-start gap-2 text-sm leading-6 app-text-muted">
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

          <div className="app-inline-panel-info min-w-0 rounded-[24px] p-5 sm:p-6">
            <SectionLabel>Factura</SectionLabel>
            <div className="mt-3 flex flex-wrap items-start gap-3">
              <h3
                className={cn(
                  'min-w-0 flex-1 font-semibold tracking-tight app-text [overflow-wrap:anywhere]',
                  compact ? 'text-[clamp(1.55rem,2.8vw,2.25rem)] leading-tight' : 'text-[clamp(1.7rem,3vw,2.65rem)] leading-[1.05]'
                )}
              >
                {invoiceNumber}
              </h3>
              <div className={cn('shrink-0 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold', statusMeta.className)}>
                {statusMeta.label}
              </div>
            </div>
            <div className="app-surface mt-4 rounded-[20px] px-4 py-3.5 shadow-sm">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <SectionLabel>Emitida para</SectionLabel>
                  <div className="mt-1.5 text-sm font-medium leading-6 app-text [overflow-wrap:anywhere]">
                    {customerName}
                  </div>
                </div>
                <div className="min-w-0 sm:text-right">
                  <SectionLabel>Total actual</SectionLabel>
                  <div className="mt-1.5 text-xl font-semibold tracking-tight app-text [overflow-wrap:anywhere]">
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
              <div className="border-t app-divider pt-3">
                <SummaryRow label="Total" value={formatInvoiceMoney(invoice.total, invoice.currency)} emphasize />
              </div>
              <div className="app-surface grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-[20px] px-4 py-3.5 text-sm shadow-sm">
                <span className="inline-flex items-center gap-2 app-text-muted">
                  <CreditCard className="h-4 w-4" /> Saldo pendiente
                </span>
                <span className="text-right text-base font-semibold app-text [overflow-wrap:anywhere]">
                  {formatInvoiceMoney(invoice.outstanding_balance, invoice.currency)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-[24px] border app-divider">
          <div className="divide-y app-divider bg-[color:var(--app-surface-elevated)] md:hidden">
            {invoice.items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm app-text-muted">
                Agrega lineas para ver el documento completo.
              </div>
            ) : (
              invoice.items.map((item, index) => (
                <div key={`${item.id || index}-${index}`} className="space-y-4 px-4 py-4">
                  <div className="space-y-1.5">
                    <div className="font-medium leading-6 app-text [overflow-wrap:anywhere]">
                      {item.description}
                    </div>
                    <div className="text-xs leading-5 app-text-muted [overflow-wrap:anywhere]">
                      {item.product_name || 'Linea manual'}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <ItemMetaRow label="Cantidad" value={String(item.quantity)} />
                    <ItemMetaRow label="Unitario" value={formatInvoiceMoney(item.unit_price, invoice.currency)} />
                    <ItemMetaRow label="Descuento" value={formatInvoiceMoney(item.discount ?? 0, invoice.currency)} />
                    <ItemMetaRow label="Impuesto" value={`${item.tax_rate ?? 0}%`} />
                    <div className="border-t app-divider pt-2">
                      <ItemMetaRow label="Total" value={formatInvoiceMoney(item.line_total ?? item.total ?? 0, invoice.currency)} />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div className="custom-scrollbar hidden overflow-x-auto md:block">
            <table className="min-w-[760px] w-full divide-y app-divider text-sm">
              <thead className="bg-[color:var(--app-surface-soft)]">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.24em] app-text-muted">
                  <th className="px-4 py-3">Descripcion</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Cant.</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Unitario</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Desc.</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Imp.</th>
                  <th className="px-4 py-3 text-right whitespace-nowrap">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y app-divider bg-[color:var(--app-surface-elevated)]">
                {invoice.items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm app-text-muted">
                      Agrega lineas para ver el documento completo.
                    </td>
                  </tr>
                ) : (
                  invoice.items.map((item, index) => (
                    <tr key={`${item.id || index}-${index}`}>
                      <td className="w-[38%] px-4 py-3.5 align-top">
                        <div className="font-medium leading-6 app-text [overflow-wrap:anywhere]">{item.description}</div>
                        <div className="mt-1 text-xs leading-5 app-text-muted [overflow-wrap:anywhere]">
                          {item.product_name || 'Linea manual'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap app-text-secondary">{item.quantity}</td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap app-text-secondary">
                        {formatInvoiceMoney(item.unit_price, invoice.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap app-text-secondary">
                        {formatInvoiceMoney(item.discount ?? 0, invoice.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap app-text-secondary">{item.tax_rate ?? 0}%</td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap font-semibold app-text">
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
          <div className="app-inline-panel rounded-[24px] p-5">
            <SectionLabel>Notas</SectionLabel>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-6 app-text-secondary [overflow-wrap:anywhere]">
              {invoice.notes || settings?.default_notes || 'Sin notas para esta factura.'}
            </div>
          </div>
          <div className="space-y-4">
            <div className="app-inline-panel rounded-[24px] p-5">
              <SectionLabel>Terminos</SectionLabel>
              <div className="mt-3 whitespace-pre-wrap text-sm leading-6 app-text-secondary [overflow-wrap:anywhere]">
                {settings?.default_terms || 'Sin terminos adicionales para este documento.'}
              </div>
            </div>
            <div className="app-inline-panel rounded-[24px] p-5">
              <SectionLabel>Pie de documento</SectionLabel>
              <div className="mt-3 text-sm leading-6 app-text-secondary [overflow-wrap:anywhere]">
                {settings?.footer_text || 'Gracias por tu confianza.'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
