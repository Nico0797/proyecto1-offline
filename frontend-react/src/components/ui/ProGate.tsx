import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { FeatureKey } from '../../auth/plan';
import { Button } from './Button';
import { UpgradeModal } from './UpgradeModal';
import { useAccess } from '../../hooks/useAccess';

interface ProGateProps {
  children: React.ReactNode;
  feature: FeatureKey;
  mode?: 'block' | 'redirect'; // block shows overlay, redirect moves to /pro
}

export const ProGate: React.FC<ProGateProps> = ({
  children,
  feature,
  mode = 'block',
}) => {
  const { canAccess, canUpgrade, isOwner } = useAccess();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const hasAccess = canAccess(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  // If user cannot upgrade (team_member), simply hide content or show generic message
  if (!canUpgrade) {
    if (mode === 'redirect') {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
            <Lock className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Acceso Restringido
          </h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-sm">
            Esta función no está disponible en el plan actual de este negocio.
          </p>
          <Button onClick={() => navigate('/')}>
            Volver al Inicio
          </Button>
        </div>
      );
    }
    // Block mode - Continue to render blocked UI instead of null
    // return null; 
  }

  if (mode === 'redirect') {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
          <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Acceso Restringido
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          {isOwner 
            ? "Esta función es exclusiva para planes superiores." 
            : "Esta función requiere que actualices tu cuenta personal."}
        </p>
        <Button onClick={() => navigate('/pro')}>
          {isOwner ? "Actualizar Plan" : "Ver Planes"}
        </Button>
      </div>
    );
  }

  // mode === 'block'
  // Show upgrade option even for non-owners (they upgrade their own account)
  // UPDATED: Team members also see the blocked content to maintain visual consistency
  return (
    <div className="relative group w-full h-full min-h-[100px]">
      {/* Content blocked (blurred or opacity reduced) */}
      <div className="opacity-40 pointer-events-none filter blur-[2px] select-none h-full w-full" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/5 dark:bg-black/20 backdrop-blur-[1px] rounded-lg transition-all duration-300">
        <div className="app-surface mx-4 flex max-w-xs transform flex-col items-center rounded-xl p-6 text-center shadow-xl transition-transform hover:scale-105">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg ring-4 ring-indigo-50 dark:ring-indigo-900/20">
            <Lock className="w-6 h-6 text-white" />
          </div>
          
          <h4 className="font-bold text-gray-900 dark:text-white mb-2 text-lg">
            Función Pro
          </h4>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
            {canUpgrade 
              ? "Actualiza tu plan para desbloquear esta funcionalidad y potenciar tu negocio."
              : "Esta función no está disponible en el plan actual del negocio. Contacta al administrador."}
          </p>
          
          {canUpgrade ? (
            <Button 
              size="sm" 
              onClick={() => setShowModal(true)}
              className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-none shadow-md font-medium py-2.5"
            >
              Ver planes
            </Button>
          ) : (
            <div className="app-chip rounded-lg px-3 py-2 text-xs font-medium text-gray-400">
              Requiere Plan Superior
            </div>
          )}
        </div>
      </div>

      <UpgradeModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
        feature={feature}
      />
    </div>
  );
};
