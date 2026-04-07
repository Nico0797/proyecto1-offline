import { useEffect, useState, type ChangeEvent } from 'react';
import { useBusinessStore } from '../../store/businessStore';
import { Button } from '../ui/Button';
import { settingsService } from '../../services/settingsService';
import { LayoutTemplate, Play, RefreshCcw } from 'lucide-react';
import { cn } from '../../utils/cn';
import { toast } from 'react-hot-toast';

export const TemplatesSettingsTab = () => {
  const { activeBusiness } = useBusinessStore();
  const [activeType, setActiveType] = useState<'sale' | 'debt' | 'welcome' | 'payment'>('sale');
  const [templates, setTemplates] = useState({ sale: '', debt: '', welcome: '', payment: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeBusiness) {
      const data = settingsService.getTemplates(activeBusiness.id);
      setTemplates(data);
    }
  }, [activeBusiness]);

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setTemplates({ ...templates, [activeType]: e.target.value });
  };

  const handleSave = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      await settingsService.updateTemplates(activeBusiness.id, templates);
      toast.success('Plantillas guardadas');
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
        welcome: '¡Bienvenido a {negocio}, {cliente}!',
        payment: 'Hola {cliente}, hemos recibido tu abono de ${monto} en {negocio}. Tu nuevo saldo es ${saldo}. ¡Gracias!'
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
    text = text.replace('{monto}', '$100.000');
    text = text.replace('{fecha}', new Date().toLocaleDateString());
    return text;
  };

  return (
    <div className="app-surface max-w-4xl animate-in fade-in p-6 duration-300">
      <h3 className="mb-6 flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
        <LayoutTemplate className="w-6 h-6 text-green-500" />
        Plantillas de Mensajes
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-2">
            <button 
                onClick={() => setActiveType('sale')}
                className={cn('w-full rounded-lg p-3 text-left transition-colors', activeType === 'sale' ? 'bg-green-600 text-white' : 'app-surface text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800')}
            >
                Comprobante de Venta
            </button>
            <button 
                onClick={() => setActiveType('debt')}
                className={cn('w-full rounded-lg p-3 text-left transition-colors', activeType === 'debt' ? 'bg-green-600 text-white' : 'app-surface text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800')}
            >
                Recordatorio de Deuda
            </button>
            <button 
                onClick={() => setActiveType('welcome')}
                className={cn('w-full rounded-lg p-3 text-left transition-colors', activeType === 'welcome' ? 'bg-green-600 text-white' : 'app-surface text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800')}
            >
                Bienvenida Cliente
            </button>
            <button 
                onClick={() => setActiveType('payment')}
                className={cn('w-full rounded-lg p-3 text-left transition-colors', activeType === 'payment' ? 'bg-green-600 text-white' : 'app-surface text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800')}
            >
                Confirmación de Abono
            </button>
        </div>

        <div className="lg:col-span-2 space-y-4">
            <div className="app-muted-panel rounded-lg p-4">
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">Editor de Plantilla</p>
                <textarea 
                    value={templates[activeType]}
                    onChange={handleChange}
                    className="app-textarea h-32 resize-none font-mono"
                    placeholder="Escribe tu mensaje aquí..."
                />
                <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div className="flex gap-2 flex-wrap">
                        <span className="app-chip cursor-pointer rounded px-1.5 py-0.5 hover:text-gray-900 dark:hover:text-white" onClick={() => setTemplates({...templates, [activeType]: templates[activeType] + '{cliente}'})}>{`{cliente}`}</span>
                        <span className="app-chip cursor-pointer rounded px-1.5 py-0.5 hover:text-gray-900 dark:hover:text-white" onClick={() => setTemplates({...templates, [activeType]: templates[activeType] + '{negocio}'})}>{`{negocio}`}</span>
                        <span className="app-chip cursor-pointer rounded px-1.5 py-0.5 hover:text-gray-900 dark:hover:text-white" onClick={() => setTemplates({...templates, [activeType]: templates[activeType] + '{total}'})}>{`{total}`}</span>
                        <span className="app-chip cursor-pointer rounded px-1.5 py-0.5 hover:text-gray-900 dark:hover:text-white" onClick={() => setTemplates({...templates, [activeType]: templates[activeType] + '{monto}'})}>{`{monto}`}</span>
                        <span className="app-chip cursor-pointer rounded px-1.5 py-0.5 hover:text-gray-900 dark:hover:text-white" onClick={() => setTemplates({...templates, [activeType]: templates[activeType] + '{saldo}'})}>{`{saldo}`}</span>
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
                <div className="app-surface text-gray-900 p-3 rounded-lg rounded-tl-none shadow-sm text-sm relative max-w-[80%] dark:text-white">
                    {getPreview()}
                    <div className="absolute top-0 left-[-8px] h-0 w-0 border-b-[10px] border-r-[10px] border-t-[0px] border-transparent border-r-white dark:border-r-gray-900"></div>
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
