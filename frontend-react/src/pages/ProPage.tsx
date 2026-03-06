import React from 'react';
import { Check, Zap, BarChart, Bell, Calendar, Smartphone, Globe, MessageCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { useNavigate } from 'react-router-dom';
import { membershipService } from '../services/membershipService';

const ProPage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubscribe = async (planCode: 'pro_monthly'|'pro_quarterly'|'pro_annual') => {
    try {
      const url = await membershipService.createCheckout(planCode, 'card');
      window.open(url, '_blank');
    } catch (e: any) {
      alert(e?.message || 'No se pudo iniciar el pago');
    }
  };

  const features = [
    { icon: BarChart, text: 'Analíticas avanzadas y reportes detallados' },
    { icon: Calendar, text: 'Recordatorios automáticos de cobro' },
    { icon: Bell, text: 'Alertas de stock y vencimientos' },
    { icon: Zap, text: 'Gestión de gastos recurrentes' },
    { icon: Smartphone, text: 'Plantillas de WhatsApp personalizadas' },
    { icon: Globe, text: 'Múltiples negocios en una cuenta' },
  ];

  const plans = [
    {
      name: 'Gratis',
      price: 0,
      period: '/siempre',
      description: 'Ideal para probar la plataforma',
      savings: null,
      recommended: false,
      features: [
        '1 Negocio',
        'Hasta 10 Clientes',
        'Hasta 5 Productos',
        'Hasta 30 Ventas/mes',
        'Hasta 30 Gastos/mes',
        'Soporte Básico',
      ]
    },
    {
      name: 'Mensual',
      price: 5.99,
      period: '/mes',
      description: 'Facturado mensualmente',
      savings: null,
      recommended: false,
      features: [
        'Negocios Ilimitados',
        'Clientes Ilimitados',
        'Productos Ilimitados',
        'Ventas Ilimitadas',
        'Gastos Ilimitados',
        'Reportes Avanzados',
        'Alertas de Stock',
        'Gastos Recurrentes',
        'Plantillas WhatsApp',
        'Soporte Prioritario',
      ]
    },
    {
      name: 'Trimestral',
      price: 16.17, // 3 * 5.99 * 0.90
      period: '/trimestre',
      description: 'Facturado cada 3 meses',
      savings: '10% OFF',
      recommended: true,
      perMonth: '5.39',
      features: [
        'Todo lo del plan Mensual',
        'Ahorro del 10%',
      ]
    },
    {
      name: 'Anual',
      price: 61.10, // 12 * 5.99 * 0.85
      period: '/año',
      description: 'Facturado anualmente',
      savings: '15% OFF',
      recommended: false,
      perMonth: '5.09',
      features: [
        'Todo lo del plan Mensual',
        'Ahorro del 15%',
        'Mejor precio garantizado',
      ]
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 dark:text-white sm:text-5xl sm:tracking-tight lg:text-6xl">
            Potencia tu negocio con <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">Pro</span>
          </h1>
          <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500 dark:text-gray-400">
            Desbloquea todas las herramientas que necesitas para crecer, organizar y automatizar tu emprendimiento.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 mb-16">
          {features.map((feature, index) => (
            <div key={index} className="flex items-center space-x-4 bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white">
                  <feature.icon className="h-6 w-6" aria-hidden="true" />
                </div>
              </div>
              <div className="flex-1">
                <p className="text-lg font-medium text-gray-900 dark:text-white">{feature.text}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan) => (
            <div 
              key={plan.name} 
              className={`relative flex flex-col bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden border ${plan.recommended ? 'border-indigo-500 ring-2 ring-indigo-500 ring-opacity-50' : 'border-gray-200 dark:border-gray-700'}`}
            >
              {plan.recommended && (
                <div className="absolute top-0 right-0 bg-indigo-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                  RECOMENDADO
                </div>
              )}
              {plan.savings && (
                <div className="absolute top-0 left-0 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-br-lg">
                  AHORRA {plan.savings}
                </div>
              )}
              
              <div className="p-8 flex-1">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{plan.description}</p>
                
                <div className="flex items-baseline mb-2">
                  <span className="text-4xl font-extrabold text-gray-900 dark:text-white">
                      {plan.price === 0 ? 'Gratis' : `$${plan.price.toFixed(2)}`}
                  </span>
                  {plan.price > 0 && <span className="text-gray-500 dark:text-gray-400 ml-2">{plan.period}</span>}
                </div>
                {plan.perMonth && (
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-6">
                    Equivale a ${plan.perMonth}/mes
                  </p>
                )}
                {!plan.perMonth && <div className="mb-6 h-5"></div>}

                <ul className="space-y-4 mb-8">
                  {plan.features?.map((feature, idx) => (
                    <li key={idx} className="flex items-start">
                        <Check className="flex-shrink-0 h-5 w-5 text-green-500" />
                        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="p-8 bg-gray-50 dark:bg-gray-700/50">
                <Button 
                  onClick={
                    plan.price === 0 
                      ? () => navigate('/dashboard') 
                      : () => {
                          const code = plan.name === 'Mensual' ? 'pro_monthly' : plan.name === 'Trimestral' ? 'pro_quarterly' : 'pro_annual';
                          handleSubscribe(code as any);
                        }
                  }
                  className={`w-full py-3 text-lg font-semibold rounded-xl shadow-md transition-transform hover:scale-105 ${plan.recommended ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-none' : 'bg-white dark:bg-gray-800 text-indigo-600 border border-indigo-200 hover:bg-indigo-50 dark:hover:bg-gray-700'}`}
                >
                  {plan.price === 0 ? 'Plan Actual' : 'Actualizar ahora'}
                </Button>
              </div>
            </div>
          ))}
        </div>


        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-10">Preguntas Frecuentes</h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">¿Puedo cancelar en cualquier momento?</h3>
              <p className="text-gray-500 dark:text-gray-400">Sí, puedes cancelar tu suscripción en cualquier momento. Seguirás teniendo acceso a las funciones Pro hasta el final de tu periodo de facturación actual.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">¿Qué pasa con mis datos si vuelvo al plan Gratis?</h3>
              <p className="text-gray-500 dark:text-gray-400">Tus datos se mantendrán seguros, pero algunas funciones se bloquearán. Por ejemplo, no podrás ver reportes históricos más allá del límite gratuito o crear nuevos negocios adicionales.</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">¿Ofrecen reembolsos?</h3>
              <p className="text-gray-500 dark:text-gray-400">Ofrecemos una garantía de devolución de dinero de 7 días si no estás satisfecho con el servicio Pro.</p>
            </div>
          </div>
        </div>

        {/* Support CTA */}
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
