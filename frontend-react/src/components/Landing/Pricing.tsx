import React from 'react';
import { Check, X, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const PRICING = {
  monthly: { price: 5.99, label: 'Mensual', period: '/mes', save: '' },
  quarterly: { price: 16.17, label: 'Trimestral', period: '/trimestre', save: '10%' },
  annual: { price: 61.10, label: 'Anual', period: '/año', save: '15%' }
};

type BillingCycle = 'monthly' | 'quarterly' | 'annual';

export const Pricing = () => {
  const [billing, setBilling] = React.useState<BillingCycle>('monthly');

  const currentPlan = PRICING[billing];

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
            {(Object.keys(PRICING) as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                onClick={() => setBilling(cycle)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative z-10 ${
                  billing === cycle 
                    ? 'text-white shadow-sm' 
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {PRICING[cycle].label}
                {billing === cycle && (
                  <div className="absolute inset-0 bg-blue-600 rounded-lg -z-10 animate-fade-in" />
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <div className="bg-gray-800/30 border border-gray-700 rounded-2xl p-8 flex flex-col hover:border-gray-600 transition-colors">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white">Gratis</h3>
              <p className="text-gray-400 text-sm">Para emprendedores que inician</p>
            </div>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$0</span>
              <span className="text-gray-500">/siempre</span>
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span>1 Negocio</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span>Registro de Ventas y Gastos</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-green-500 shrink-0" />
                <span>Control de Clientes</span>
              </li>
              <li className="flex items-start gap-3 text-gray-500">
                <X className="w-5 h-5 shrink-0" />
                <span>Sin Analíticas Avanzadas</span>
              </li>
              <li className="flex items-start gap-3 text-gray-500">
                <X className="w-5 h-5 shrink-0" />
                <span>Sin Recordatorios</span>
              </li>
            </ul>

            <Link 
              to="/login"
              className="w-full py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-medium transition-colors text-center"
            >
              Seguir con Free
            </Link>
          </div>

          {/* Pro Plan */}
          <div className="bg-gray-800 border border-blue-500/30 rounded-2xl p-8 flex flex-col relative shadow-xl shadow-blue-500/10 transform hover:-translate-y-1 transition-transform duration-300">
            {billing !== 'monthly' && (
              <div className="absolute top-0 right-0 -mt-3 -mr-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                Ahorra {currentPlan.save}
              </div>
            )}
            
            <div className="mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                Pro
                <span className="px-2 py-0.5 rounded text-xs bg-blue-500/20 text-blue-400 border border-blue-500/20">Recomendado</span>
              </h3>
              <p className="text-gray-400 text-sm">Potencia total para tu negocio</p>
            </div>
            
            <div className="mb-6">
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold text-white">${currentPlan.price}</span>
                <span className="text-gray-500 mb-1">{currentPlan.period}</span>
              </div>
              {billing !== 'monthly' && (
                 <p className="text-xs text-blue-400 mt-1">
                   Equivalente a ${(currentPlan.price / (billing === 'quarterly' ? 3 : 12)).toFixed(2)} / mes
                 </p>
              )}
            </div>
            
            <ul className="space-y-4 mb-8 flex-1">
              <li className="flex items-start gap-3 text-white">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                <span className="font-medium">Todo lo de Free +</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                <span>Multi-negocio ilimitado</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                <span>Analíticas y Reportes avanzados</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                <span>Alertas de stock y deudas</span>
              </li>
              <li className="flex items-start gap-3 text-gray-300">
                <Check className="w-5 h-5 text-blue-500 shrink-0" />
                <span>Plantillas de WhatsApp</span>
              </li>
            </ul>

            <Link 
              to="/login?redirect=/pro"
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-medium transition-all shadow-lg shadow-blue-500/25 text-center"
            >
              Empezar con Pro
            </Link>
          </div>
        </div>

      </div>
    </section>
  );
};
