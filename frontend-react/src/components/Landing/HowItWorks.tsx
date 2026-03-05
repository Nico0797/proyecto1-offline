import React from 'react';
import { Settings, PlusCircle, TrendingUp } from 'lucide-react';

const STEPS = [
  {
    title: '1. Configura tu negocio',
    description: 'Personaliza tu perfil, productos y clientes en minutos.',
    icon: Settings,
    color: 'blue'
  },
  {
    title: '2. Registra movimientos',
    description: 'Anota ventas, gastos y abonos rápidamente desde cualquier dispositivo.',
    icon: PlusCircle,
    color: 'indigo'
  },
  {
    title: '3. Controla y Crece',
    description: 'Visualiza reportes, recibe alertas y toma mejores decisiones.',
    icon: TrendingUp,
    color: 'purple'
  }
];

export const HowItWorks = () => {
  return (
    <section className="py-24 bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">¿Cómo funciona?</h2>
          <p className="text-gray-400">Empieza a organizar tu negocio en tres simples pasos.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {/* Connecting Line (Desktop) */}
          <div className="hidden md:block absolute top-12 left-0 w-full h-0.5 bg-gradient-to-r from-blue-500/20 via-indigo-500/20 to-purple-500/20 -z-10" />

          {STEPS.map((step, idx) => (
            <div key={idx} className="relative flex flex-col items-center text-center group">
              <div className={`w-24 h-24 rounded-2xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-6 shadow-lg shadow-${step.color}-500/10 group-hover:scale-110 transition-transform duration-300`}>
                <step.icon className={`w-10 h-10 text-${step.color}-400`} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
              <p className="text-gray-400 max-w-xs">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
