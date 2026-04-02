import { Check, X } from 'lucide-react';

const FEATURES = [
  { name: 'Ventas, clientes y productos', basic: true, pro: true, business: true },
  { name: 'Reportes y alertas esenciales', basic: true, pro: true, business: true },
  { name: 'Cotizaciones', basic: false, pro: true, business: true },
  { name: 'Cuentas por cobrar', basic: false, pro: true, business: true },
  { name: 'Bodega / materias primas', basic: false, pro: true, business: true },
  { name: 'Rentabilidad y reportes avanzados', basic: false, pro: true, business: true },
  { name: 'Equipo, roles y permisos', basic: false, pro: false, business: true },
  { name: 'Auditoría y trazabilidad', basic: false, pro: false, business: true },
  { name: 'Múltiples códigos de barras', basic: false, pro: false, business: true },
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
                <th className="p-4 text-white font-bold text-center w-1/4">Básica</th>
                <th className="p-4 text-blue-400 font-bold text-center w-1/4">Pro</th>
                <th className="p-4 text-purple-400 font-bold text-center w-1/4">Business</th>
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature, idx) => (
                <tr key={idx} className="border-b border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <td className="p-4 text-gray-300">{feature.name}</td>
                  <td className="p-4 text-center">
                    {typeof feature.basic === 'boolean' ? (
                      feature.basic ? (
                        <Check className="w-5 h-5 text-green-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-white font-medium">{feature.basic}</span>
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
                  <td className="p-4 text-center">
                    {typeof feature.business === 'boolean' ? (
                      feature.business ? (
                        <Check className="w-5 h-5 text-purple-500 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-gray-600 mx-auto" />
                      )
                    ) : (
                      <span className="text-purple-400 font-bold">{feature.business}</span>
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
