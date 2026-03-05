import React, { useState, useEffect } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { Button } from '../ui/Button';
import { settingsService } from '../../services/settingsService';
import { LayoutTemplate, Play, RefreshCcw } from 'lucide-react';

export const TemplatesSettingsTab = () => {
  const { activeBusiness } = useBusinessStore();
  const [activeType, setActiveType] = useState<'sale' | 'debt' | 'welcome'>('sale');
  const [templates, setTemplates] = useState({ sale: '', debt: '', welcome: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeBusiness) {
      const data = settingsService.getTemplates(activeBusiness.id);
      setTemplates(data);
    }
  }, [activeBusiness]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTemplates({ ...templates, [activeType]: e.target.value });
  };

  const handleSave = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      await settingsService.updateTemplates(activeBusiness.id, templates);
      // In real scenario, also update backend via api
      alert('Plantillas guardadas');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (!window.confirm('¿Restaurar la plantilla por defecto?')) return;
    const defaults = {
        sale: 'Hola {cliente}, tu compra en {negocio} por ${total} fue exitosa.',
        debt: 'Hola {cliente}, te recordamos tu saldo pendiente de ${saldo} en {negocio}.',
        welcome: '¡Bienvenido a {negocio}, {cliente}!'
    };
    setTemplates({ ...templates, [activeType]: defaults[activeType] });
  };

  const getPreview = () => {
    let text = templates[activeType];
    text = text.replace('{cliente}', 'Juan Pérez');
    text = text.replace('{negocio}', activeBusiness?.name || 'Mi Negocio');
    text = text.replace('{total}', '$150.000');
    text = text.replace('{saldo}', '$50.000');
    text = text.replace('{items}', '1x Producto A, 2x Producto B');
    return text;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-4xl animate-in fade-in duration-300">
      <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
        <LayoutTemplate className="w-6 h-6 text-green-500" />
        Plantillas de Mensajes
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
            <button 
                onClick={() => setActiveType('sale')}
                className={`w-full text-left p-3 rounded-lg transition-colors ${activeType === 'sale' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
                Comprobante de Venta
            </button>
            <button 
                onClick={() => setActiveType('debt')}
                className={`w-full text-left p-3 rounded-lg transition-colors ${activeType === 'debt' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
                Recordatorio de Deuda
            </button>
            <button 
                onClick={() => setActiveType('welcome')}
                className={`w-full text-left p-3 rounded-lg transition-colors ${activeType === 'welcome' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
            >
                Bienvenida Cliente
            </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
            <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                <p className="text-sm text-gray-400 mb-2">Editor de Plantilla</p>
                <textarea 
                    value={templates[activeType]}
                    onChange={handleChange}
                    className="w-full h-32 bg-gray-900 border border-gray-700 rounded-lg p-3 text-white font-mono text-sm focus:border-green-500 focus:outline-none resize-none"
                    placeholder="Escribe tu mensaje aquí..."
                />
                <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                    <div className="flex gap-2 flex-wrap">
                        <span className="bg-gray-700 px-1.5 py-0.5 rounded cursor-pointer hover:text-white" onClick={() => setTemplates({...templates, [activeType]: templates[activeType] + '{cliente}'})}>{`{cliente}`}</span>
                        <span className="bg-gray-700 px-1.5 py-0.5 rounded cursor-pointer hover:text-white" onClick={() => setTemplates({...templates, [activeType]: templates[activeType] + '{negocio}'})}>{`{negocio}`}</span>
                        <span className="bg-gray-700 px-1.5 py-0.5 rounded cursor-pointer hover:text-white" onClick={() => setTemplates({...templates, [activeType]: templates[activeType] + '{total}'})}>{`{total}`}</span>
                    </div>
                    <button onClick={handleReset} className="flex items-center gap-1 hover:text-red-400 transition-colors">
                        <RefreshCcw className="w-3 h-3" /> Restaurar
                    </button>
                </div>
            </div>

            <div className="bg-green-900/20 border border-green-500/30 p-4 rounded-lg">
                <p className="text-xs font-bold text-green-500 mb-2 flex items-center gap-1 uppercase tracking-wider">
                    <Play className="w-3 h-3" /> Vista Previa en Vivo
                </p>
                <div className="bg-white text-gray-900 p-3 rounded-lg rounded-tl-none shadow-sm text-sm relative max-w-[80%]">
                    {getPreview()}
                    <div className="absolute top-0 left-[-8px] w-0 h-0 border-t-[0px] border-r-[10px] border-b-[10px] border-transparent border-r-white"></div>
                </div>
            </div>

            <div className="flex justify-end pt-4">
                <Button onClick={handleSave} disabled={loading} className="bg-green-600 hover:bg-green-700">
                    {loading ? 'Guardando...' : 'Guardar Plantilla'}
                </Button>
            </div>
        </div>
      </div>
    </div>
  );
};
