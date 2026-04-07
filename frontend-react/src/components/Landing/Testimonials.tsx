import { Star } from 'lucide-react';

const TESTIMONIALS = [
  {
    name: 'Carlos Mendoza',
    role: 'Dueño de Minimarket',
    comment: 'Antes perdía mucho tiempo cuadrando caja. Con EnCaja ahora tengo el control total de mis ventas y ganancias en minutos.',
  },
  {
    name: 'Ana Torres',
    role: 'Vendedora de Ropa',
    comment: 'Me encanta poder ver qué productos se venden más y cuáles no. Las alertas de stock me han salvado varias veces.',
  },
  {
    name: 'Jorge Ruiz',
    role: 'Ferretería El Tornillo',
    comment: 'La mejor inversión para mi negocio. El plan Pro se paga solo con el tiempo que ahorro en reportes y cobros.',
  },
];

export const Testimonials = () => {
  return (
    <section className="py-24 bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-4 text-center max-w-4xl">
        <h2 className="text-3xl font-bold text-white mb-16">Lo que dicen nuestros usuarios</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {TESTIMONIALS.map((t, idx) => (
            <div key={idx} className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700/50 hover:border-blue-500/30 transition-all duration-300">
              <div className="flex justify-center mb-4">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} className="w-4 h-4 text-yellow-500 fill-current" />
                ))}
              </div>
              <p className="text-gray-300 mb-6 italic leading-relaxed">"{t.comment}"</p>
              <div className="border-t border-gray-700 pt-4">
                <h4 className="text-white font-bold">{t.name}</h4>
                <p className="text-sm text-gray-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
