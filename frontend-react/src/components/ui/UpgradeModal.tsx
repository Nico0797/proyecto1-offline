import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, Star } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { FEATURES, FeatureKey } from '../../auth/plan';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: FeatureKey;
}

const FEATURE_BENEFITS: Record<string, string[]> = {
  [FEATURES.MULTI_BUSINESS]: [
    'Gestiona múltiples negocios',
    'Separa inventarios y finanzas',
    'Reportes consolidados'
  ],
  [FEATURES.DASHBOARD_ANALYTICS]: [
    'Gráficos de ventas detallados',
    'Tendencias de crecimiento',
    'Análisis de rentabilidad'
  ],
  [FEATURES.DASHBOARD_REMINDERS]: [
    'Recordatorios automáticos',
    'Gestión de cobros pendientes',
    'Alertas de stock bajo'
  ],
  [FEATURES.ORDERS]: [
    'Gestión completa de pedidos',
    'Seguimiento de estados',
    'Historial de clientes'
  ],
  [FEATURES.RECURRING_EXPENSES]: [
    'Automatiza gastos fijos',
    'Previsión de flujo de caja',
    'Ahorra tiempo en registros'
  ],
  [FEATURES.REPORTS]: [
    'Reportes exportables (PDF/Excel)',
    'Análisis por cliente y producto',
    'Estados financieros'
  ],
  [FEATURES.ALERTS]: [
    'Alertas personalizables',
    'Notificaciones en tiempo real',
    'Control total de tu negocio'
  ],
  [FEATURES.WHATSAPP_TEMPLATES]: [
    'Plantillas de mensajes ilimitadas',
    'Personalización avanzada',
    'Envío rápido de comprobantes'
  ],
  [FEATURES.LIMIT_CUSTOMERS]: [
    'Clientes ilimitados',
    'Gestión detallada de perfiles',
    'Historial completo'
  ],
  [FEATURES.LIMIT_PRODUCTS]: [
    'Inventario ilimitado',
    'Catálogo completo',
    'Sin restricciones de productos'
  ],
  [FEATURES.LIMIT_SALES]: [
    'Ventas ilimitadas',
    'Historial histórico completo',
    'Sin tope mensual'
  ],
  [FEATURES.LIMIT_EXPENSES]: [
    'Registro de gastos ilimitado',
    'Control total de egresos',
    'Sin restricciones'
  ]
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  feature
}) => {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    onClose();
    navigate('/pro');
  };

  const benefits = feature ? FEATURE_BENEFITS[feature] : [
    'Acceso ilimitado a todas las funciones',
    'Soporte prioritario',
    'Múltiples negocios'
  ];

  const title = feature ? 'Desbloquea esta función' : 'Actualiza a Pro';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      className="max-w-md bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-gray-700"
    >
      <div className="flex flex-col items-center text-center -mt-6">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-indigo-500/30">
          <Lock className="w-8 h-8 text-white" />
        </div>

        <h3 className="text-2xl font-bold text-white mb-2">
          {title}
        </h3>
        
        <p className="text-gray-400 mb-8">
          Lleva tu negocio al siguiente nivel con las herramientas profesionales.
        </p>

        <div className="w-full bg-gray-800/50 rounded-xl p-6 border border-gray-700 mb-8">
          <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4 flex items-center justify-center gap-2">
            <Star className="w-4 h-4 text-yellow-500" />
            Beneficios Pro
          </h4>
          <ul className="space-y-3">
            {benefits?.map((benefit, index) => (
              <li key={index} className="flex items-start gap-3 text-left">
                <div className="mt-1 min-w-[20px]">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <span className="text-gray-300 text-sm">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col w-full gap-3">
          <Button
            onClick={handleUpgrade}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-500/25 border-none"
          >
            Ver planes y precios
          </Button>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 text-sm font-medium py-2 transition-colors"
          >
            Más tarde
          </button>
        </div>
      </div>
    </Modal>
  );
};
