import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../ui/Button';
import { Star, ShieldCheck, CreditCard, Calendar, Download, AlertTriangle, Loader2 } from 'lucide-react';
import { wompiService } from '../../services/wompiService';
import { membershipService, MembershipInfo } from '../../services/membershipService';
import { Modal } from '../ui/Modal';

export const MembershipTab = () => {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [membership, setMembership] = useState<MembershipInfo | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Modals
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCycleModal, setShowCycleModal] = useState(false);

  useEffect(() => {
    if (user?.plan === 'pro') {
      loadMembership();
    }
  }, [user]);

  const loadMembership = async () => {
    setLoading(true);
    try {
      const data = await membershipService.getMembership();
      setMembership(data);
    } catch (error) {
      console.error('Error loading membership:', error);
      // Fallback data for testing/error recovery
      setMembership({
          plan: 'pro',
          status: 'active',
          nextBillingDate: new Date().toISOString(),
          billingCycle: 'monthly',
          invoices: []
      });
    } finally {
      setLoading(false);
    }
  };

  if (user?.plan !== 'pro') {
      // Redirect or show lock
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

  // Action Handlers
  const handleUpdatePaymentMethod = () => {
    setProcessing(true);
    // Open Wompi Widget for card update (tokenization)
    wompiService.openCheckout({
        currency: 'COP',
        amountInCents: 100000, // Small auth amount or validation
        reference: `UPDATE_CARD_${user.id}_${Date.now()}`,
        redirectUrl: window.location.href, 
        customerData: {
            email: user.email || 'usuario@ejemplo.com',
            fullName: user.name || 'Usuario',
            phoneNumber: '3000000000', 
            phoneNumberPrefix: '+57',
            legalId: '123456789', 
            legalIdType: 'CC'
        }
    });
    setProcessing(false);
  };

  const handleDownloadInvoice = async (invoiceId: string) => {
      // Logic to download invoice
      try {
          const url = await membershipService.getInvoicePdf(invoiceId);
          window.open(url, '_blank');
      } catch (error) {
          alert('Error al descargar la factura');
      }
  };

  const confirmChangeCycle = async (cycle: 'monthly' | 'yearly') => {
      setProcessing(true);
      try {
          // If changing to annual, might need immediate payment via Wompi
          if (cycle === 'yearly') {
               wompiService.openCheckout({
                currency: 'COP',
                amountInCents: 29000000, // $290.000 COP
                reference: `CHANGE_CYCLE_${user.id}_${Date.now()}`,
                redirectUrl: window.location.href,
                customerData: {
                    email: user.email || 'usuario@ejemplo.com',
                    fullName: user.name || 'Usuario',
                    phoneNumber: '3000000000',
                    phoneNumberPrefix: '+57',
                    legalId: '123456789',
                    legalIdType: 'CC'
                }
            });
          } else {
              await membershipService.changeCycle(cycle);
              await loadMembership();
              alert('Ciclo de facturación actualizado correctamente.');
          }
      } catch (error) {
          alert('Error al cambiar el ciclo.');
      } finally {
          setProcessing(false);
          setShowCycleModal(false);
      }
  };

  const confirmCancel = async () => {
      setProcessing(true);
      try {
          await membershipService.cancelSubscription('User requested');
          await loadMembership();
          alert('Tu suscripción ha sido cancelada. Tendrás acceso hasta el final del periodo.');
      } catch (error) {
          alert('Error al cancelar la suscripción.');
      } finally {
          setProcessing(false);
          setShowCancelModal(false);
      }
  };

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
                    Tu próximo cobro será el <span className="text-white font-medium">{new Date(membership?.nextBillingDate || '').toLocaleDateString()}</span>
                    <span className="ml-2 text-sm opacity-70">({membership?.billingCycle === 'monthly' ? 'Mensual' : 'Anual'})</span>
                </p>
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
                    onClick={() => window.open('https://billing.wompi.co/portal', '_blank')} 
                    className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold border-none"
                >
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
                        <p className="text-white font-medium">•••• {membership?.paymentMethod?.last4 || '0000'}</p>
                        <p className="text-xs text-gray-500">Expira {membership?.paymentMethod?.expMonth}/{membership?.paymentMethod?.expYear}</p>
                    </div>
                </div>
                <button onClick={handleUpdatePaymentMethod} className="text-sm text-blue-400 hover:text-blue-300">Actualizar</button>
            </div>
            
            <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2 mt-8">
                <Calendar className="w-5 h-5 text-green-400" />
                Historial de Facturación
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {membership?.invoices.map((inv) => (
                    <div key={inv.id} className="flex justify-between items-center p-3 hover:bg-gray-700/30 rounded-lg transition-colors">
                        <div>
                            <p className="text-sm text-white">Pago {membership.billingCycle === 'monthly' ? 'Mensual' : 'Anual'} PRO</p>
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
                    <li className="flex items-center gap-3 text-gray-300 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Sin publicidad
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
              <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => confirmChangeCycle('monthly')}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${membership?.billingCycle === 'monthly' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}
                  >
                      <p className="font-bold text-white">Mensual</p>
                      <p className="text-sm text-gray-400">$29.000 / mes</p>
                  </button>
                  <button 
                    onClick={() => confirmChangeCycle('yearly')}
                    className={`p-4 rounded-xl border-2 text-center transition-all ${membership?.billingCycle === 'yearly' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}
                  >
                      <p className="font-bold text-white">Anual</p>
                      <p className="text-sm text-gray-400">$290.000 / año</p>
                      <span className="text-xs text-green-400 font-bold">Ahorras 2 meses</span>
                  </button>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                  <Button variant="secondary" onClick={() => setShowCycleModal(false)}>Cancelar</Button>
              </div>
          </div>
      </Modal>

      <Modal isOpen={showCancelModal} onClose={() => setShowCancelModal(false)} title="Cancelar Suscripción">
          <div className="space-y-4">
              <div className="flex items-start gap-3 bg-red-500/10 p-4 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-200">
                      Estás a punto de cancelar tu suscripción PRO. Perderás el acceso a reportes avanzados, metas y soporte prioritario al finalizar tu ciclo actual.
                  </p>
              </div>
              <p className="text-gray-300 text-sm">Por favor confirma que deseas proceder.</p>
              
              <div className="flex justify-end gap-3 pt-4">
                  <Button variant="secondary" onClick={() => setShowCancelModal(false)}>Mantener mi Plan</Button>
                  <Button onClick={confirmCancel} className="bg-red-600 hover:bg-red-700 text-white border-none">
                      {processing ? 'Cancelando...' : 'Confirmar Cancelación'}
                  </Button>
              </div>
          </div>
      </Modal>
    </div>
  );
};
