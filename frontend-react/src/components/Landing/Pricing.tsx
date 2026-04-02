import React, { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getCycleKey, membershipService, Pricing as PricingCatalog } from '../../services/membershipService';

type BillingCycle = 'monthly' | 'quarterly' | 'annual';

export const Pricing = () => {
  const [billing, setBilling] = React.useState<BillingCycle>('monthly');
  const [pricing, setPricing] = useState<PricingCatalog | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPricing = async () => {
      try {
        const data = await membershipService.getPricing();
        setPricing(data);
      } catch (error) {
        console.error('Error loading landing pricing', error);
      } finally {
        setLoading(false);
      }
    };

    loadPricing();
  }, []);

  if (loading) {
    return (
      <section id="pricing" className="py-24 bg-gray-900 relative">
        <div className="container mx-auto px-4 relative z-10 flex items-center justify-center text-white">
          <Loader2 className="w-6 h-6 animate-spin mr-3" />
          Cargando planes...
        </div>
      </section>
    );
  }

  if (!pricing) {
    return null;
  }

  const currentCycle = getCycleKey(billing);
  const plans = pricing.plan_order.map((planKey) => pricing.plans[planKey]);

  return (
    <section id="pricing" className="py-24 bg-gray-900 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-800/20 to-gray-900 pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Planes simples y transparentes</h2>
          <p className="text-gray-400">Elige el plan que mejor se adapte a tu etapa de crecimiento.</p>
        </div>

        {/* Billing Toggle */}
        <div className="flex justify-center mb-12">
          <div className="bg-gray-800 p-1 rounded-xl inline-flex relative">
            {pricing.cycle_order.map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBilling(cycle)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative z-10 ${
                  billing === cycle 
                    ? 'text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {pricing.plans.pro.cycles[cycle].label}
                {billing === cycle && (
                  <div className="absolute inset-0 bg-blue-600 rounded-lg -z-10 animate-fade-in" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => {
            const cycle = plan.cycles[currentCycle];
            const isPro = plan.key === 'pro';
            const isBusiness = plan.key === 'business';
            const accentClass = isBusiness
              ? 'border-purple-500/30 shadow-purple-500/10'
              : isPro
                ? 'border-blue-500/30 shadow-blue-500/10'
                : 'border-gray-700';
            const buttonClass = isBusiness
              ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-500 hover:to-fuchsia-500'
              : isPro
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500'
                : 'bg-gray-700 hover:bg-gray-600';

            return (
              <div key={plan.key} className={`bg-gray-800 border rounded-2xl p-8 flex flex-col relative shadow-xl transform hover:-translate-y-1 transition-transform duration-300 ${accentClass}`}>
                {plan.badge && (
                  <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                    {plan.badge}
                  </div>
                )}

                <div className="mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    {plan.display_name}
                    {isPro && (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/20">Recomendado</span>
                    )}
                  </h3>
                  <p className="text-gray-400 text-sm">{plan.tagline}</p>
                </div>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-white">${cycle.total_usd.toFixed(2)}</span>
                    <span className="text-gray-500 mb-1">/{currentCycle === 'monthly' ? 'mes' : currentCycle === 'quarterly' ? 'trimestre' : 'año'}</span>
                  </div>
                  <p className={`text-xs mt-1 ${isBusiness ? 'text-purple-400' : isPro ? 'text-blue-400' : 'text-gray-400'}`}>
                    Equivale a ${cycle.monthly_equivalent_usd.toFixed(2)} / mes
                  </p>
                </div>

                <ul className="space-y-4 mb-8 flex-1">
                  {plan.features.slice(0, 5).map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-gray-300">
                      <Check className={`w-5 h-5 shrink-0 ${isBusiness ? 'text-purple-500' : isPro ? 'text-blue-500' : 'text-green-500'}`} />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to={plan.key === 'basic' ? '/login' : '/login?redirect=/pro'}
                  className={`w-full py-3 px-4 text-white rounded-xl font-medium transition-all shadow-lg text-center ${buttonClass}`}
                >
                  {plan.cta_label}
                </Link>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
