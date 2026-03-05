import { useEffect, useState } from 'react';
import { 
  Shield, 
  Globe, 
  Plug, 
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';

// --- Components for each tab ---

const SecuritySettings = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/security').then(res => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Cargando seguridad...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-slate-800 p-4 rounded-xl border border-white/10">
          <h3 className="text-slate-400 text-sm mb-1">Intentos de Login</h3>
          <p className="text-2xl font-bold text-white">{data.login_attempts}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-white/10">
          <h3 className="text-slate-400 text-sm mb-1">Logins Fallidos</h3>
          <p className="text-2xl font-bold text-red-400">{data.failed_logins}</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-xl border border-white/10">
          <h3 className="text-slate-400 text-sm mb-1">Tasa de Éxito</h3>
          <p className="text-2xl font-bold text-green-400">{data.success_rate.toFixed(1)}%</p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Usuarios Activos Recientes</h3>
        <div className="space-y-3">
          {data.active_users.map((u: any) => (
            <div key={u.id} className="flex justify-between items-center border-b border-white/5 pb-2">
              <div>
                <p className="text-white font-medium">{u.name}</p>
                <p className="text-xs text-slate-500">{u.email}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-green-400">Online</p>
                <p className="text-xs text-slate-500">{new Date(u.last_login).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const DomainSettings = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/domains').then(res => {
      setData(res.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Cargando dominios...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-slate-800 rounded-xl border border-white/10 p-6">
        <h3 className="text-lg font-bold text-white mb-4">Configuración de Dominios</h3>
        <div className="space-y-4">
          {data.domains.map((d: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-4 bg-slate-900 rounded-lg border border-slate-700">
              <div className="flex items-center gap-3">
                <Globe className="text-blue-400" />
                <div>
                  <p className="text-white font-medium">{d.domain || 'No configurado'}</p>
                  <p className="text-xs text-slate-500">
                    SSL: {d.ssl_enabled ? 'Activo' : 'Inactivo'} | Estado: {d.status}
                  </p>
                </div>
              </div>
              <Button variant="secondary" size="sm">Configurar</Button>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm text-blue-300">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <p>Para configurar un dominio personalizado, debes añadir un registro CNAME apuntando a <code>app.encaja.co</code> en tu proveedor de DNS.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const IntegrationSettings = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/integrations').then(res => {
      setIntegrations(res.data.integrations || []);
      setLoading(false);
    });
  }, []);

  const toggleIntegration = async (id: string, enabled: boolean) => {
    try {
      await api.post(`/admin/integrations/${id}`, { enabled });
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, enabled, status: enabled ? 'active' : 'inactive' } : i));
    } catch (err) {
      alert('Error al actualizar integración');
    }
  };

  if (loading) return <div>Cargando integraciones...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrations.map((integration) => (
          <div key={integration.id} className="bg-slate-800 rounded-xl border border-white/10 p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-700 rounded-lg">
                  <Plug className="text-white" size={20} />
                </div>
                <div>
                  <h3 className="text-white font-bold">{integration.name}</h3>
                  <p className="text-xs text-slate-400">{integration.description}</p>
                </div>
              </div>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input 
                  type="checkbox" 
                  name={`toggle-${integration.id}`} 
                  id={`toggle-${integration.id}`} 
                  checked={integration.enabled}
                  onChange={(e) => toggleIntegration(integration.id, e.target.checked)}
                  className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer transition-transform duration-200 ease-in-out checked:translate-x-5"
                />
                <label 
                  htmlFor={`toggle-${integration.id}`} 
                  className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${integration.enabled ? 'bg-green-500' : 'bg-slate-600'}`}
                ></label>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4 text-xs">
              {integration.enabled ? (
                <span className="flex items-center gap-1 text-green-400"><CheckCircle size={12} /> Conectado</span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500"><XCircle size={12} /> Desconectado</span>
              )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-white/5">
              <Button variant="secondary" size="sm" className="w-full">Configurar</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Main Settings Page ---

export const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState<'security' | 'domains' | 'integrations'>('security');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración</h1>
        <p className="text-slate-400 text-sm">Ajustes globales del sistema</p>
      </div>

      <div className="flex gap-4 border-b border-white/10">
        <button
          onClick={() => setActiveTab('security')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'security' 
              ? 'border-blue-500 text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield size={16} /> Seguridad
          </div>
        </button>
        <button
          onClick={() => setActiveTab('domains')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'domains' 
              ? 'border-blue-500 text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Globe size={16} /> Dominios
          </div>
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 ${
            activeTab === 'integrations' 
              ? 'border-blue-500 text-blue-400' 
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <Plug size={16} /> Integraciones
          </div>
        </button>
      </div>

      <div className="py-4">
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'domains' && <DomainSettings />}
        {activeTab === 'integrations' && <IntegrationSettings />}
      </div>
    </div>
  );
};
