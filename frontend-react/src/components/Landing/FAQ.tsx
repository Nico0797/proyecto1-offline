import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

const FAQS = [
  {
    q: '¿Qué incluye la membresía Básica y Pro?',
    a: 'La membresía Básica es perfecta para empezar: registra ventas, gastos y clientes desde tu primer negocio. Pro desbloquea más capacidad operativa, analíticas avanzadas, reportes exportables, alertas de stock, recordatorios de cobro y plantillas de WhatsApp.'
  },
  {
    q: '¿Cómo funciona la opción multi-negocio?',
    a: 'Con los planes Pro y Business, puedes agregar múltiples negocios dentro de la misma cuenta. Cada negocio mantiene sus ventas, productos y clientes de forma independiente, pero tú gestionas todo con un solo login.'
  },
  {
    q: '¿Cómo se calculan los reportes?',
    a: 'EnCaja procesa tus ventas y gastos en tiempo real. Puedes ver reportes diarios, semanales o mensuales de ganancias, productos más vendidos y clientes frecuentes al instante, sin hacer cálculos manuales.'
  },
  {
    q: '¿Puedo exportar mis datos?',
    a: 'Sí, con los planes superiores puedes descargar tus reportes de ventas, inventario y clientes en formato Excel o PDF para compartirlos con tu contador o guardarlos como respaldo.'
  },
  {
    q: '¿Cómo funciona la integración con WhatsApp?',
    a: 'No es una integración directa (API), sino un sistema inteligente de plantillas. Al generar una venta o cobro, EnCaja crea un mensaje pre-llenado con el detalle y abre tu WhatsApp para que lo envíes al cliente en un clic.'
  },
  {
    q: '¿Mis datos están seguros?',
    a: 'Absolutamente. Utilizamos encriptación estándar de la industria y copias de seguridad automáticas en la nube para asegurar que tu información financiera esté protegida y disponible solo para ti.'
  }
];

export const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-24 bg-gray-900 border-t border-gray-800">
      <div className="container mx-auto px-4 max-w-3xl">
        <h2 className="text-3xl font-bold text-center text-white mb-12">Preguntas Frecuentes</h2>
        
        <div className="space-y-4">
          {FAQS.map((faq, idx) => (
            <div key={idx} className="bg-gray-800/30 rounded-xl overflow-hidden border border-gray-800 hover:border-gray-700 transition-all">
              <button
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
              >
                <span className="font-medium text-gray-200 pr-8">{faq.q}</span>
                {openIndex === idx ? (
                  <ChevronUp className="w-5 h-5 text-blue-500 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-500 flex-shrink-0" />
                )}
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                  openIndex === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className="p-6 pt-0 text-gray-400 border-t border-gray-800/50 leading-relaxed">
                  {faq.a}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
