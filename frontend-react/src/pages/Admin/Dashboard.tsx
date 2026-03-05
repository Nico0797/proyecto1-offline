import { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  Activity, 
  DollarSign, 
  ShoppingBag, 
  Store 
} from 'lucide-react';
import api from '../../services/api';
import { cn } from '../../utils/cn';

interface AdminStats {
  total_users: number;
  free_users: number;
  pro_users: number;
  new_users_30d: number;
  active_users_30d: number;
  total_membership_income: number;
  total_membership_payments: number;
  income_this_month: number;
  income_growth: number;
  pro_monthly_income: number;
  pro_annual_income: number;
  total_businesses: number;
  total_customers_global: number;
  total_products_global: number;
}

interface AuditLog {
  id: number;
  user_email: string;
  action: string;
  entity: string;
  timestamp: string;
}

export const AdminDashboard = () => {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, auditRes] = await Promise.all([
          api.get('/admin/stats'),
          api.get('/admin/audit?limit=10')
        ]);
        
        setStats(statsRes.data);
        setRecentActivity(auditRes.data.logs || []);
      } catch (err) {
        console.error(err);
        setError('Error al cargar datos del dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
        {error}
      </div>
    );
  }

  const colorMap: Record<string, string> = {
    blue: 'text-blue-500 bg-blue-500/10',
    green: 'text-green-500 bg-green-500/10',
    purple: 'text-purple-500 bg-purple-500/10',
    yellow: 'text-yellow-500 bg-yellow-500/10',
    indigo: 'text-indigo-500 bg-indigo-500/10',
    pink: 'text-pink-500 bg-pink-500/10',
    orange: 'text-orange-500 bg-orange-500/10',
    red: 'text-red-500 bg-red-500/10',
  };

  const StatCard = ({ title, value, subtext, icon: Icon, trend, color = "blue" }: any) => (
    <div className="bg-slate-800 border border-white/10 rounded-xl p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-slate-400 text-sm font-medium">{title}</p>
          <h3 className="text-2xl font-bold text-white mt-1">{value}</h3>
        </div>
        <div className={cn("p-2 rounded-lg", colorMap[color] || colorMap.blue)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {(subtext || trend !== undefined) && (
        <div className="flex items-center gap-2 text-sm">
          {trend !== undefined && (
            <span className={cn(
              "font-medium",
              trend >= 0 ? "text-green-400" : "text-red-400"
            )}>
              {trend >= 0 ? "+" : ""}{trend}%
            </span>
          )}
          <span className="text-slate-500">{subtext}</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-6">Resumen</h1>
        
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Métricas de Usuarios</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Total Usuarios" 
            value={stats?.total_users} 
            subtext={`Free: ${stats?.free_users} | Pro: ${stats?.pro_users}`}
            icon={Users}
            color="blue"
          />
          <StatCard 
            title="Nuevos (30 días)" 
            value={stats?.new_users_30d} 
            subtext="Crecimiento reciente"
            icon={TrendingUp}
            color="green"
          />
          <StatCard 
            title="Activos (30 días)" 
            value={stats?.active_users_30d} 
            subtext="Sesiones recientes"
            icon={Activity}
            color="purple"
          />
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Finanzas App</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Ingresos Totales" 
            value={`$${stats?.total_membership_income?.toLocaleString()}`} 
            subtext={`Pagos: ${stats?.total_membership_payments}`}
            icon={DollarSign}
            color="yellow"
          />
          <StatCard 
            title="Ingresos Mes Actual" 
            value={`$${stats?.income_this_month?.toLocaleString()}`} 
            trend={stats?.income_growth}
            subtext="vs mes anterior"
            icon={DollarSign}
            color="green"
          />
          <div className="bg-slate-800 border border-white/10 rounded-xl p-6">
            <p className="text-slate-400 text-sm font-medium mb-4">Distribución Planes</p>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white">Mensual</span>
                <span className="font-bold text-white">${stats?.pro_monthly_income?.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-blue-500 h-full" 
                  style={{ width: `${stats && (stats.pro_monthly_income / (stats.income_this_month || 1)) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-white">Anual</span>
                <span className="font-bold text-white">${stats?.pro_annual_income?.toLocaleString()}</span>
              </div>
              <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-purple-500 h-full" 
                  style={{ width: `${stats && (stats.pro_annual_income / (stats.income_this_month || 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Métricas de Plataforma</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard 
            title="Negocios Creados" 
            value={stats?.total_businesses} 
            icon={Store}
            color="indigo"
          />
          <StatCard 
            title="Clientes Globales" 
            value={stats?.total_customers_global} 
            icon={Users}
            color="pink"
          />
          <StatCard 
            title="Productos Globales" 
            value={stats?.total_products_global} 
            icon={ShoppingBag}
            color="orange"
          />
        </div>
      </div>

      <div className="bg-slate-800 border border-white/10 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="font-bold text-white">Actividad Reciente del Sistema</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900/50 text-slate-200 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-medium">Usuario</th>
                <th className="px-6 py-3 font-medium">Acción</th>
                <th className="px-6 py-3 font-medium">Entidad</th>
                <th className="px-6 py-3 font-medium">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {recentActivity.length > 0 ? (
                recentActivity.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-white">{log.user_email || 'Sistema'}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-medium">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">{log.entity}</td>
                    <td className="px-6 py-4">{new Date(log.timestamp).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No hay actividad reciente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
