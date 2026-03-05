import React from 'react';
import { Check, X, Minus } from 'lucide-react';

const FEATURES = [
  { name: 'Negocios', free: '1', pro: 'Ilimitados' },
  { name: 'Ventas y Gastos', free: true, pro: true },
  { name: 'Clientes y Productos', free: true, pro: true },
  { name: 'Analíticas', free: false, pro: true },
  { name: 'Pedidos', free: false, pro: true },
  { name: 'Gastos Recurrentes', free: false, pro: true },
  { name: 'Reportes Avanzados', free: false, pro: true },
  { name: 'Alertas de Stock', free: false, pro: true },
  { name: 'Recordatorios de Deuda', free: false, pro: true },
  { name: 'Plantillas WhatsApp', free: false, pro: true },
];

export const ComparisonTable = () => {
  return (
    <section className="py-24 bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-4 max-w-4xl">
        <h2 className="text-3xl font-bold text-center text-white mb-12">Comparativa detallada</h2>
        
        <div className="overflow-x-auto rounded-2xl border border-gray-800">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-800/50">
                <th className="p-4 text-gray-400 font-medium w-1/2">Característica</th>
                <th className="p-4 text-white font-bold text-center w-1/4">Free</th>
                <th className="p-4 text-blue-400 font-bold text-center w-1/4">Pro</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature, idx) => (
                <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="p-4 text-gray-300">{feature.name}</td>
                  <td className="p-4 text-center">
                    {typeof feature.free === 'boolean' ? (
                      feature.free ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-white font-medium">{feature.free}</span>
                    )}
                  </td>
                  <td className="p-4 text-center">
                    {typeof feature.pro === 'boolean' ? (
                      feature.pro ? (
                        <Check className="w-5 h-5 text-blue-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-blue-400 font-bold">{feature.pro}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
