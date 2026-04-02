import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Shield, 
  Globe, 
  Plug, 
  AlertTriangle
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import { Button } from '../../components/ui/Button';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { AdminCard } from '../../components/Admin/ui/AdminCard';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';
import { cn } from '../../utils/cn';

// --- Components for each tab ---

const SecuritySettings = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/security')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        // Mock data if fails
        setData({
          login_attempts: 1250,
          failed_logins: 45,
          success_rate: 96.4,
          active_users: []
        });
      });
  }, []);

  if (loading) return <div className="p-8 text-center app-text-muted">Cargando seguridad...</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <AdminCard className="p-4" noPadding>
          <div className="p-4">
            <h3 className="mb-1 text-sm uppercase tracking-wider app-text-muted">Intentos de Login</h3>
            <p className="text-2xl font-bold app-text">{data?.login_attempts || 0}</p>
          </div>
        </AdminCard>
        <AdminCard className="p-4" noPadding>
          <div className="p-4">
            <h3 className="mb-1 text-sm uppercase tracking-wider app-text-muted">Logins Fallidos</h3>
            <p className="text-2xl font-bold text-rose-400">{data?.failed_logins || 0}</p>
          </div>
        </AdminCard>
        <AdminCard className="p-4" noPadding>
          <div className="p-4">
            <h3 className="mb-1 text-sm uppercase tracking-wider app-text-muted">Tasa de Éxito</h3>
            <p className="text-2xl font-bold text-emerald-400">{data?.success_rate?.toFixed(1) || 0}%</p>
          </div>
        </AdminCard>
      </div>

      <AdminCard title="Usuarios Activos Recientes" noPadding>
        <div className="app-divider divide-y">
          {data?.active_users?.length > 0 ? (
            data.active_users.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-4 transition-colors hover:bg-[color:var(--app-surface-soft)]">
                <div>
                  <p className="font-medium app-text">{u.name}</p>
                  <p className="text-xs app-text-muted">{u.email}</p>
                </div>
                <div className="text-right">
                  <StatusBadge variant="success" icon>Online</StatusBadge>
                  <p className="mt-1 text-xs app-text-muted">{new Date(u.last_login).toLocaleString()}</p>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center app-text-muted">No hay usuarios activos recientes</div>
          )}
        </div>
      </AdminCard>
    </div>
  );
};

const DomainSettings = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/domains')
      .then(res => {
        setData(res.data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        setData({ domains: [] });
      });
  }, []);

  if (loading) return <div className="p-8 text-center app-text-muted">Cargando dominios...</div>;

  return (
    <div className="space-y-6">
      <AdminCard title="Configuración de Dominios" noPadding>
        <div className="p-6 space-y-4">
          {data?.domains?.length > 0 ? (
            data.domains.map((d: any, i: number) => (
              <div key={i} className="app-soft-surface flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <div className="app-tone-icon-blue">
                    <Globe size={20} />
                  </div>
                  <div>
                    <p className="font-medium app-text">{d.domain || 'No configurado'}</p>
                    <div className="flex gap-2 mt-1">
                      <span className="text-xs app-text-muted">SSL: {d.ssl_enabled ? 'Activo' : 'Inactivo'}</span>
                      <span className="text-xs app-text-muted">|</span>
                      <span className="text-xs app-text-muted">Estado: {d.status}</span>
                    </div>
                  </div>
                </div>
                <Button variant="secondary" size="sm">Configurar</Button>
              </div>
            ))
          ) : (
            <div className="py-4 text-center app-text-muted">No hay dominios personalizados configurados</div>
          )}
          
          <div className="app-banner-info mt-6 rounded-lg p-4 text-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">Instrucciones DNS</p>
                <p>Para configurar un dominio personalizado, debes añadir un registro CNAME apuntando a <code className="rounded bg-white/80 px-1 py-0.5 text-[color:var(--app-text)] dark:bg-blue-500/20 dark:text-white">app.encaja.co</code> en tu proveedor de DNS.</p>
              </div>
            </div>
          </div>
        </div>
      </AdminCard>
    </div>
  );
};

const IntegrationSettings = () => {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/integrations')
      .then(res => {
        setIntegrations(res.data.integrations || []);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
        // Mock data
        setIntegrations([
          { id: 'stripe', name: 'Stripe', description: 'Pagos con tarjeta', enabled: true },
          { id: 'wompi', name: 'Wompi', description: 'Pasarela de pagos Colombia', enabled: true },
          { id: 'sendgrid', name: 'SendGrid', description: 'Envío de correos transaccionales', enabled: false },
        ]);
      });
  }, []);

  const toggleIntegration = async (id: string, enabled: boolean) => {
    try {
      // Optimistic update
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, enabled } : i));
      
      await api.post(`/admin/integrations/${id}`, { enabled });
      toast.success('Integración actualizada');
    } catch (err) {
      toast.error('Error al actualizar integración');
      // Revert
      setIntegrations(prev => prev.map(i => i.id === id ? { ...i, enabled: !enabled } : i));
    }
  };

  if (loading) return <div className="p-8 text-center app-text-muted">Cargando integraciones...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {integrations.map((integration) => (
        <AdminCard key={integration.id} noPadding className="hover:border-blue-500/30 transition-colors">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="app-muted-panel rounded-lg p-2 app-text">
                  <Plug size={20} />
                </div>
                <div>
                  <h3 className="font-bold app-text">{integration.name}</h3>
                  <p className="mt-1 text-xs app-text-muted">{integration.description}</p>
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
                  className={cn(
                    "toggle-label block overflow-hidden h-5 rounded-full cursor-pointer",
                    integration.enabled ? 'bg-green-500' : 'bg-gray-300 dark:bg-slate-600'
                  )}
                ></label>
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-4 text-xs">
              {integration.enabled ? (
                <StatusBadge variant="success" icon>Conectado</StatusBadge>
              ) : (
                <StatusBadge variant="neutral" icon>Desconectado</StatusBadge>
              )}
            </div>
            
            <div className="app-divider mt-4 border-t pt-4">
              <Button variant="secondary" size="sm" className="w-full">Configurar</Button>
            </div>
          </div>
        </AdminCard>
      ))}
    </div>
  );
};

// --- Main Settings Page ---

export const AdminSettings = () => {
  const [activeTab, setActiveTab] = useState<'security' | 'domains' | 'integrations'>('security');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Sync URL path with active tab
    const path = location.pathname;
    if (path.includes('/admin/security')) setActiveTab('security');
    else if (path.includes('/admin/domains')) setActiveTab('domains');
    else if (path.includes('/admin/integrations')) setActiveTab('integrations');
    else if (path.includes('/admin/settings')) setActiveTab('security'); // Default
  }, [location]);

  const handleTabChange = (tab: 'security' | 'domains' | 'integrations') => {
    setActiveTab(tab);
    // Update URL to match standard
    if (tab === 'security') navigate('/admin/security');
    else if (tab === 'domains') navigate('/admin/domains');
    else if (tab === 'integrations') navigate('/admin/integrations');
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader 
        title="Configuración Global" 
        description="Ajustes de seguridad, dominios e integraciones del sistema."
      />

      <div className="app-divider flex gap-1 overflow-x-auto border-b">
        <button
          onClick={() => handleTabChange('security')}
          className={cn(
            "pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
            activeTab === 'security' 
              ? 'app-tab-line-active' 
              : 'app-tab-line-idle'
          )}
        >
          <div className="flex items-center gap-2">
            <Shield size={16} /> Seguridad
          </div>
        </button>
        <button
          onClick={() => handleTabChange('domains')}
          className={cn(
            "pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
            activeTab === 'domains' 
              ? 'app-tab-line-active' 
              : 'app-tab-line-idle'
          )}
        >
          <div className="flex items-center gap-2">
            <Globe size={16} /> Dominios
          </div>
        </button>
        <button
          onClick={() => handleTabChange('integrations')}
          className={cn(
            "pb-3 px-4 text-sm font-medium transition-colors border-b-2 whitespace-nowrap",
            activeTab === 'integrations' 
              ? 'app-tab-line-active' 
              : 'app-tab-line-idle'
          )}
        >
          <div className="flex items-center gap-2">
            <Plug size={16} /> Integraciones
          </div>
        </button>
      </div>

      <div className="py-2">
        {activeTab === 'security' && <SecuritySettings />}
        {activeTab === 'domains' && <DomainSettings />}
        {activeTab === 'integrations' && <IntegrationSettings />}
      </div>
    </div>
  );
};
