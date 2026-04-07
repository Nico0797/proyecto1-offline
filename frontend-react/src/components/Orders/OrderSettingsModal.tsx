import React from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useOrderSettings } from '../../store/orderSettingsStore';
import { Check, Eye, EyeOff, RotateCcw } from 'lucide-react';

interface OrderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrderSettingsModal: React.FC<OrderSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { columns, toggleColumn, updateLabel, resetDefaults } = useOrderSettings();

  const getColorClass = (color?: string) => {
    switch (color) {
      case 'yellow': return 'bg-yellow-500';
      case 'blue': return 'bg-blue-500';
      case 'green': return 'bg-green-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Configuración de Pedidos"
      className="max-w-md"
    >
      <div className="p-6 space-y-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
            Personalizar Tablero Kanban
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
            Activa o desactiva columnas y cambia sus nombres para adaptar el flujo a tu negocio.
          </p>

          <div className="space-y-3">
            {columns.map((col) => (
              <div
                key={col.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <button
                  onClick={() => toggleColumn(col.id)}
                  className={`p-2 rounded-md transition-colors ${
                    col.visible
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                  }`}
                  title={col.visible ? 'Ocultar Columna' : 'Mostrar Columna'}
                >
                  {col.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                
                <div className="flex-1">
                  <Input
                    value={col.label}
                    onChange={(e) => updateLabel(col.id, e.target.value)}
                    className="h-9 text-sm"
                    placeholder="Nombre de la columna"
                  />
                </div>
                
                <div className={`w-3 h-3 rounded-full shrink-0 ${getColorClass(col.color)}`} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-gray-100 dark:border-gray-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetDefaults}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
          >
            <RotateCcw className="w-3 h-3 mr-2" /> Restaurar
          </Button>
          
          <Button onClick={onClose}>
            <Check className="w-4 h-4 mr-2" /> Guardar
          </Button>
        </div>
      </div>
    </Modal>
  );
};
