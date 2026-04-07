import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, BellRing, CreditCard, DollarSign, ShieldCheck, Store, Users } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { AdminCard } from '../../components/Admin/ui/AdminCard';
import { AdminTable, Column } from '../../components/Admin/ui/AdminTable';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';
import { OwnerCenterNav } from '../../components/Admin/ui/OwnerCenterNav';
import { Button } from '../../components/ui/Button';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

type HealthStatus = 'healthy' | 'attention' | 'critical';
type RiskLevel = 'high' | 'medium' | 'low';

interface Overview {
  generated_at: string;
  kpis: { total_businesses: number; active_businesses: number; inactive_businesses: number; at_risk_businesses: number; total_users: number; active_users_30d: number; new_users_7d: number; new_businesses_30d: number };
  revenue: { income_growth: number; estimated_mrr: number; estimated_arr: number; total_membership_income: number; active_paid_accounts: number; mrr_unknown_accounts: number };
  billing: { expiring_soon_count: number; expired_count: number; auto_renew_off_count: number; failed_payments_30d: number };
  usage: { recent_audit_events_24h: number; failed_logins_30d: number; login_success_rate: number };
  health: { status: HealthStatus; label: string };
  plan_distribution: { businesses: Record<string, number> };
  charts: { labels: string[]; membership_revenue: number[]; new_businesses: number[] };
  alerts: Array<{ id: string; level: RiskLevel; title: string; message: string; cta_label: string; cta_to: string }>;
  at_risk_businesses: Array<{ id: number; name: string; owner_email: string; plan: string; risk_level: RiskLevel; risk_flags: string[]; last_activity_at?: string }>;
  high_value_businesses: Array<{ id: number; name: string; owner_email: string; plan: string; sales_total_30d?: number; sales_total?: number; last_activity_at?: string }>;
  inactive_businesses: Array<{ id: number; name: string; owner_email: string; plan: string; risk_flags: string[]; last_activity_at?: string }>;
  recent_activity: Array<{ id: number; actor_name?: string; user_email?: string; action: string; entity: string; business_name?: string; timestamp: string }>;
}

const money = (value?: number | null) => `$${Number(value || 0).toLocaleString()}`;
const plan = (value?: string) => ({ free: 'Free', basic: 'Basic', pro: 'Pro', business: 'Business' }[value || ''] || value || 'Sin plan');
const risk = (value: string) => ({ plan_expired: 'Plan vencido', plan_expiring: 'Vence pronto', auto_renew_off: 'Renovación apagada', failed_payment: 'Pago fallido', inactive_usage: 'Sin actividad', owner_inactive: 'Dueño inactivo' }[value] || value);
const ago = (value?: string) => {
  if (!value) return 'Sin actividad';
  const days = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Hace 1 día';
  if (days < 30) return `Hace ${days} días`;
  return new Date(value).toLocaleDateString();
};

const Stat = ({ title, value, subtext, icon: Icon }: any) => (
  <div className="rounded-2xl border border-white/5 bg-slate-800/50 p-5">
    <div className="mb-4 flex items-start justify-between gap-4">
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{title}</div>
        <div className="mt-2 text-3xl font-bold text-white">{value}</div>
      </div>
      <div className="rounded-xl border border-white/5 bg-slate-900/70 p-3 text-blue-400"><Icon className="h-5 w-5" /></div>
    </div>
    <div className="text-sm text-slate-500">{subtext}</div>
  </div>
);

export const AdminDashboard = () => {
  const navigate = useNavigate();
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/admin/owner-overview')
      .then((res) => {
        const payload = res?.data;
        if (!payload) {
          throw new Error('Respuesta vacía en owner-overview');
        }
        setOverview(payload);
      })
      .catch((err) => {
        console.error(err);
        setError('Error al cargar el Owner Control Center');
      })
      .finally(() => setLoading(false));
  }, []);

  const chartData = useMemo(() => ({
    labels: overview?.charts.labels || [],
    datasets: [
      { label: 'Ingresos', data: overview?.charts.membership_revenue || [], borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.1)', tension: 0.35, fill: true },
      { label: 'Nuevos negocios', data: overview?.charts.new_businesses || [], borderColor: '#8b5cf6', backgroundColor: 'rgba(139,92,246,0)', tension: 0.35, borderDash: [5, 5], yAxisID: 'y1' },
    ],
  }), [overview]);

  const riskColumns: Column<Overview['at_risk_businesses'][number]>[] = [
    { header: 'Cuenta', cell: (item) => <div><div className="font-medium text-white">{item.name}</div><div className="text-xs text-slate-500">{item.owner_email}</div></div> },
    { header: 'Plan', cell: (item) => <StatusBadge variant={item.plan === 'business' ? 'purple' : item.plan === 'pro' ? 'warning' : 'neutral'}>{plan(item.plan)}</StatusBadge> },
    { header: 'Señales', cell: (item) => <div className="flex flex-wrap gap-2">{item.risk_flags.slice(0, 2).map((flag) => <StatusBadge key={`${item.id}-${flag}`} variant={item.risk_level === 'high' ? 'error' : 'warning'}>{risk(flag)}</StatusBadge>)}</div> },
    { header: 'Última actividad', align: 'right', cell: (item) => <span className="text-xs text-slate-400">{ago(item.last_activity_at)}</span> },
  ];

  const activityColumns: Column<Overview['recent_activity'][number]>[] = [
    { header: 'Actor', cell: (item) => <div><div className="font-medium text-white">{item.actor_name || item.user_email || 'Sistema'}</div><div className="text-xs text-slate-500">{item.user_email || 'Evento interno'}</div></div> },
    { header: 'Acción', cell: (item) => <StatusBadge variant={item.action === 'delete' || item.action === 'failed_login' || item.action === 'access_denied' ? 'error' : item.action === 'create' ? 'success' : item.action === 'update' ? 'warning' : 'info'}>{item.action}</StatusBadge> },
    { header: 'Evento', cell: (item) => <div><div className="text-slate-300">{item.entity}</div><div className="text-xs text-slate-500">{item.business_name || 'Sistema'}</div></div> },
    { header: 'Fecha', align: 'right', cell: (item) => <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleString()}</span> },
  ];

  if (loading) return <div className="flex h-96 items-center justify-center"><div className="h-14 w-14 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div></div>;
  if (!overview) {
    return <div className="space-y-6"><AdminPageHeader title="Owner Control Center" description="No fue posible cargar la vista ejecutiva." /><AdminCard><div className="flex items-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-rose-200"><AlertTriangle className="h-5 w-5" /><span>{error}</span></div></AdminCard></div>;
  }

  const healthVariant = { healthy: 'success', attention: 'warning', critical: 'error' } as const;
  const alertVariant = { high: 'error', medium: 'warning', low: 'info' } as const;
  const planRows = Object.entries(overview.plan_distribution.businesses || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8 pb-10">
      <AdminPageHeader
        title="Owner Control Center"
        description="Salud, monetización, adopción, riesgo y actividad crítica de la plataforma en una sola vista."
        actions={<div className="flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5"><StatusBadge variant={healthVariant[overview.health.status]} icon>{overview.health.label}</StatusBadge><span className="text-xs text-slate-400">{new Date(overview.generated_at).toLocaleTimeString()}</span></div>}
      />

      <OwnerCenterNav />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <button onClick={() => navigate('/admin/alerts')} className="rounded-2xl border border-white/5 bg-slate-800/50 p-5 text-left transition hover:border-white/10 hover:bg-slate-800"><BellRing className="mb-3 h-5 w-5 text-rose-400" /><div className="font-semibold text-white">Cuentas que requieren atención</div><div className="mt-1 text-sm text-slate-400">Abre la bandeja priorizada para revisar billing, churn, soporte e inactividad.</div></button>
        <button onClick={() => navigate('/admin/activity')} className="rounded-2xl border border-white/5 bg-slate-800/50 p-5 text-left transition hover:border-white/10 hover:bg-slate-800"><ShieldCheck className="mb-3 h-5 w-5 text-emerald-400" /><div className="font-semibold text-white">Activity & Audit Center</div><div className="mt-1 text-sm text-slate-400">Entiende qué cambió, quién actuó y en qué cuenta antes de tomar decisiones.</div></button>
        <button onClick={() => navigate('/admin/businesses')} className="rounded-2xl border border-white/5 bg-slate-800/50 p-5 text-left transition hover:border-white/10 hover:bg-slate-800"><Store className="mb-3 h-5 w-5 text-blue-400" /><div className="font-semibold text-white">Business 360</div><div className="mt-1 text-sm text-slate-400">Abre la gestión de cuentas para operar soporte, renovación, actividad y notas internas.</div></button>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <Stat title="Negocios activos" value={overview.kpis.active_businesses} subtext={`${overview.kpis.total_businesses} negocios · ${overview.kpis.new_businesses_30d} nuevos 30d`} icon={Store} />
        <Stat title="Usuarios activos 30d" value={overview.kpis.active_users_30d} subtext={`${overview.kpis.total_users} usuarios · ${overview.kpis.new_users_7d} nuevos 7d`} icon={Users} />
        <Stat title="MRR estimado" value={money(overview.revenue.estimated_mrr)} subtext={overview.revenue.mrr_unknown_accounts ? `${overview.revenue.mrr_unknown_accounts} cuentas pagas sin base suficiente` : 'Basado en pagos reales'} icon={DollarSign} />
        <Stat title="Cuentas en riesgo" value={overview.kpis.at_risk_businesses} subtext={`${overview.billing.failed_payments_30d} pagos fallidos · ${overview.billing.expired_count} vencidas`} icon={CreditCard} />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <AdminCard className="xl:col-span-2" title="Ingresos y crecimiento">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div><div className="text-xs uppercase tracking-wider text-slate-500">Ingreso acumulado</div><div className="mt-1 text-xl font-bold text-white">{money(overview.revenue.total_membership_income)}</div></div>
            <div><div className="text-xs uppercase tracking-wider text-slate-500">ARR estimado</div><div className="mt-1 text-xl font-bold text-white">{money(overview.revenue.estimated_arr)}</div></div>
            <div><div className="text-xs uppercase tracking-wider text-slate-500">Tendencia mensual</div><div className={`mt-1 inline-flex items-center gap-2 text-xl font-bold ${overview.revenue.income_growth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{overview.revenue.income_growth >= 0 ? '↗' : '↘'} {Math.abs(overview.revenue.income_growth).toFixed(1)}%</div></div>
          </div>
          <div className="h-[300px]"><Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#94a3b8' } } }, scales: { x: { ticks: { color: '#64748b' }, grid: { display: false } }, y: { ticks: { color: '#64748b' } }, y1: { position: 'right', ticks: { color: '#64748b', precision: 0 }, grid: { display: false } } } }} /></div>
        </AdminCard>

        <AdminCard title="Alertas prioritarias" actions={<Button size="sm" variant="secondary" onClick={() => navigate('/admin/alerts')}>Abrir bandeja</Button>}>
          <div className="space-y-3">
            {overview.alerts.length > 0 ? overview.alerts.map((alert) => (
              <button key={alert.id} onClick={() => navigate(alert.cta_to)} className="w-full rounded-2xl border border-white/5 bg-slate-900/50 p-4 text-left transition hover:border-white/10 hover:bg-slate-900">
                <div className="mb-2 flex items-center justify-between gap-3"><StatusBadge variant={alertVariant[alert.level]}>{alert.level === 'high' ? 'Alta' : alert.level === 'medium' ? 'Media' : 'Baja'}</StatusBadge><BellRing className="h-4 w-4 text-slate-500" /></div>
                <div className="font-medium text-white">{alert.title}</div>
                <div className="mt-1 text-sm text-slate-400">{alert.message}</div>
                <div className="mt-3 inline-flex items-center gap-2 text-sm text-blue-400">{alert.cta_label}<ArrowRight className="h-4 w-4" /></div>
              </button>
            )) : <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">No hay alertas prioritarias abiertas.</div>}
          </div>
        </AdminCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <AdminCard title="Monetización y billing">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3"><span className="text-slate-400">Cuentas pagas activas</span><span className="font-semibold text-white">{overview.revenue.active_paid_accounts}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3"><span className="text-slate-400">Vencen pronto</span><span className="font-semibold text-amber-400">{overview.billing.expiring_soon_count}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3"><span className="text-slate-400">Renovación apagada</span><span className="font-semibold text-amber-400">{overview.billing.auto_renew_off_count}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3"><span className="text-slate-400">Pagos fallidos 30d</span><span className="font-semibold text-rose-400">{overview.billing.failed_payments_30d}</span></div>
          </div>
        </AdminCard>

        <AdminCard title="Salud operativa">
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3"><span className="text-slate-400">Eventos 24h</span><span className="font-semibold text-white">{overview.usage.recent_audit_events_24h}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3"><span className="text-slate-400">Logins fallidos 30d</span><span className="font-semibold text-rose-400">{overview.usage.failed_logins_30d}</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3"><span className="text-slate-400">Tasa de éxito login</span><span className="font-semibold text-white">{overview.usage.login_success_rate.toFixed(1)}%</span></div>
            <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3"><span className="text-slate-400">Negocios inactivos</span><span className="font-semibold text-amber-400">{overview.kpis.inactive_businesses}</span></div>
          </div>
        </AdminCard>

        <AdminCard title="Distribución por plan">
          <div className="space-y-3">{planRows.map(([key, count]) => <div key={key} className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3 text-sm"><span className="text-slate-300">{plan(key)}</span><span className="font-semibold text-white">{count}</span></div>)}</div>
        </AdminCard>
      </div>

      <AdminCard title="Cuentas que requieren atención" actions={<Button size="sm" variant="secondary" onClick={() => navigate('/admin/businesses')}>Gestionar negocios</Button>} noPadding>
        <AdminTable columns={riskColumns} data={overview.at_risk_businesses} emptyMessage="No hay cuentas con riesgo relevante" />
      </AdminCard>

      <AdminCard title="Actividad crítica reciente" actions={<Button size="sm" variant="secondary" onClick={() => navigate('/admin/audit')}>Ver auditoría</Button>} noPadding>
        <AdminTable columns={activityColumns} data={overview.recent_activity} emptyMessage="No hay actividad reciente" />
      </AdminCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <AdminCard title="Negocios de alto valor" actions={<Button size="sm" variant="ghost" onClick={() => navigate('/admin/businesses')}>Ver todos</Button>}>
          <div className="space-y-3">{overview.high_value_businesses.length > 0 ? overview.high_value_businesses.map((item) => <button key={item.id} onClick={() => navigate(`/admin/businesses?business_id=${item.id}`)} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{item.name}</div><StatusBadge variant={item.plan === 'business' ? 'purple' : item.plan === 'pro' ? 'warning' : 'neutral'}>{plan(item.plan)}</StatusBadge></div><div className="mt-1 text-sm text-slate-400">{item.owner_email}</div><div className="mt-2 text-xs text-slate-500">30d {money(item.sales_total_30d)} · última actividad {ago(item.last_activity_at)}</div></button>) : <div className="rounded-xl bg-slate-900/60 p-3 text-sm text-slate-400">No hay cuentas destacadas todavía.</div>}</div>
        </AdminCard>
        <AdminCard title="Negocios inactivos" actions={<Button size="sm" variant="ghost" onClick={() => navigate('/admin/alerts?kind=adoption')}>Abrir watchlist</Button>}>
          <div className="space-y-3">{overview.inactive_businesses.length > 0 ? overview.inactive_businesses.map((item) => <button key={item.id} onClick={() => navigate(`/admin/activity?business_id=${item.id}`)} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{item.name}</div><StatusBadge variant="warning">{plan(item.plan)}</StatusBadge></div><div className="mt-1 text-sm text-slate-400">{item.owner_email}</div><div className="mt-2 text-xs text-slate-500">{item.risk_flags.map(risk).join(' · ') || 'Sin actividad reciente'} · {ago(item.last_activity_at)}</div></button>) : <div className="rounded-xl bg-slate-900/60 p-3 text-sm text-slate-400">No hay cuentas inactivas priorizadas.</div>}</div>
        </AdminCard>
        <AdminCard title="Atajos operativos" actions={<Button size="sm" variant="ghost" onClick={() => navigate('/admin/users')}>Users</Button>}>
          <div className="space-y-3">
            <button onClick={() => navigate('/admin/alerts?severity=high')} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="font-medium text-white">Abrir alertas críticas</div><div className="mt-1 text-sm text-slate-400">Empieza por billing vencido, pagos fallidos y owners inactivos.</div></button>
            <button onClick={() => navigate('/admin/activity?action=failed_login')} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="font-medium text-white">Revisar actividad sensible</div><div className="mt-1 text-sm text-slate-400">Filtra accesos fallidos y eventos operativos relevantes.</div></button>
            <button onClick={() => navigate('/admin/businesses?status=at_risk')} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="font-medium text-white">Abrir Business 360 en riesgo</div><div className="mt-1 text-sm text-slate-400">Opera cuentas con señales activas y seguimiento pendiente.</div></button>
          </div>
        </AdminCard>
      </div>
    </div>
  );
};
