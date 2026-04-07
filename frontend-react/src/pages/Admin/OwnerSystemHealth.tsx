import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowRight, HeartPulse, MessageSquareWarning, ShieldAlert, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { AdminCard } from '../../components/Admin/ui/AdminCard';
import { OwnerCenterNav } from '../../components/Admin/ui/OwnerCenterNav';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

interface SignalItem {
  id: string;
  label: string;
  value: number;
  severity: 'high' | 'medium' | 'low';
  route: string;
}

interface SupportIssue {
  business_id: number;
  business_name: string;
  owner_email: string;
  health_score: number;
  risk_flags: string[];
  unread_feedback: number;
  pending_invitations: number;
  events_30d: number;
  last_activity_at?: string;
  route: string;
}

interface HealthResponse {
  summary: {
    status: 'healthy' | 'attention' | 'critical';
    failed_logins_30d: number;
    access_denied_30d: number;
    unread_feedback_total: number;
    pending_invitations_total: number;
    accounts_with_recurring_issues: number;
    report_export_telemetry_available: boolean;
  };
  support_issues: SupportIssue[];
  signals: { security: SignalItem[]; support: SignalItem[] };
  limitations: { exports: string; sync: string };
}

const riskLabel = (value: string) => ({ plan_expired: 'Plan vencido', plan_expiring: 'Vence pronto', auto_renew_off: 'Renovación apagada', failed_payment: 'Pago fallido', inactive_usage: 'Sin actividad', owner_inactive: 'Owner inactivo' }[value] || value);
const healthVariant = { healthy: 'success', attention: 'warning', critical: 'error' } as const;
const signalVariant = { high: 'error', medium: 'warning', low: 'info' } as const;

export const AdminSystemHealth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<HealthResponse | null>(null);

  useEffect(() => {
    setLoading(true);
    api.get<HealthResponse>('/admin/system-health')
      .then((res) => setPayload(res.data))
      .catch((err) => {
        console.error(err);
        setPayload(null);
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="Support & System Health Center"
        description="Visibilidad de soporte, seguridad y cuentas con fricción operativa usando señales persistidas reales."
        actions={payload ? <StatusBadge variant={healthVariant[payload.summary.status]} icon>{payload.summary.status === 'healthy' ? 'Saludable' : payload.summary.status === 'attention' ? 'Atención' : 'Crítico'}</StatusBadge> : null}
      />

      <OwnerCenterNav />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminCard><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">Logins fallidos 30d</div><div className="mt-2 text-3xl font-bold text-white">{payload?.summary.failed_logins_30d || 0}</div></div><ShieldAlert className="h-5 w-5 text-rose-400" /></div></AdminCard>
        <AdminCard><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">Accesos denegados</div><div className="mt-2 text-3xl font-bold text-white">{payload?.summary.access_denied_30d || 0}</div></div><Activity className="h-5 w-5 text-amber-400" /></div></AdminCard>
        <AdminCard><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">Feedback sin leer</div><div className="mt-2 text-3xl font-bold text-white">{payload?.summary.unread_feedback_total || 0}</div></div><MessageSquareWarning className="h-5 w-5 text-blue-400" /></div></AdminCard>
        <AdminCard><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">Cuentas con issues</div><div className="mt-2 text-3xl font-bold text-white">{payload?.summary.accounts_with_recurring_issues || 0}</div></div><HeartPulse className="h-5 w-5 text-violet-400" /></div></AdminCard>
      </div>

      {loading ? (
        <div className="flex h-52 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" /></div>
      ) : !payload ? (
        <AdminCard><div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">No se pudo cargar el Health Center.</div></AdminCard>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <AdminCard title="Security signals" className="xl:col-span-1">
              <div className="space-y-3">{payload.signals.security.map((signal) => <button key={signal.id} onClick={() => navigate(signal.route)} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{signal.label}</div><StatusBadge variant={signalVariant[signal.severity]}>{signal.value}</StatusBadge></div><div className="mt-2 text-xs text-slate-500">Abrir contexto</div></button>)}</div>
            </AdminCard>

            <AdminCard title="Support signals" className="xl:col-span-1">
              <div className="space-y-3">{payload.signals.support.map((signal) => <button key={signal.id} onClick={() => navigate(signal.route)} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{signal.label}</div><StatusBadge variant={signalVariant[signal.severity]}>{signal.value}</StatusBadge></div><div className="mt-2 text-xs text-slate-500">Ir a bandeja</div></button>)}</div>
            </AdminCard>

            <AdminCard title="Cobertura disponible" className="xl:col-span-1">
              <div className="space-y-3 text-sm">
                <div className="rounded-xl bg-slate-900/60 p-3 text-slate-300">{payload.limitations.exports}</div>
                <div className="rounded-xl bg-slate-900/60 p-3 text-slate-300">{payload.limitations.sync}</div>
                <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-slate-300">El centro usa solo señales reales persistidas: auditoría, feedback, invitaciones y billing.</div>
              </div>
            </AdminCard>
          </div>

          <AdminCard title="Support watchlist" actions={<Button size="sm" variant="secondary" onClick={() => navigate('/admin/businesses?risk=attention')}>Abrir Business 360</Button>}>
            <div className="space-y-3">
              {payload.support_issues.length > 0 ? payload.support_issues.map((item) => (
                <div key={item.business_id} className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2"><div className="text-lg font-semibold text-white">{item.business_name}</div><StatusBadge variant={item.health_score <= 60 ? 'error' : 'warning'}>Score {item.health_score}</StatusBadge></div>
                      <div className="mt-1 text-sm text-slate-400">{item.owner_email}</div>
                    </div>
                    <Button size="sm" variant="secondary" onClick={() => navigate(item.route)}>Abrir cuenta <ArrowRight className="h-4 w-4" /></Button>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    <div className="rounded-xl bg-slate-950/70 p-3"><div className="text-xs text-slate-500">Feedback unread</div><div className="mt-1 font-semibold text-white">{item.unread_feedback}</div></div>
                    <div className="rounded-xl bg-slate-950/70 p-3"><div className="text-xs text-slate-500">Invitaciones pendientes</div><div className="mt-1 font-semibold text-white">{item.pending_invitations}</div></div>
                    <div className="rounded-xl bg-slate-950/70 p-3"><div className="text-xs text-slate-500">Eventos 30d</div><div className="mt-1 font-semibold text-white">{item.events_30d}</div></div>
                    <div className="rounded-xl bg-slate-950/70 p-3"><div className="text-xs text-slate-500">Última actividad</div><div className="mt-1 font-semibold text-white">{item.last_activity_at ? new Date(item.last_activity_at).toLocaleDateString() : 'N/A'}</div></div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">{item.risk_flags.length > 0 ? item.risk_flags.map((flag) => <StatusBadge key={`${item.business_id}-${flag}`} variant={flag === 'failed_payment' || flag === 'plan_expired' ? 'error' : 'warning'}>{riskLabel(flag)}</StatusBadge>) : <StatusBadge variant="success">Sin flags</StatusBadge>}</div>
                </div>
              )) : <div className="rounded-2xl bg-slate-900/60 p-4 text-sm text-slate-400">No hay cuentas con issues recurrentes ahora mismo.</div>}
            </div>
          </AdminCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <button onClick={() => navigate('/admin/activity?action=failed_login')} className="rounded-2xl border border-white/5 bg-slate-800/50 p-5 text-left transition hover:border-white/10 hover:bg-slate-800"><ShieldAlert className="mb-3 h-5 w-5 text-rose-400" /><div className="font-semibold text-white">Revisar seguridad</div><div className="mt-1 text-sm text-slate-400">Abre failed login y accesos denegados recientes.</div></button>
            <button onClick={() => navigate('/admin/alerts?kind=support')} className="rounded-2xl border border-white/5 bg-slate-800/50 p-5 text-left transition hover:border-white/10 hover:bg-slate-800"><AlertTriangle className="mb-3 h-5 w-5 text-amber-400" /><div className="font-semibold text-white">Cruzar con Alerts Center</div><div className="mt-1 text-sm text-slate-400">Usa soporte y churn para priorizar intervención comercial.</div></button>
            <button onClick={() => navigate('/admin/businesses')} className="rounded-2xl border border-white/5 bg-slate-800/50 p-5 text-left transition hover:border-white/10 hover:bg-slate-800"><Users className="mb-3 h-5 w-5 text-blue-400" /><div className="font-semibold text-white">Operar Business 360</div><div className="mt-1 text-sm text-slate-400">Actúa sobre cuentas con owner notes, risk flags y revenue context.</div></button>
          </div>
        </>
      )}
    </div>
  );
};
