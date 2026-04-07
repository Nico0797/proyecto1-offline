import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useBusinessStore } from '../../store/businessStore';
import { Save, AlertTriangle, Clock, CalendarDays, CheckCircle2 } from 'lucide-react';
import { cn } from '../../utils/cn';
import api from '../../services/api';

interface CreditSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreditSettingsModal: React.FC<CreditSettingsModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { activeBusiness } = useBusinessStore();
  const [creditDays, setCreditDays] = useState<number>(30);
  const [loading, setLoading] = useState(false);
  const [previewDate, setPreviewDate] = useState<string>('');

  useEffect(() => {
    if (activeBusiness && isOpen) {
      // Try to load from API first (if supported) or local storage
      const fetchSettings = async () => {
        try {
          // Check local storage first for immediate feedback
          const storedSettings = localStorage.getItem(`business_settings_${activeBusiness.id}`);
          if (storedSettings) {
            const settings = JSON.parse(storedSettings);
            setCreditDays(settings.credit_days || 30);
          } else {
            // Fallback to business default or API call if we had one for settings
            setCreditDays(activeBusiness.credit_days || 30);
          }
        } catch (err) {
          console.error(err);
        }
      };
      fetchSettings();
    }
  }, [activeBusiness, isOpen]);

  // Update preview date when days change
  useEffect(() => {
    const date = new Date();
    date.setDate(date.getDate() + (creditDays || 0));
    setPreviewDate(date.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
  }, [creditDays]);

  const handleSave = async () => {
    if (!activeBusiness) return;

    setLoading(true);
    try {
      // 1. Save to local storage (frontend persistence)
      const settings = {
        credit_days: creditDays
      };
      localStorage.setItem(`business_settings_${activeBusiness.id}`, JSON.stringify(settings));
      
      // 2. Try to update backend via business update endpoint if available
      // This ensures other devices/sessions get the update if backend supports it
      try {
        await api.put(`/businesses/${activeBusiness.id}`, { 
            settings: { debt_term_days: creditDays } 
        });
      } catch (apiError) {
        console.warn('Backend settings update failed, falling back to local only', apiError);
      }
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to save settings', error);
    } finally {
      setLoading(false);
    }
  };

  const PRESETS = [7, 15, 30, 45, 60];

  return (
    <Modal 
        isOpen={isOpen} 
        onClose={onClose} 
        title="Configuración de Crédito"
        className="max-w-md"
    >
      <div className="space-y-6">
        {/* Header Visual */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl flex gap-4 items-start border border-blue-100 dark:border-blue-800">
           <div className="p-3 bg-white dark:bg-gray-800 rounded-full shadow-sm text-blue-600 dark:text-blue-400 shrink-0">
              <Clock className="w-6 h-6" />
           </div>
           <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-base">Plazos de Vencimiento</h4>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                 Define el tiempo estándar que otorgas a tus clientes para pagar sus créditos. Esto afectará cuándo las facturas se marcan como <span className="text-red-500 font-medium">vencidas</span>.
              </p>
           </div>
        </div>

        {/* Main Input */}
        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Días de Crédito Estándar
           </label>
           
           <div className="relative">
             <Input
                type="number"
                min="0"
                max="365"
                value={creditDays.toString()}
                onChange={(e) => setCreditDays(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full pl-12 h-12 text-lg font-bold"
             />
             <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400">
                <CalendarDays className="w-5 h-5" />
             </div>
             <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">
                días
             </span>
           </div>

           {/* Presets */}
           <div className="flex flex-wrap gap-2 mt-3">
             {PRESETS.map(days => (
               <button
                 key={days}
                 type="button"
                 onClick={() => setCreditDays(days)}
                 className={cn(
                   "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                   creditDays === days
                     ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                     : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700"
                 )}
               >
                 {days} días
               </button>
             ))}
           </div>
        </div>

        {/* Preview */}
        <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
           <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                 <p className="text-sm font-medium text-gray-900 dark:text-white">Ejemplo de Vencimiento</p>
                 <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Si vendes hoy, la factura vencerá el:
                 </p>
                 <p className="text-base font-bold text-blue-600 dark:text-blue-400 mt-1 capitalize">
                    {previewDate}
                 </p>
              </div>
           </div>
        </div>

        {/* Warning */}
        <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/10 p-3 rounded-lg">
           <AlertTriangle className="w-4 h-4 shrink-0" />
           <p>Este cambio actualizará el estado de todas las facturas pendientes actuales.</p>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-gray-100 dark:hover:bg-gray-800">
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} isLoading={loading} className="bg-blue-600 hover:bg-blue-700 text-white border-none shadow-md">
             <Save className="w-4 h-4 mr-2" /> Guardar Cambios
          </Button>
        </div>
      </div>
    </Modal>
  );
};
