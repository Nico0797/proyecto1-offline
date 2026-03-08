import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { canAccess, FeatureKey } from '../../auth/plan';
import { Button } from './Button';
import { UpgradeModal } from './UpgradeModal';

interface ProGateProps {
  children: React.ReactNode;
  feature: FeatureKey;
  mode?: 'block' | 'redirect'; // block shows overlay, redirect moves to /pro
  fallback?: React.ReactNode;
}

export const ProGate: React.FC<ProGateProps> = ({
  children,
  feature,
  mode = 'block',
}) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const hasAccess = canAccess(feature, user);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (mode === 'redirect') {
    // If we're rendering this, it means we're already on the page/component
    // We should probably redirect immediately or show a "Redirecting..." message
    // However, it's safer to just render the fallback or a redirect message button
    // The actual redirection logic often happens in useEffect, but for a component gate:
    
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
          <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          Acceso Restringido
        </h3>
        <p className="text-gray-500 dark:text-gray-400 max-w-sm">
          Esta función es exclusiva para usuarios Pro.
        </p>
        <Button onClick={() => navigate('/pro')}>
          Actualizar a Pro
        </Button>
      </div>
    );
  }

  // mode === 'block'
  return (
    <div className="relative group">
      {/* Content blocked (blurred or opacity reduced) */}
      <div className="opacity-40 pointer-events-none filter blur-[1px] select-none" aria-hidden="true">
        {children}
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/10 dark:bg-black/20 backdrop-blur-[2px] rounded-lg transition-all duration-300">
        <div className="bg-white/90 dark:bg-gray-800/90 p-6 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col items-center text-center max-w-xs mx-4 transform transition-transform hover:scale-105">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center mb-3 shadow-lg">
            <Lock className="w-5 h-5 text-white" />
          </div>
          
          <h4 className="font-bold text-gray-900 dark:text-white mb-1">
            Función Pro
          </h4>
          
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
            Actualiza tu plan para desbloquear esta funcionalidad y potenciar tu negocio.
          </p>
          
          <Button 
            size="sm" 
            onClick={() => setShowModal(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white border-none shadow-md"
          >
            Ver planes
          </Button>
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
