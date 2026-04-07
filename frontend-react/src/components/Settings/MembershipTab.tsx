import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Star, ShieldCheck, CreditCard, Calendar, Download, AlertTriangle, Loader2, TrendingUp, Briefcase } from 'lucide-react';
import { membershipService, MembershipInfo, Pricing } from '../../services/membershipService';
import { Modal } from '../ui/Modal';
import { useBusinessStore } from '../../store/businessStore';
import { useSaleStore } from '../../store/saleStore';
import { useCustomerStore } from '../../store/customerStore';
import { TokenizeCardModal } from './TokenizeCardModal';
import LinkNequiModal from './LinkNequiModal.tsx';
import { wompiService } from '../../services/wompiService';
import api from '../../services/api';
import { getCycleKey, normalizeMembershipPlan } from '../../services/membershipService';

const isValidUrl = (url: string) => {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};

export const MembershipTab = () => {
  const { user } = useAuthStore();
  const { activeBusiness } = useBusinessStore();
  const { sales, fetchSales } = useSaleStore();
  const { customers, fetchCustomers } = useCustomerStore();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showMethodMenu, setShowMethodMenu] = useState(false);
  const [showNequiModal, setShowNequiModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showImpactModal, setShowImpactModal] = useState(false);
  const canManageMembership = user?.account_type !== 'team_member';

  useEffect(() => {
    if (canManageMembership) {
      void loadData();
    }
  }, [canManageMembership, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membData, priceData] = await Promise.all([
        membershipService.getMembership(),
        membershipService.getPricing(),
      ]);
      setMembership(membData);
      setPricing(priceData);
    } catch (error) {
      console.error('Error loading membership data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = (url: string) => {
    if (!url) {
      alert('Enlace no disponible. Intenta mas tarde.');
      return;
    }
    if (isValidUrl(url)) {
      try {
        window.location.href = url;
      } catch {
        window.open(url, '_blank');
      }
    } else {
      try {
        window.open(url, '_blank');
      } catch {
        alert('No se pudo abrir el enlace de facturacion.');
      }
    }
  };

  const handleUpdatePaymentMethod = async () => {
    setShowCardModal(true);
  };

  const handleGooglePayQuick = async () => {
    setProcessing(true);
    try {
      const gpayToken = await wompiService.requestGooglePayToken();
      const res = await api.post('/billing/save-googlepay-source', { token: gpayToken });
      if (!res.data?.success) throw new Error('No se pudo guardar Google Pay');
      await loadData();
    } catch (e: any) {
      alert(e?.message || 'Google Pay no disponible');
    } finally {
      setProcessing(false);
      setShowMethodMenu(false);
    }
  };

  const openImpact = async () => {
    try {
      if (activeBusiness) {
        if (!customers || customers.length === 0) {
          await fetchCustomers(activeBusiness.id);
        }
        if (!sales || sales.length === 0) {
          await fetchSales(activeBusiness.id);
        }
      }
    } finally {
      setShowImpactModal(true);
    }
  };

  const formatCOP = (n: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0);

  const totalVentas = Array.isArray(sales) ? sales.reduce((s: number, v: any) => s + (v.total || 0), 0) : 0;
  const totalClientes = Array.isArray(customers) ? customers.length : 0;
  const totalCobros = Array.isArray(customers) ? customers.filter((c: any) => (c.balance || 0) > 0).length : 0;

  const handleDownloadInvoice = async (invoiceId: string) => {
    try {
      const url = await membershipService.getInvoicePdf(invoiceId);
      window.open(url, '_blank');
    } catch {
      alert('Error al descargar la factura');
    }
  };

  const confirmChangeCycle = async (cycle: 'monthly' | 'quarterly' | 'yearly') => {
    setProcessing(true);
    try {
      const url = await membershipService.changeCycle(cycle);
      if (url) {
        handleRedirect(url);
      } else {
        await loadData();
        alert('Ciclo de facturacion actualizado correctamente.');
        setShowCycleModal(false);
      }
    } catch {
      alert('Error al cambiar el ciclo.');
    } finally {
      setProcessing(false);
    }
  };

  const confirmCancel = async () => {
    setProcessing(true);
    try {
      await membershipService.cancelSubscription('User requested');
      await loadData();
      alert('Tu suscripcion ha sido cancelada. Tendras acceso hasta el final del periodo.');
    } catch {
      alert('Error al cancelar la suscripcion.');
    } finally {
      setProcessing(false);
      setShowCancelModal(false);
    }
  };

  if (!canManageMembership) {
    return (
      <div className="app-surface flex flex-col items-center justify-center p-12 text-center">
        <div className="app-tone-icon-amber mb-4">
          <Star className="h-10 w-10" />
        </div>
        <h3 className="mb-2 text-xl font-bold app-text">Acceso restringido</h3>
        <p className="mb-6 text-sm app-text-muted">Esta seccion es exclusiva para miembros PRO.</p>
        <Button onClick={() => window.open('/pro', '_blank')}>Ver planes</Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-surface flex justify-center gap-2 p-12 app-text">
        <Loader2 className="mr-2 h-8 w-8 animate-spin text-blue-500" /> Cargando informacion...
      </div>
    );
  }

  const normalizedPlan = normalizeMembershipPlan(membership?.plan || user?.plan);
  const isBasic = normalizedPlan === 'basic';
  const isBusiness = normalizedPlan === 'business';
  const planName = isBusiness ? 'Business' : isBasic ? 'Básica' : 'Pro';
  const currentPricing = pricing?.plans?.[isBusiness ? 'business' : isBasic ? 'basic' : 'pro'];
  const currentBillingCycle = getCycleKey(membership?.billingCycle);
  const premiumToneClasses = isBusiness
    ? 'border-purple-500/30 bg-gradient-to-r from-purple-500/12 via-indigo-500/10 to-transparent'
    : isBasic
      ? 'border-blue-500/30 bg-gradient-to-r from-blue-500/12 via-cyan-500/10 to-transparent'
      : 'border-yellow-500/30 bg-gradient-to-r from-yellow-500/12 via-orange-500/10 to-transparent';
  const premiumBadgeClasses = isBusiness ? 'bg-purple-500 text-white' : isBasic ? 'bg-blue-500 text-white' : 'bg-yellow-500 text-white';
  const toneTextClass = isBusiness ? 'text-purple-600 dark:text-purple-300' : isBasic ? 'text-blue-600 dark:text-blue-300' : 'text-amber-600 dark:text-yellow-300';

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className={`app-surface relative overflow-hidden rounded-[28px] border p-8 ${premiumToneClasses}`}>
        <div className="pointer-events-none absolute right-0 top-0 p-6 opacity-10">
          {isBusiness ? <Briefcase className={`h-32 w-32 ${toneTextClass} rotate-12 transform`} /> : <Star className={`h-32 w-32 ${toneTextClass} rotate-12 transform`} />}
        </div>

        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-3">
              <h3 className="text-2xl font-bold app-text">Plan {planName} activo</h3>
              <span className={`${premiumBadgeClasses} rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider`}>Premium</span>
            </div>
            <p className="app-text-secondary">
              Tu proximo cobro sera el{' '}
              <span className="font-medium app-text">
                {membership?.nextBillingDate ? new Date(membership.nextBillingDate).toLocaleDateString() : 'N/A'}
              </span>
              <span className="ml-2 text-sm app-text-muted">({currentPricing?.cycles?.[currentBillingCycle]?.label || 'Mensual'})</span>
            </p>
            {(!membership?.status || membership.status === 'inactive') && (
              <p className="mt-1 text-sm font-semibold text-red-500 dark:text-red-400">
                Suscripcion cancelada (acceso hasta fin de periodo)
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => window.open('/pro', '_blank')} className="border-blue-500/40 text-blue-600 dark:text-blue-300">
              Cambiar plan
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowCycleModal(true)}
              disabled={processing}
              className={isBusiness ? 'border-purple-500/40 text-purple-600 dark:text-purple-300' : 'border-yellow-500/40 text-amber-600 dark:text-yellow-300'}
            >
              Cambiar ciclo
            </Button>
            <Button onClick={openImpact} className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" /> Impacto
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="app-surface rounded-[28px] p-6">
          <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold app-text">
            <CreditCard className="h-5 w-5 text-blue-500" />
            Metodo de pago
          </h4>

          <div className="app-muted-panel mb-4 rounded-2xl p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="theme-surface flex h-6 w-10 items-center justify-center rounded border text-xs font-bold text-blue-600 dark:text-blue-300">
                  {membership?.paymentMethod?.brand || 'CARD'}
                </div>
                <div>
                  <p className="font-medium app-text">•••• {membership?.paymentMethod?.last4 || '****'}</p>
                  {membership?.paymentMethod?.expYear ? (
                    <p className="text-xs app-text-muted">Expira {membership.paymentMethod.expMonth}/{membership.paymentMethod.expYear}</p>
                  ) : (
                    <p className="text-xs app-text-muted">Metodo vinculado</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="app-chip rounded-full px-2 py-0.5 text-xs">
                  {(() => {
                    const brand = (membership?.paymentMethod?.brand || '').toUpperCase();
                    if (brand.includes('NEQUI')) return 'Nequi';
                    if (brand.includes('GOOGLE')) return 'Google Pay';
                    return 'Tarjeta';
                  })()}
                </span>
                <button
                  onClick={() => setShowMethodMenu((v) => !v)}
                  disabled={processing}
                  className="text-sm font-medium text-blue-600 transition hover:text-blue-500 disabled:opacity-50 dark:text-blue-300 dark:hover:text-blue-200"
                >
                  Cambiar metodo
                </button>
              </div>
            </div>

            {showMethodMenu && (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button onClick={handleUpdatePaymentMethod} disabled={processing} className="theme-button-secondary rounded-xl border px-3 py-1 text-sm text-blue-600 dark:text-blue-300">
                  Tarjeta
                </button>
                <button onClick={() => setShowNequiModal(true)} disabled={processing} className="theme-button-secondary rounded-xl border px-3 py-1 text-sm text-green-600 dark:text-green-300">
                  Nequi
                </button>
                <button onClick={handleGooglePayQuick} disabled={processing} className="theme-button-secondary rounded-xl border px-3 py-1 text-sm text-amber-600 dark:text-yellow-300">
                  Google Pay
                </button>
              </div>
            )}
          </div>

          <h4 className="mb-4 mt-8 flex items-center gap-2 text-lg font-semibold app-text">
            <Calendar className="h-5 w-5 text-emerald-500" />
            Historial de facturacion
          </h4>
          <div className="space-y-2 pr-2">
            {membership?.invoices?.map((inv) => (
              <div key={inv.id} className="app-soft-surface flex items-center justify-between rounded-2xl p-3 transition-colors">
                <div>
                  <p className="text-sm font-medium app-text">Factura #{inv.id}</p>
                  <p className="text-xs app-text-muted">{new Date(inv.date).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium app-text">${inv.amount.toLocaleString()}</span>
                  <button
                    onClick={() => handleDownloadInvoice(inv.id)}
                    className="app-icon-button rounded-xl p-2 transition-colors"
                    title="Descargar factura"
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {(!membership?.invoices || membership.invoices.length === 0) && (
              <div className="app-empty-state rounded-2xl px-4 py-6 text-center text-sm app-text-muted">
                No hay facturas disponibles.
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="app-surface rounded-[28px] p-6">
            <h4 className="mb-4 flex items-center gap-2 text-lg font-semibold app-text">
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
              Beneficios activos
            </h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-sm app-text-secondary">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                {isBasic ? 'Base simple para empezar y crecer luego' : 'Acceso a herramientas comerciales ampliadas'}
              </li>
              <li className="flex items-center gap-3 text-sm app-text-secondary">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                {isBasic ? 'Cambio posterior de plan y personalización' : 'Soporte prioritario por WhatsApp'}
              </li>
              <li className="flex items-center gap-3 text-sm app-text-secondary">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                {isBasic ? 'Flujo claro para una operación sencilla' : 'Multiples usuarios y roles'}
              </li>
              {isBusiness && (
                <li className="flex items-center gap-3 text-sm app-text-secondary">
                  <div className="h-2 w-2 rounded-full bg-purple-500" />
                  Funciones exclusivas Business
                </li>
              )}
            </ul>
          </div>

          <div className="app-banner-danger rounded-[28px] p-6">
            <h4 className="mb-2 text-lg font-semibold">Zona de peligro</h4>
            <p className="mb-4 text-sm">
              Si cancelas tu suscripcion, perderas el acceso a todas las funciones PRO al finalizar el periodo actual.
            </p>
            <Button variant="danger" onClick={() => setShowCancelModal(true)} className="w-full">
              Cancelar suscripcion
            </Button>
          </div>
        </div>
      </div>

      <Modal isOpen={showCycleModal} onClose={() => setShowCycleModal(false)} title="Cambiar ciclo de facturacion">
        <div className="space-y-4">
          <p className="text-sm app-text-secondary">Selecciona tu nuevo ciclo de facturacion para tu plan actual ({planName}).</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <button
              onClick={() => confirmChangeCycle('monthly')}
              disabled={processing}
              className={`rounded-2xl border p-4 text-center transition-all ${
                currentBillingCycle === 'monthly' ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-100' : 'theme-surface-muted hover:border-[color:var(--app-primary-soft-border)]'
              }`}
            >
              <p className="font-bold">Mensual</p>
              <p className="mt-1 text-sm app-text-muted">${currentPricing?.cycles?.monthly?.total_usd?.toLocaleString() || '...'} / mes</p>
            </button>

            <button
              onClick={() => confirmChangeCycle('quarterly')}
              disabled={processing}
              className={`rounded-2xl border p-4 text-center transition-all ${
                currentBillingCycle === 'quarterly' ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-100' : 'theme-surface-muted hover:border-[color:var(--app-primary-soft-border)]'
              }`}
            >
              <p className="font-bold">Trimestral</p>
              <p className="mt-1 text-sm app-text-muted">${currentPricing?.cycles?.quarterly?.total_usd?.toLocaleString() || '...'} / 3 meses</p>
              <span className="mt-1 block text-xs font-bold text-emerald-600 dark:text-emerald-300">
                {currentPricing?.cycles?.quarterly?.discount_label || 'Ahorra 10%'}
              </span>
            </button>

            <button
              onClick={() => confirmChangeCycle('yearly')}
              disabled={processing}
              className={`rounded-2xl border p-4 text-center transition-all ${
                currentBillingCycle === 'annual' ? 'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400/60 dark:bg-blue-500/10 dark:text-blue-100' : 'theme-surface-muted hover:border-[color:var(--app-primary-soft-border)]'
              }`}
            >
              <p className="font-bold">Anual</p>
              <p className="mt-1 text-sm app-text-muted">${currentPricing?.cycles?.annual?.total_usd?.toLocaleString() || '...'} / ano</p>
              <span className="mt-1 block text-xs font-bold text-emerald-600 dark:text-emerald-300">
                {currentPricing?.cycles?.annual?.discount_label || 'Ahorra 15%'}
              </span>
            </button>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCycleModal(false)} disabled={processing}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancelar suscripcion">
        <div className="space-y-4">
          <div className="app-banner-danger flex items-start gap-3 rounded-2xl p-4">
            <AlertTriangle className="h-6 w-6 flex-shrink-0 text-red-500 dark:text-red-400" />
            <p className="text-sm">
              Estas a punto de cancelar tu suscripcion {planName.toUpperCase()}. Perderas el acceso a reportes avanzados, metas y soporte prioritario al finalizar tu ciclo actual ({membership?.nextBillingDate ? new Date(membership.nextBillingDate).toLocaleDateString() : ''}).
            </p>
          </div>
          <p className="text-sm app-text-secondary">Por favor confirma que deseas proceder.</p>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowCancelModal(false)} disabled={processing}>
              Mantener mi plan
            </Button>
            <Button onClick={confirmCancel} variant="danger" disabled={processing}>
              {processing ? 'Cancelando...' : 'Confirmar cancelacion'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showImpactModal} onClose={() => setShowImpactModal(false)} title={`Plan ${planName} activo`}>
        <div className="space-y-6">
          <p className="text-sm app-text-muted">Mira lo que has logrado con {planName}</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="app-soft-surface rounded-2xl p-4">
              <div className="text-3xl font-bold app-text">{formatCOP(totalVentas)}</div>
              <div className="mt-1 text-sm app-text-muted">Ventas</div>
            </div>
            <div className="app-soft-surface rounded-2xl p-4">
              <div className="text-3xl font-bold app-text">{totalClientes}</div>
              <div className="mt-1 text-sm app-text-muted">Clientes</div>
            </div>
            <div className="app-soft-surface rounded-2xl p-4">
              <div className="text-3xl font-bold app-text">{totalCobros}</div>
              <div className="mt-1 text-sm app-text-muted">Cobros sugeridos</div>
            </div>
          </div>
          <div className="text-sm app-text-secondary">
            Has generado:
            <div className="mt-1">
              <span className="font-semibold app-text">{formatCOP(totalVentas)}</span> en ventas - <span className="font-semibold app-text">{totalClientes}</span> clientes registrados - <span className="font-semibold app-text">{totalCobros}</span> cobros sugeridos
            </div>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={() => setShowImpactModal(false)}>
              Cerrar
            </Button>
          </div>
        </div>
      </Modal>

      {showCardModal && <TokenizeCardModal onClose={() => setShowCardModal(false)} onSuccess={async () => { await loadData(); setShowCardModal(false); }} />}
      {showNequiModal && <LinkNequiModal onClose={() => setShowNequiModal(false)} onSuccess={async () => { await loadData(); setShowNequiModal(false); }} />}
    </div>
  );
};
