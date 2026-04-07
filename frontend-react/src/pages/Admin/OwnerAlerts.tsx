import { useEffect, useMemo, useState } from 'react';
import { BellRing, Search } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { AdminCard } from '../../components/Admin/ui/AdminCard';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';
import { OwnerCenterNav } from '../../components/Admin/ui/OwnerCenterNav';
import { Button } from '../../components/ui/Button';

interface AlertItem {
  id: string;
  severity: 'high' | 'medium' | 'low';
  kind: 'billing' | 'adoption' | 'support' | 'churn' | string;
  state: 'open';
  business_id: number;
  business_name: string;
  owner_email: string;
  owner_name: string;
  plan: string;
  reason: string;
  title: string;
  cta_to: string;
  cta_label: string;
  last_activity_at?: string;
  sales_total_30d: number;
  sales_count_30d: number;
  events_30d: number;
  created_at: string;
}

interface AlertsResponse {
  alerts: AlertItem[];
  summary: Record<string, number>;
  filters: {
    severity: string[];
    kind: string[];
    state: string[];
  };
}

interface BusinessOption {
  id: number;
  name: string;
}

const severityVariant = {
  high: 'error',
  medium: 'warning',
  low: 'info',
} as const;

const severityLabel = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
} as const;

const kindLabel = (kind: string) => ({ billing: 'Billing', adoption: 'Adopción', support: 'Soporte', churn: 'Churn' }[kind] || kind);

export const AdminAlerts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const [loading, setLoading] = useState(true);

  const severity = searchParams.get('severity') || '';
  const kind = searchParams.get('kind') || '';
  const state = searchParams.get('state') || 'open';
  const businessId = searchParams.get('business_id') || '';
  const search = searchParams.get('search') || '';

  useEffect(() => {
    api.get('/admin/businesses', { params: { page: 1, per_page: 100 } })
      .then((res) => setBusinesses((res?.data?.businesses || []).map((item: any) => ({ id: item.id, name: item.name }))))
      .catch(() => setBusinesses([]));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/admin/alerts', { params: { severity: severity || undefined, kind: kind || undefined, state: state || undefined, business_id: businessId || undefined, search: search || undefined } })
      .then((res) => {
        const payload: AlertsResponse = res?.data || { alerts: [], summary: {}, filters: { severity: [], kind: [], state: [] } };
        setAlerts(payload.alerts || []);
        setSummary(payload.summary || {});
      })
      .catch((err) => {
        console.error(err);
        setAlerts([]);
        setSummary({});
      })
      .finally(() => setLoading(false));
  }, [severity, kind, state, businessId, search]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const grouped = useMemo(() => ({
    urgent: alerts.filter((item) => item.severity === 'high').slice(0, 4),
    watchlist: alerts.filter((item) => item.severity !== 'high').slice(0, 4),
  }), [alerts]);

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="Alerts & Risk Center"
        description="Bandeja operativa priorizada para detectar riesgo comercial, churn, billing y soporte."
        actions={<div className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">{alerts.length} alertas abiertas</div>}
      />

      <OwnerCenterNav />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminCard><div className="text-xs uppercase tracking-wider text-slate-500">Alta severidad</div><div className="mt-2 text-3xl font-bold text-white">{summary.high || 0}</div></AdminCard>
        <AdminCard><div className="text-xs uppercase tracking-wider text-slate-500">Billing</div><div className="mt-2 text-3xl font-bold text-white">{summary.billing || 0}</div></AdminCard>
        <AdminCard><div className="text-xs uppercase tracking-wider text-slate-500">Adopción</div><div className="mt-2 text-3xl font-bold text-white">{summary.adoption || 0}</div></AdminCard>
        <AdminCard><div className="text-xs uppercase tracking-wider text-slate-500">Churn</div><div className="mt-2 text-3xl font-bold text-white">{summary.churn || 0}</div></AdminCard>
      </div>

      <AdminCard noPadding>
        <div className="grid grid-cols-1 gap-3 border-b border-white/10 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.45fr)_minmax(0,0.45fr)_minmax(0,0.55fr)_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Buscar negocio u owner" className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-white placeholder-slate-500 outline-none focus:border-blue-500" />
          </div>
          <select value={businessId} onChange={(e) => updateFilter('business_id', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
            <option value="">Todos los negocios</option>
            {businesses.map((business) => <option key={business.id} value={String(business.id)}>{business.name}</option>)}
          </select>
          <select value={severity} onChange={(e) => updateFilter('severity', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
            <option value="">Todas las severidades</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
          <select value={kind} onChange={(e) => updateFilter('kind', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
            <option value="">Todos los tipos</option>
            <option value="billing">Billing</option>
            <option value="adoption">Adopción</option>
            <option value="support">Soporte</option>
            <option value="churn">Churn</option>
          </select>
          <Button variant="ghost" onClick={() => setSearchParams(new URLSearchParams({ state: 'open' }))}>Limpiar</Button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" /></div>
          ) : alerts.length === 0 ? (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-sm text-emerald-200">No hay alertas abiertas para los filtros actuales.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <StatusBadge variant={severityVariant[alert.severity]}>{severityLabel[alert.severity]}</StatusBadge>
                    <StatusBadge variant="neutral">{kindLabel(alert.kind)}</StatusBadge>
                    <span className="text-xs text-slate-500">{alert.business_name}</span>
                  </div>
                  <div className="font-medium text-white">{alert.title}</div>
                  <div className="mt-1 text-sm text-slate-400">{alert.reason}</div>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-xl bg-slate-950/70 p-3 text-xs">
                    <div><div className="text-slate-500">Owner</div><div className="mt-1 text-slate-200">{alert.owner_email}</div></div>
                    <div><div className="text-slate-500">Eventos 30d</div><div className="mt-1 text-slate-200">{alert.events_30d}</div></div>
                    <div><div className="text-slate-500">Ventas 30d</div><div className="mt-1 text-slate-200">{alert.sales_count_30d}</div></div>
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-xs text-slate-500">{alert.last_activity_at ? `Última actividad ${new Date(alert.last_activity_at).toLocaleDateString()}` : 'Sin actividad registrada'}</div>
                    <Button size="sm" variant="secondary" onClick={() => navigate(alert.cta_to)}>{alert.cta_label}</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <AdminCard title="Urgente hoy">
          <div className="space-y-3">{grouped.urgent.length > 0 ? grouped.urgent.map((item) => <button key={item.id} onClick={() => navigate(item.cta_to)} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{item.business_name}</div><StatusBadge variant="error">Alta</StatusBadge></div><div className="mt-1 text-sm text-slate-400">{item.reason}</div></button>) : <div className="rounded-xl bg-slate-900/60 p-3 text-sm text-slate-400">Sin alertas críticas.</div>}</div>
        </AdminCard>
        <AdminCard title="Watchlist">
          <div className="space-y-3">{grouped.watchlist.length > 0 ? grouped.watchlist.map((item) => <button key={item.id} onClick={() => navigate(item.cta_to)} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{item.business_name}</div><StatusBadge variant={severityVariant[item.severity]}>{severityLabel[item.severity]}</StatusBadge></div><div className="mt-1 text-sm text-slate-400">{item.reason}</div></button>) : <div className="rounded-xl bg-slate-900/60 p-3 text-sm text-slate-400">Sin alertas de seguimiento.</div>}</div>
        </AdminCard>
      </div>

      <div className="rounded-2xl border border-white/5 bg-slate-800/40 p-4 text-sm text-slate-400">
        <div className="mb-2 flex items-center gap-2 text-slate-200"><BellRing className="h-4 w-4" /> Qué revisar hoy</div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded-xl bg-slate-900/60 p-3">Prioriza cuentas con severidad alta y billing vencido.</div>
          <div className="rounded-xl bg-slate-900/60 p-3">Revisa churn cuando haya plan pago con poca actividad real.</div>
          <div className="rounded-xl bg-slate-900/60 p-3">Combina esta bandeja con Activity para entender el contexto antes de actuar.</div>
        </div>
      </div>
    </div>
  );
};
