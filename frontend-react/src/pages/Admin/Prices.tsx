import { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface PlanFeature {
  id: number;
  text: string;
  included_free: boolean;
  included_pro: boolean;
}

interface PricingConfig {
  monthly_price: number;
  annual_price: number;
  currency: string;
  features: PlanFeature[];
}

const INITIAL_CONFIG: PricingConfig = {
  monthly_price: 29900,
  annual_price: 299000,
  currency: 'COP',
  features: [
    { id: 1, text: 'Registro de Ventas y Gastos', included_free: true, included_pro: true },
    { id: 2, text: 'Inventario Básico', included_free: true, included_pro: true },
    { id: 3, text: 'Reportes Mensuales', included_free: true, included_pro: true },
    { id: 4, text: 'Múltiples Negocios', included_free: false, included_pro: true },
    { id: 5, text: 'Roles y Permisos', included_free: false, included_pro: true },
    { id: 6, text: 'Exportar a Excel', included_free: false, included_pro: true },
    { id: 7, text: 'Soporte Prioritario', included_free: false, included_pro: true },
  ]
};

export const AdminPrices = () => {
  const [config, setConfig] = useState<PricingConfig>(INITIAL_CONFIG);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await api.get('/prices');
        if (res.data && Object.keys(res.data).length > 0) {
            setConfig(res.data);
        }
      } catch (err) {
        console.error("Error fetching prices", err);
      }
    };
    fetchPrices();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await api.post('/admin/prices', config);
        alert('Configuración guardada correctamente');
    } catch (err: any) {
        alert(err.response?.data?.error || 'Error al guardar configuración');
    } finally {
        setIsSaving(false);
    }
  };

  const updateFeature = (id: number, field: keyof PlanFeature, value: any) => {
    setConfig({
      ...config,
      features: config.features.map(f => f.id === id ? { ...f, [field]: value } : f)
    });
  };

  const addFeature = () => {
    const newFeature: PlanFeature = {
      id: Math.max(...config.features.map(f => f.id), 0) + 1,
      text: 'Nueva característica',
      included_free: false,
      included_pro: true
    };
    setConfig({
      ...config,
      features: [...config.features, newFeature]
    });
  };

  const removeFeature = (id: number) => {
    setConfig({
      ...config,
      features: config.features.filter(f => f.id !== id)
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Precios y Planes</h1>
          <p className="text-slate-400 text-sm">Configura los precios y características de los planes</p>
        </div>
        <Button onClick={handleSave} isLoading={isSaving} className="flex items-center gap-2">
          <Save size={18} /> Guardar Cambios
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-800 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Precios Pro</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Precio Mensual</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={config.monthly_price}
                    onChange={(e) => setConfig({...config, monthly_price: parseInt(e.target.value)})}
                    className="pl-8"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Precio Anual</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <Input
                    type="number"
                    value={config.annual_price}
                    onChange={(e) => setConfig({...config, annual_price: parseInt(e.target.value)})}
                    className="pl-8"
                  />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">Moneda</label>
              <Input
                value={config.currency}
                onChange={(e) => setConfig({...config, currency: e.target.value})}
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Vista Previa (Calculada)</h3>
          <div className="bg-slate-900 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Mensual:</span>
              <span className="text-white font-mono">${config.monthly_price.toLocaleString()} / mes</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Anual:</span>
              <span className="text-white font-mono">${config.annual_price.toLocaleString()} / año</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-gray-700">
              <span className="text-green-400">Ahorro anual:</span>
              <span className="text-green-400 font-mono">
                ${((config.monthly_price * 12) - config.annual_price).toLocaleString()} 
                ({Math.round((((config.monthly_price * 12) - config.annual_price) / (config.monthly_price * 12)) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-800 border border-white/10 rounded-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-white">Comparativa de Características</h3>
          <Button onClick={addFeature} variant="secondary" size="sm">Agregar Característica</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-400">
            <thead className="bg-slate-900/50 text-gray-200 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 font-medium w-1/2">Característica</th>
                <th className="px-4 py-3 font-medium text-center">Free</th>
                <th className="px-4 py-3 font-medium text-center">Pro</th>
                <th className="px-4 py-3 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {config.features.map((feature) => (
                <tr key={feature.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="text"
                      value={feature.text}
                      onChange={(e) => updateFeature(feature.id, 'text', e.target.value)}
                      className="bg-transparent border-none w-full text-white focus:ring-0 px-0"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={feature.included_free}
                      onChange={(e) => updateFeature(feature.id, 'included_free', e.target.checked)}
                      className="rounded border-gray-600 bg-slate-700 text-blue-500 focus:ring-offset-0 focus:ring-0"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={feature.included_pro}
                      onChange={(e) => updateFeature(feature.id, 'included_pro', e.target.checked)}
                      className="rounded border-gray-600 bg-slate-700 text-blue-500 focus:ring-offset-0 focus:ring-0"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button 
                      onClick={() => removeFeature(feature.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <X size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
