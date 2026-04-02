import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CreditCard, DollarSign, RefreshCw, Search, TrendingDown, TrendingUp } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { AdminCard } from '../../components/Admin/ui/AdminCard';
import { OwnerCenterNav } from '../../components/Admin/ui/OwnerCenterNav';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';
import { Button } from '../../components/ui/Button';

interface RevenueRow {
  business_id: number;
  business_name: string;
  owner_id: number;
  owner_name: string;
  owner_email: string;
  plan: string;
  membership_plan?: string;
  billing_cycle: string;
  lifecycle_status: string;
  membership_start?: string;
  membership_end?: string;
  membership_auto_renew: boolean;
  monthly_equivalent: number;
  arr_equivalent: number;
  failed_payment_at?: string;
  last_activity_at?: string;
  sales_total_30d: number;
  sales_count_30d: number;
  events_30d: number;
  health_score: number;
  churn_risk: boolean;
  risk_flags: string[];
  lifetime_membership_income: number;
  latest_payment?: { id?: number; plan?: string; amount?: number; status?: string; payment_date?: string } | null;
  latest_plan_change?: { current_plan?: string; previous_plan?: string; changed_at?: string; direction?: 'upgrade' | 'downgrade' | null };
}

interface RevenueResponse {
  summary: {
    range_days: number;
    mrr: number;
    arr: number;
    active_paid_accounts: number;
    expiring_soon_count: number;
    failed_payments_count: number;
    upgrades_recent: number;
    downgrades_recent: number;
    trial_supported: boolean;
    trial_accounts: number | null;
  };
  plan_distribution: Record<string, number>;
  rows: RevenueRow[];
  high_value_accounts: RevenueRow[];
  churn_watchlist: RevenueRow[];
  filters: { plan: string[]; status: string[]; range_days: number[] };
}

const money = (value?: number | null) => `$${Number(value || 0).toLocaleString()}`;
const planLabel = (value?: string) => ({ basic: 'Basic', pro: 'Pro', business: 'Business' }[value || ''] || value || 'N/A');
const cycleLabel = (value?: string) => ({ monthly: 'Mensual', quarterly: 'Trimestral', annual: 'Anual' }[value || ''] || value || 'N/A');
const statusLabel = (value?: string) => ({ active: 'Activa', expiring_soon: 'Vence pronto', renewal_off: 'Renovación apagada', expired: 'Vencida', free: 'Free', manual: 'Manual' }[value || ''] || value || 'N/A');
const riskLabel = (value: string) => ({ plan_expired: 'Plan vencido', plan_expiring: 'Vence pronto', auto_renew_off: 'Renovación apagada', failed_payment: 'Pago fallido', inactive_usage: 'Sin actividad', owner_inactive: 'Owner inactivo', churn_risk: 'Churn risk' }[value] || value);

export const AdminRevenue = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState<RevenueResponse | null>(null);

  const search = searchParams.get('search') || '';
  const plan = searchParams.get('plan') || '';
  const status = searchParams.get('status') || '';
  const rangeDays = Number(searchParams.get('range_days') || 30);

  useEffect(() => {
    setLoading(true);
    api.get<RevenueResponse>('/admin/revenue', { params: { search: search || undefined, plan: plan || undefined, status: status || undefined, range_days: rangeDays || undefined } })
      .then((res) => setPayload(res.data))
      .catch((err) => {
        console.error(err);
        setPayload(null);
      })
      .finally(() => setLoading(false));
  }, [search, plan, status, rangeDays]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next);
  };

  const planDistribution = useMemo(() => Object.entries(payload?.plan_distribution || {}).sort((a, b) => b[1] - a[1]), [payload]);

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="Revenue & Lifecycle Control"
        description="MRR, ARR, cambios de plan, renovación y churn usando membresías y pagos reales."
        actions={<div className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">{payload?.rows.length || 0} cuentas evaluadas</div>}
      />

      <OwnerCenterNav />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminCard><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">MRR real/equivalente</div><div className="mt-2 text-3xl font-bold text-white">{money(payload?.summary.mrr)}</div></div><DollarSign className="h-5 w-5 text-emerald-400" /></div></AdminCard>
        <AdminCard><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">ARR equivalente</div><div className="mt-2 text-3xl font-bold text-white">{money(payload?.summary.arr)}</div></div><TrendingUp className="h-5 w-5 text-blue-400" /></div></AdminCard>
        <AdminCard><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">Cuentas pagas activas</div><div className="mt-2 text-3xl font-bold text-white">{payload?.summary.active_paid_accounts || 0}</div></div><CreditCard className="h-5 w-5 text-violet-400" /></div></AdminCard>
        <AdminCard><div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">Vencen / fallan</div><div className="mt-2 text-3xl font-bold text-white">{(payload?.summary.expiring_soon_count || 0) + (payload?.summary.failed_payments_count || 0)}</div></div><RefreshCw className="h-5 w-5 text-amber-400" /></div></AdminCard>
      </div>

      <AdminCard noPadding>
        <div className="grid grid-cols-1 gap-3 border-b border-white/10 p-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.4fr)_minmax(0,0.5fr)_minmax(0,0.45fr)_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Buscar negocio u owner" className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-white placeholder-slate-500 outline-none focus:border-blue-500" />
          </div>
          <select value={plan} onChange={(e) => updateFilter('plan', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
            <option value="">Todos los planes</option>
            {(payload?.filters.plan || ['basic', 'pro', 'business']).map((item) => <option key={item} value={item}>{planLabel(item)}</option>)}
          </select>
          <select value={status} onChange={(e) => updateFilter('status', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
            <option value="">Todos los estados lifecycle</option>
            {(payload?.filters.status || []).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
          <select value={String(rangeDays)} onChange={(e) => updateFilter('range_days', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
            {(payload?.filters.range_days || [30, 60, 90, 180]).map((item) => <option key={item} value={String(item)}>{item} días</option>)}
          </select>
          <Button variant="ghost" onClick={() => setSearchParams(new URLSearchParams({ range_days: '30' }))}>Limpiar</Button>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="flex h-40 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-500" /></div>
          ) : !payload ? (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">No se pudo cargar el Revenue Center.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <AdminCard title="Watchlist de churn" className="xl:col-span-1">
                <div className="space-y-3">{payload.churn_watchlist.length > 0 ? payload.churn_watchlist.map((item) => <button key={item.business_id} onClick={() => navigate(`/admin/businesses?business_id=${item.business_id}`)} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{item.business_name}</div><StatusBadge variant={item.failed_payment_at ? 'error' : item.churn_risk ? 'warning' : 'neutral'}>{item.failed_payment_at ? 'Pago fallido' : item.churn_risk ? 'Churn' : statusLabel(item.lifecycle_status)}</StatusBadge></div><div className="mt-1 text-sm text-slate-400">{item.owner_email}</div><div className="mt-2 text-xs text-slate-500">MRR {money(item.monthly_equivalent)} · score {item.health_score}</div></button>) : <div className="rounded-xl bg-slate-900/60 p-3 text-sm text-slate-400">Sin cuentas priorizadas.</div>}</div>
              </AdminCard>

              <AdminCard title="Top revenue accounts" className="xl:col-span-1">
                <div className="space-y-3">{payload.high_value_accounts.length > 0 ? payload.high_value_accounts.map((item) => <button key={item.business_id} onClick={() => navigate(`/admin/businesses?business_id=${item.business_id}`)} className="w-full rounded-xl border border-white/5 bg-slate-900/60 p-3 text-left transition hover:border-white/10"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{item.business_name}</div><StatusBadge variant={item.plan === 'business' ? 'purple' : item.plan === 'pro' ? 'warning' : 'neutral'}>{planLabel(item.plan)}</StatusBadge></div><div className="mt-1 text-sm text-slate-400">{item.owner_email}</div><div className="mt-2 text-xs text-slate-500">MRR {money(item.monthly_equivalent)} · ARR {money(item.arr_equivalent)}</div></button>) : <div className="rounded-xl bg-slate-900/60 p-3 text-sm text-slate-400">Sin cuentas con revenue suficiente.</div>}</div>
              </AdminCard>

              <AdminCard title="Cambios y mezcla" className="xl:col-span-1">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3"><span className="text-slate-400">Upgrades ventana</span><span className="font-semibold text-emerald-400">{payload.summary.upgrades_recent}</span></div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/60 p-3"><span className="text-slate-400">Downgrades ventana</span><span className="font-semibold text-rose-400">{payload.summary.downgrades_recent}</span></div>
                  <div className="rounded-xl bg-slate-900/60 p-3"><div className="mb-2 text-slate-400">Distribución por plan</div><div className="space-y-2">{planDistribution.map(([key, count]) => <div key={key} className="flex items-center justify-between"><span className="text-slate-300">{planLabel(key)}</span><span className="font-semibold text-white">{count}</span></div>)}</div></div>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-slate-300">{payload.summary.trial_supported ? `Trials activos: ${payload.summary.trial_accounts || 0}` : 'Este proyecto no expone trials reales; la vista evita inventar esa métrica.'}</div>
                </div>
              </AdminCard>
            </div>
          )}
        </div>
      </AdminCard>

      {!loading && payload && (
        <AdminCard title="Revenue drilldown">
          <div className="space-y-3">
            {payload.rows.length > 0 ? payload.rows.map((item) => (
              <div key={item.business_id} className="rounded-2xl border border-white/5 bg-slate-900/60 p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-lg font-semibold text-white">{item.business_name}</div>
                      <StatusBadge variant={item.plan === 'business' ? 'purple' : item.plan === 'pro' ? 'warning' : 'neutral'}>{planLabel(item.plan)}</StatusBadge>
                      <StatusBadge variant={item.failed_payment_at ? 'error' : item.churn_risk ? 'warning' : 'info'}>{statusLabel(item.lifecycle_status)}</StatusBadge>
                    </div>
                    <div className="mt-1 text-sm text-slate-400">{item.owner_name} · {item.owner_email}</div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {item.latest_plan_change?.direction === 'upgrade' && <StatusBadge variant="success"><TrendingUp className="h-3.5 w-3.5" />Upgrade</StatusBadge>}
                    {item.latest_plan_change?.direction === 'downgrade' && <StatusBadge variant="error"><TrendingDown className="h-3.5 w-3.5" />Downgrade</StatusBadge>}
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/admin/businesses?business_id=${item.business_id}`)}>Abrir Business 360 <ArrowRight className="h-4 w-4" /></Button>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-6">
                  <div className="rounded-xl bg-slate-950/70 p-3"><div className="text-xs text-slate-500">MRR</div><div className="mt-1 font-semibold text-white">{money(item.monthly_equivalent)}</div></div>
                  <div className="rounded-xl bg-slate-950/70 p-3"><div className="text-xs text-slate-500">ARR</div><div className="mt-1 font-semibold text-white">{money(item.arr_equivalent)}</div></div>
                  <div className="rounded-xl bg-slate-950/70 p-3"><div className="text-xs text-slate-500">Ciclo</div><div className="mt-1 font-semibold text-white">{cycleLabel(item.billing_cycle)}</div></div>
                  <div className="rounded-xl bg-slate-950/70 p-3"><div className="text-xs text-slate-500">Renueva</div><div className="mt-1 font-semibold text-white">{item.membership_end ? new Date(item.membership_end).toLocaleDateString() : 'N/A'}</div></div>
                  <div className="rounded-xl bg-slate-950/70 p-3"><div className="text-xs text-slate-500">Ventas 30d</div><div className="mt-1 font-semibold text-white">{item.sales_count_30d} · {money(item.sales_total_30d)}</div></div>
                  <div className="rounded-xl bg-slate-950/70 p-3"><div className="text-xs text-slate-500">Health</div><div className="mt-1 font-semibold text-white">{item.health_score}/100</div></div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">{item.risk_flags.length > 0 ? item.risk_flags.map((flag) => <StatusBadge key={`${item.business_id}-${flag}`} variant={flag === 'failed_payment' || flag === 'plan_expired' ? 'error' : 'warning'}>{riskLabel(flag)}</StatusBadge>) : <StatusBadge variant="success">Sin señales</StatusBadge>}</div>
              </div>
            )) : <div className="rounded-2xl bg-slate-900/60 p-4 text-sm text-slate-400">No hay cuentas para los filtros actuales.</div>}
          </div>
        </AdminCard>
      )}
    </div>
  );
};
