import { 
  ShoppingCart, Users, Package, Wallet, Receipt, 
  BarChart2, FileText, Bell, Clock, MessageSquare, Briefcase 
} from 'lucide-react';

const FEATURES = [
  {
    category: 'Operación',
    items: [
      { name: 'Ventas', description: 'Registra ventas rápidas y eficientes.', icon: ShoppingCart },
      { name: 'Pedidos', description: 'Gestiona órdenes de compra.', icon: Briefcase, pro: true },
      { name: 'Clientes', description: 'Historial completo de tus clientes.', icon: Users },
      { name: 'Productos', description: 'Control total de inventario.', icon: Package },
    ]
  },
  {
    category: 'Finanzas',
    items: [
      { name: 'Pagos', description: 'Seguimiento de abonos y cuentas por cobrar.', icon: Wallet },
      { name: 'Gastos', description: 'Categoriza y controla tus egresos.', icon: Receipt },
      { name: 'Recurrentes', description: 'Automatiza pagos fijos.', icon: Clock, pro: true },
    ]
  },
  {
    category: 'Inteligencia',
    items: [
      { name: 'Analíticas', description: 'Métricas clave de crecimiento.', icon: BarChart2, pro: true },
      { name: 'Reportes', description: 'Exportables y detallados.', icon: FileText, pro: true },
      { name: 'Alertas', description: 'Notificaciones de stock bajo y deudas.', icon: Bell, pro: true },
    ]
  },
  {
    category: 'Comunicación',
    items: [
      { name: 'WhatsApp', description: 'Envía recibos y recordatorios.', icon: MessageSquare, pro: true },
    ]
  }
];

export const Features = () => {
  return (
    <section id="features" className="py-24 bg-gray-900 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Todo lo que necesitas para crecer</h2>
          <p className="text-gray-400">Desde la venta hasta el análisis financiero, EnCaja te da las herramientas para escalar tu negocio.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((category, idx) => (
            <div key={idx} className="space-y-6">
              <h3 className="text-xl font-semibold text-blue-400 border-b border-gray-800 pb-2 mb-4">{category.category}</h3>
              <div className="space-y-4">
                {category.items.map((feature, fIdx) => (
                  <div key={fIdx} className="group p-4 bg-gray-800/50 hover:bg-gray-800 rounded-xl border border-gray-700/50 transition-all hover:border-blue-500/30">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${feature.pro ? 'bg-indigo-500/10 text-indigo-400' : 'bg-blue-500/10 text-blue-400'}`}>
                        <feature.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-white">{feature.name}</h4>
                          {feature.pro && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gradient-to-r from-indigo-500 to-purple-500 text-white">PRO</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
