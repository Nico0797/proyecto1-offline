import { useEffect, useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import api from '../../services/api';
import { Pricing } from '../../services/membershipService';

export const AdminPrices = () => {
  const [pricing, setPricing] = useState<Pricing | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await api.get('/billing/pricing');
        setPricing(res.data);
      } catch (err) {
        console.error('Error fetching prices', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-white">
        <Loader2 className="w-6 h-6 animate-spin mr-3" />
        Cargando catálogo de membresías...
      </div>
    );
  }

  if (!pricing) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-200">
        No se pudo cargar el catálogo central de membresías.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Precios y Planes</h1>
          <p className="text-slate-400 text-sm">Vista de solo lectura del catálogo central administrado por backend.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          <Lock className="w-4 h-4" />
          Edición deshabilitada
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {pricing.plan_order.map((planKey) => {
          const plan = pricing.plans[planKey];

          return (
            <div key={plan.key} className="bg-slate-800 border border-white/10 rounded-xl p-6">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{plan.display_name}</h3>
                  <p className="text-sm text-slate-400 mt-1">{plan.tagline}</p>
                </div>
                {plan.badge && (
                  <span className="text-xs px-2 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20">
                    {plan.badge}
                  </span>
                )}
              </div>

              <div className="space-y-3 mb-6">
                {pricing.cycle_order.map((cycleKey) => {
                  const cycle = plan.cycles[cycleKey];

                  return (
                    <div key={cycleKey} className="rounded-lg bg-slate-900/70 border border-white/5 p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">{cycle.label}</span>
                        <span className="text-white font-mono">${cycle.total_usd.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
                        <span>Equivale a ${cycle.monthly_equivalent_usd.toFixed(2)}/mes</span>
                        <span>{cycle.discount_label || 'Sin descuento'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-3">Beneficios</h4>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={`${plan.key}-${index}`} className="text-sm text-slate-400">
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
