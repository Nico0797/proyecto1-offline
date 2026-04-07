import React, { useEffect, useMemo, useState } from 'react';
import { Check, MessageCircle, Star, Briefcase, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { getCycleKey, membershipService, PlanCode, Pricing } from '../services/membershipService';
import { cn } from '../utils/cn';
import { useAuthStore } from '../store/authStore';

const ProPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>('quarterly');
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<PlanCode | null>(null);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await membershipService.getPricing();
        setPricing(data);
      } catch (e) {
        console.error('Error loading pricing', e);
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
  }, []);

  const cycleOptions = useMemo(() => {
    if (!pricing) return [];
    return pricing.cycle_order.map((cycle) => ({
      key: cycle,
      label: pricing.plans.pro.cycles[cycle].label,
      discountLabel: pricing.plans.pro.cycles[cycle].discount_label,
    }));
  }, [pricing]);

  if (user?.account_type === 'team_member') {
    return (
        <div className="app-canvas min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Acceso Restringido</h2>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Esta sección es exclusiva para la gestión de la cuenta principal.</p>
            <Button onClick={() => navigate('/dashboard')}>Volver al Dashboard</Button>
        </div>
    );
  }

  const handleSubscribe = async (planCode: PlanCode) => {
    try {
      setProcessingPlan(planCode);
      const url = await membershipService.createCheckout(planCode, 'card');
      if (url) {
        window.open(url, '_blank');
      } else {
        alert('Próximamente: Integración de pagos directa.');
      }
    } catch (e: any) {
      alert(e?.message || 'No se pudo iniciar el pago');
    } finally {
      setProcessingPlan(null);
    }
  };

  if (loading) {
    return (
      <div className="app-canvas min-h-screen flex items-center justify-center text-gray-900 dark:text-white">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        Cargando planes...
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="app-canvas min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No se pudieron cargar los planes</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Intenta nuevamente en unos segundos.</p>
        <Button onClick={() => window.location.reload()}>Reintentar</Button>
      </div>
    );
  }

  const selectedCycle = getCycleKey(billingCycle);
  const basicPlan = pricing.plans.basic;
  const paidPlans = [pricing.plans.pro, pricing.plans.business];

  return (
    <div className="app-canvas min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
            Elige el plan perfecto para tu negocio
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-xl text-gray-500 dark:text-gray-400">
            Pricing centralizado, ciclos claros y funciones alineadas con la operación real de tu negocio.
          </p>
        </div>

        <div className="flex justify-center mb-16">
          <div className="app-muted-panel p-1 rounded-xl flex flex-wrap justify-center gap-1">
            {cycleOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => setBillingCycle(option.key)}
                className={cn(
                  'px-6 py-2 rounded-lg text-sm font-medium transition-all relative',
                  billingCycle === option.key
                    ? 'app-surface shadow text-gray-900 dark:text-white'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                )}
              >
                {option.label}
                {option.discountLabel && (
                  <span className="absolute -top-3 -right-2 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                    {option.discountLabel}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto">
          <div className="app-surface relative flex flex-col rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 flex-1">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{basicPlan.display_name}</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{basicPlan.tagline}</p>
              <div className="flex items-baseline mb-2">
                <span className="text-4xl font-extrabold text-gray-900 dark:text-white">${basicPlan.cycles[selectedCycle].total_usd.toFixed(2)}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  /{selectedCycle === 'monthly' ? 'mes' : selectedCycle === 'quarterly' ? 'trimestre' : 'año'}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-6">{basicPlan.short_description}</p>

              <ul className="space-y-4 mb-8">
                {basicPlan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start">
                    <Check className="flex-shrink-0 h-5 w-5 text-gray-400" />
                    <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="app-soft-surface rounded-none border-x-0 border-b-0 p-8">
              <Button
                onClick={() => handleSubscribe(basicPlan.cycles[selectedCycle].checkout_plan_code)}
                variant="secondary"
                className="w-full"
                disabled={!!processingPlan}
              >
                {processingPlan === basicPlan.cycles[selectedCycle].checkout_plan_code ? 'Procesando...' : basicPlan.cta_label}
              </Button>
            </div>
          </div>

          {paidPlans.map((plan) => {
            const cycle = plan.cycles[selectedCycle];
            const isPro = plan.key === 'pro';
            const isProcessing = processingPlan === cycle.checkout_plan_code;
            const borderClass = isPro
              ? 'border-indigo-500 ring-4 ring-indigo-500/10'
              : 'border-purple-500/50';
            const accentText = isPro ? 'text-indigo-600 dark:text-indigo-400' : 'text-purple-600 dark:text-purple-400';
            const accentButton = isPro ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-purple-600 hover:bg-purple-700';
            const accentBg = isPro ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'bg-purple-50 dark:bg-purple-900/20';

            return (
              <div key={plan.key} className={cn('app-surface relative flex flex-col rounded-2xl shadow-xl overflow-hidden', borderClass, isPro && 'transform scale-105 z-10')}>
                {plan.badge && (
                  <div className={cn('absolute top-0 right-0 text-white text-xs font-bold px-3 py-1 rounded-bl-lg', isPro ? 'bg-indigo-500' : 'bg-purple-600')}>
                    {plan.badge}
                  </div>
                )}
                <div className="p-8 flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {isPro ? (
                      <Star className="w-5 h-5 text-indigo-500 fill-indigo-500" />
                    ) : (
                      <Briefcase className="w-5 h-5 text-purple-600" />
                    )}
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{plan.display_name}</h3>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{plan.tagline}</p>
                  <div className="flex items-baseline mb-2">
                    <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                      ${cycle.total_usd.toFixed(2)}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                      /{selectedCycle === 'monthly' ? 'mes' : selectedCycle === 'quarterly' ? 'trimestre' : 'año'}
                    </span>
                  </div>
                  <p className={cn('text-sm font-medium mb-6', accentText)}>
                    Equivale a ${cycle.monthly_equivalent_usd.toFixed(2)}/mes
                  </p>

                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <Check className={cn('flex-shrink-0 h-5 w-5', isPro ? 'text-indigo-500' : 'text-purple-600')} />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className={cn('p-8', accentBg)}>
                  <Button
                    onClick={() => handleSubscribe(cycle.checkout_plan_code)}
                    className={cn('w-full text-white', accentButton)}
                    disabled={!!processingPlan}
                  >
                    {isProcessing ? 'Procesando...' : plan.cta_label}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">Preguntas Frecuentes</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">¿Puedo cambiar de plan?</h3>
              <p className="text-gray-500 dark:text-gray-400">Sí. Puedes pasar de Básica a Pro o Business, y ajustar el ciclo de facturación según tu etapa.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">¿Cómo funcionan los descuentos?</h3>
              <p className="text-gray-500 dark:text-gray-400">Ahorras un 10% con pago trimestral y un 15% con pago anual, frente al precio mensual.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">¿Qué pasa con usuarios de planes legacy?</h3>
              <p className="text-gray-500 dark:text-gray-400">Se mantienen compatibles y se muestran como Básica, sin romper su acceso actual.</p>
            </div>
          </div>
        </div>

        <div className="mt-20 text-center flex flex-col items-center">
          <p className="text-gray-500 dark:text-gray-400 mb-4">
            ¿Tienes más preguntas?
          </p>
          <a 
            href="https://wa.me/5732192426874" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-full transition-colors shadow-lg shadow-green-600/20"
          >
            <MessageCircle className="w-5 h-5" />
            Contáctanos por WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
};

export default ProPage;
