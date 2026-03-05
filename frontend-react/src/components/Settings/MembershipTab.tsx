import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Star, ShieldCheck, CreditCard, Calendar, Download, AlertTriangle, Loader2, ExternalLink } from 'lucide-react';
import { membershipService, MembershipInfo, Pricing } from '../../services/membershipService';
import { Modal } from '../ui/Modal';

const ALLOWED_HOSTS = ['checkout.wompi.co', 'billing.wompi.co', 'production.wompi.co', 'sandbox.wompi.co', window.location.hostname];

const isValidUrl = (url: string) => {
    if (url.startsWith('/')) return true; // Relative URLs are safe
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && ALLOWED_HOSTS.some(h => parsed.hostname.endsWith(h) || parsed.hostname === h);
    } catch {
        return false;
    }
};

export const MembershipTab = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);

  useEffect(() => {
    if (user?.plan === 'pro') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membData, priceData] = await Promise.all([
          membershipService.getMembership(),
          membershipService.getPricing()
      ]);
      setMembership(membData);
      setPricing(priceData);
    } catch (error) {
      console.error('Error loading membership data:', error);
      // Fallback only if absolutely necessary, but preferably show error state
    } finally {
      setLoading(false);
    }
  };

  const handleRedirect = (url: string) => {
      if (isValidUrl(url)) {
          if (url.startsWith('/')) {
              window.location.href = url;
          } else {
              window.location.href = url; // Redirect in same tab usually better for payment flows, or use _blank if portal
          }
      } else {
          console.error('Blocked invalid redirect:', url);
          alert('Error de seguridad: URL de redirección no permitida.');
      }
  };

  const handleManageSubscription = async () => {
      setProcessing(true);
      try {
          const url = await membershipService.getPortalUrl();
          handleRedirect(url);
      } catch (error) {
          alert('No se pudo acceder al portal de suscripción.');
      } finally {
          setProcessing(false);
      }
  };

  const handleUpdatePaymentMethod = async () => {
    setProcessing(true);
    try {
        const url = await membershipService.getUpdatePaymentUrl();
        handleRedirect(url);
    } catch (error) {
        alert('Error al generar enlace de actualización.');
    } finally {
        setProcessing(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
      try {
          const url = await membershipService.getInvoicePdf(invoiceId);
          window.open(url, '_blank');
      } catch (error) {
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
              // If backend handled it without redirect (e.g. immediate switch if credit available)
              await loadData();
              alert('Ciclo de facturación actualizado correctamente.');
              setShowCycleModal(false);
          }
      } catch (error) {
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
          alert('Tu suscripción ha sido cancelada. Tendrás acceso hasta el final del periodo.');
      } catch (error) {
          alert('Error al cancelar la suscripción.');
      } finally {
          setProcessing(false);
          setShowCancelModal(false);
      }
  };

  if (user?.plan !== 'pro') {
      return (
          <div className="flex flex-col items-center justify-center p-12 text-center">
              <Star className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">Acceso Restringido</h3>
              <p className="text-gray-400 mb-6">Esta sección es exclusiva para miembros PRO.</p>
              <Button className="bg-yellow-500 text-black hover:bg-yellow-600">Ver Planes</Button>
          </div>
      );
  }

  if (loading) {
      return <div className="flex justify-center p-12 text-white"><Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-2" /> Cargando información...</div>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Current Plan Card */}
      <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Star className="w-32 h-32 text-yellow-500 transform rotate-12" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-white">Plan PRO Activo</h3>
                    <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">Premium</span>
                </div>
                <p className="text-gray-400">
                    Tu próximo cobro será el <span className="text-white font-medium">{membership?.nextBillingDate ? new Date(membership.nextBillingDate).toLocaleDateString() : 'N/A'}</span>
                    <span className="ml-2 text-sm opacity-70">({membership?.billingCycle === 'monthly' ? 'Mensual' : membership?.billingCycle === 'quarterly' ? 'Trimestral' : 'Anual'})</span>
                </p>
                {!membership?.status || membership.status === 'inactive' && (
                     <p className="text-red-400 text-sm mt-1 font-semibold">Suscripción cancelada (acceso hasta fin de periodo)</p>
                )}
            </div>
            <div className="flex gap-3">
                <Button 
                    variant="secondary" 
                    onClick={() => setShowCycleModal(true)} 
                    disabled={processing}
                    className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
                >
                    Cambiar Ciclo
                </Button>
                <Button 
                    onClick={handleManageSubscription}
                    disabled={processing}
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold border-none flex items-center gap-2"
                >
                    {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
                    Gestionar Suscripción
                </Button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Billing Info */}
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                Método de Pago
            </h4>
            <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700 mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-6 bg-white rounded flex items-center justify-center">
                        <span className="text-blue-600 font-bold text-xs">{membership?.paymentMethod?.brand || 'CARD'}</span>
                    </div>
                    <div>
                        <p className="text-white font-medium">•••• {membership?.paymentMethod?.last4 || '****'}</p>
                        {/* Wompi doesn't always return exp date on tokenization without full query, so conditional render */}
                        {membership?.paymentMethod?.expYear ? (
                             <p className="text-xs text-gray-500">Expira {membership.paymentMethod.expMonth}/{membership.paymentMethod.expYear}</p>
                        ) : (
                             <p className="text-xs text-gray-500">Tarjeta vinculada</p>
                        )}
                    </div>
                </div>
                <button onClick={handleUpdatePaymentMethod} disabled={processing} className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50">
                    {processing ? '...' : 'Actualizar'}
                </button>
            </div>
            
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 mt-8">
                <Calendar className="w-5 h-5 text-green-400" />
                Historial de Facturación
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {membership?.invoices?.map((inv) => (
                    <div key={inv.id} className="flex justify-between items-center p-3 hover:bg-gray-700/30 rounded-lg transition-colors">
                        <div>
                            <p className="text-sm text-white">Factura #{inv.id}</p>
                            <p className="text-xs text-gray-500">{new Date(inv.date).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-white font-medium">${inv.amount.toLocaleString()}</span>
                            <button 
                                onClick={() => handleDownloadInvoice(inv.id)}
                                className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white transition-colors"
                                title="Descargar Factura"
                            >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {(!membership?.invoices || membership.invoices.length === 0) && (
                    <p className="text-center text-gray-500 text-sm py-4">No hay facturas disponibles.</p>
                )}
            </div>
        </div>

        {/* Benefits & Support */}
        <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-500" />
                    Beneficios Activos
                </h4>
                <ul className="space-y-3">
                    <li className="flex items-center gap-3 text-gray-300 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Acceso ilimitado a reportes avanzados
                    </li>
                    <li className="flex items-center gap-3 text-gray-300 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Soporte prioritario por WhatsApp
                    </li>
                    <li className="flex items-center gap-3 text-gray-300 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Múltiples usuarios y roles
                    </li>
                </ul>
            </div>

            <div className="bg-red-900/10 border border-red-500/20 rounded-xl p-6">
                <h4 className="text-lg font-semibold text-red-400 mb-2">Zona de Peligro</h4>
                <p className="text-sm text-gray-400 mb-4">
                    Si cancelas tu suscripción, perderás el acceso a todas las funciones PRO al finalizar el periodo actual.
                </p>
                <Button 
                    variant="secondary" 
                    onClick={() => setShowCancelModal(true)} 
                    className="w-full border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                    Cancelar Suscripción
                </Button>
            </div>
        </div>
      </div>

      {/* Modals */}
      <Modal isOpen={showCycleModal} onClose={() => setShowCycleModal(false)} title="Cambiar Ciclo de Facturación">
          <div className="space-y-4">
              <p className="text-gray-300">Selecciona tu nuevo ciclo de facturación:</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Monthly */}
                  <button 
                    onClick={() => confirmChangeCycle('monthly')}
                    disabled={processing}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${membership?.billingCycle === 'monthly' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}
                  >
                      <p className="font-bold text-white">Mensual</p>
                      <p className="text-sm text-gray-400">${pricing?.monthly?.toLocaleString() || '...'} / mes</p>
                  </button>
                  
                  {/* Quarterly */}
                  <button 
                    onClick={() => confirmChangeCycle('quarterly')}
                    disabled={processing}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${membership?.billingCycle === 'quarterly' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}
                  >
                      <p className="font-bold text-white">Trimestral</p>
                      <p className="text-sm text-gray-400">${pricing?.quarterly?.toLocaleString() || '...'} / 3 meses</p>
                      <span className="text-xs text-green-400 font-bold block mt-1">Ahorra 10%</span>
                  </button>

                  {/* Annual */}
                  <button 
                    onClick={() => confirmChangeCycle('yearly')}
                    disabled={processing}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${membership?.billingCycle === 'yearly' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}
                  >
                      <p className="font-bold text-white">Anual</p>
                      <p className="text-sm text-gray-400">${pricing?.annual?.toLocaleString() || '...'} / año</p>
                      <span className="text-xs text-green-400 font-bold block mt-1">Ahorra 15%</span>
                  </button>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                  <Button variant="secondary" onClick={() => setShowCycleModal(false)} disabled={processing}>Cancelar</Button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancelar Suscripción">
          <div className="space-y-4">
              <div className="flex items-start gap-3 bg-red-500/10 p-4 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-200">
                      Estás a punto de cancelar tu suscripción PRO. Perderás el acceso a reportes avanzados, metas y soporte prioritario al finalizar tu ciclo actual ({membership?.nextBillingDate ? new Date(membership.nextBillingDate).toLocaleDateString() : ''}).
                  </p>
              </div>
              <p className="text-gray-300 text-sm">Por favor confirma que deseas proceder.</p>
              
              <div className="flex justify-end gap-3 pt-4">
                  <Button variant="secondary" onClick={() => setShowCancelModal(false)} disabled={processing}>Mantener mi Plan</Button>
                  <Button onClick={confirmCancel} className="bg-red-600 hover:bg-red-700 text-white border-none" disabled={processing}>
                      {processing ? 'Cancelando...' : 'Confirmar Cancelación'}
                  </Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
