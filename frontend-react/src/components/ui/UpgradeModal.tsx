import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Lock, Star } from 'lucide-react';
import { Button } from './Button';
import { FEATURES, FeatureKey, BUSINESS_ONLY_FEATURES } from '../../auth/plan';
import { useAuthStore } from '../../store/authStore';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: FeatureKey;
}

const FEATURE_BENEFITS: Record<string, string[]> = {
  [FEATURES.MULTI_BUSINESS]: [
    'Gestiona multiples negocios',
    'Separa inventarios y finanzas',
    'Reportes consolidados'
  ],
  [FEATURES.DASHBOARD_ANALYTICS]: [
    'Graficos de ventas detallados',
    'Tendencias de crecimiento',
    'Analisis de rentabilidad'
  ],
  [FEATURES.DASHBOARD_REMINDERS]: [
    'Recordatorios automaticos',
    'Gestion de cobros pendientes',
    'Alertas de stock bajo'
  ],
  [FEATURES.ORDERS]: [
    'Gestion completa de pedidos',
    'Seguimiento de estados',
    'Historial de clientes'
  ],
  [FEATURES.RECURRING_EXPENSES]: [
    'Automatiza gastos fijos',
    'Prevision de flujo de caja',
    'Ahorra tiempo en registros'
  ],
  [FEATURES.REPORTS]: [
    'Reportes exportables (PDF/Excel)',
    'Analisis por cliente y producto',
    'Estados financieros'
  ],
  [FEATURES.ALERTS]: [
    'Alertas personalizables',
    'Notificaciones en tiempo real',
    'Control total de tu negocio'
  ],
  [FEATURES.WHATSAPP_TEMPLATES]: [
    'Plantillas de mensajes ilimitadas',
    'Personalizacion avanzada',
    'Envio rapido de comprobantes'
  ],
  [FEATURES.LIMIT_CUSTOMERS]: [
    'Clientes ilimitados',
    'Gestion detallada de perfiles',
    'Historial completo'
  ],
  [FEATURES.LIMIT_PRODUCTS]: [
    'Inventario ilimitado',
    'Catalogo completo',
    'Sin restricciones de productos'
  ],
  [FEATURES.LIMIT_SALES]: [
    'Ventas ilimitadas',
    'Historial historico completo',
    'Sin tope mensual'
  ],
  [FEATURES.LIMIT_EXPENSES]: [
    'Registro de gastos ilimitado',
    'Control total de egresos',
    'Sin restricciones'
  ],
  [FEATURES.ADVANCED_INVENTORY]: [
    'Historial de movimientos detallado',
    'Ajustes de inventario con motivo',
    'Auditoria completa de cambios'
  ],
  [FEATURES.MULTI_BARCODE]: [
    'Multiples codigos por producto',
    'Escaneo avanzado',
    'Gestion de referencias cruzadas'
  ],
  [FEATURES.INVENTORY_HISTORY]: [
    'Rastrea cada entrada y salida',
    'Identifica perdidas o robos',
    'Control total del flujo'
  ],
  [FEATURES.STOCK_ALERTS]: [
    'Alertas inteligentes de stock bajo',
    'Notificaciones preventivas',
    'Evita quedarte sin mercancia'
  ],
  [FEATURES.BULK_IMPORT]: [
    'Carga masiva desde Excel',
    'Actualizacion rapida de precios',
    'Gestion eficiente de catalogos grandes'
  ]
};

export const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  feature
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  if (!isOpen) return null;
  if (user?.account_type === 'team_member') return null;

  const handleUpgrade = () => {
    onClose();
    navigate('/pro');
  };

  const benefits = feature ? (FEATURE_BENEFITS[feature] || [
    'Acceso ilimitado a todas las funciones',
    'Soporte prioritario',
    'Multiples negocios'
  ]) : [
    'Acceso ilimitado a todas las funciones',
    'Soporte prioritario',
    'Multiples negocios'
  ];

  const isBusiness = feature && BUSINESS_ONLY_FEATURES.includes(feature);
  const title = feature ? 'Desbloquea esta funcion' : 'Actualiza a Pro';
  const benefitTitle = isBusiness ? 'Beneficios Business' : 'Beneficios Pro';
  const upgradeText = 'Ver planes y precios';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="app-surface relative w-full max-w-md overflow-hidden rounded-[28px] p-0 shadow-2xl transform transition-all animate-in fade-in zoom-in-95 duration-200">
        <div className="absolute top-4 right-4 z-10">
          <button
            onClick={onClose}
            className="app-icon-button inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors"
            aria-label="Cerrar modal de actualizacion"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="flex flex-col items-center p-8 text-center">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 shadow-lg shadow-indigo-500/25 ring-4 ring-indigo-500/10">
            <Lock className="h-8 w-8 text-white" />
          </div>

          <h3 className="mb-2 text-2xl font-bold text-gray-900 dark:text-white">
            {title}
          </h3>

          <p className="mx-auto mb-8 max-w-xs text-sm leading-6 text-gray-600 dark:text-gray-300">
            Lleva tu negocio al siguiente nivel con herramientas profesionales mas potentes y mejor control operativo.
          </p>

          <div className="app-muted-panel mb-8 w-full rounded-2xl p-6">
            <h4 className="mb-4 flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-[0.24em] text-gray-500 dark:text-gray-400">
              <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              {benefitTitle}
            </h4>
            <ul className="space-y-3 text-left">
              {benefits.map((benefit, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="mt-0.5 flex min-w-[20px] flex-shrink-0 items-center justify-center">
                    <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm leading-tight text-gray-700 dark:text-gray-200">{benefit}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex w-full flex-col gap-3">
            <Button
              onClick={handleUpgrade}
              className="w-full border-none bg-gradient-to-r from-indigo-600 to-blue-600 py-3.5 font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:scale-[1.01] hover:from-indigo-500 hover:to-blue-500 active:scale-[0.99]"
            >
              {upgradeText}
            </Button>
            <button
              onClick={onClose}
              className="py-2 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Mas tarde
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
