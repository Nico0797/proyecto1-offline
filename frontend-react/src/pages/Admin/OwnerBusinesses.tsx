import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, Copy, CreditCard, Loader2, Search, ShieldAlert, Sparkles, Store, Trash2, UserCog } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { AdminTable, Column } from '../../components/Admin/ui/AdminTable';
import { AdminCard } from '../../components/Admin/ui/AdminCard';
import { Modal } from '../../components/ui/Modal';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';
import { OwnerCenterNav } from '../../components/Admin/ui/OwnerCenterNav';
import { Button } from '../../components/ui/Button';

type RiskLevel = 'high' | 'medium' | 'low';
type StatusFilter = 'active' | 'inactive' | 'at_risk' | '';
type RiskFilter = 'high' | 'attention' | '';
type PlanFilter = 'free' | 'basic' | 'pro' | 'business' | '';

interface BusinessItem {
  id: number;
  name: string;
  currency: string;
  created_at: string;
  updated_at?: string;
  user_name: string;
  owner_email: string;
  plan: string;
  plan_status: string;
  membership_end?: string;
  membership_auto_renew: boolean;
  owner_last_login?: string;
  owner_is_active: boolean;
  sales_count: number;
  sales_total: number;
  sales_count_30d: number;
  sales_total_30d: number;
  expenses_total: number;
  customers_count: number;
  team_members_count: number;
  active_modules_count: number;
  events_30d: number;
  last_activity_at?: string;
  status: 'active' | 'inactive' | 'at_risk';
  risk_level: RiskLevel;
  risk_flags: string[];
}

interface BusinessesResponse {
  businesses: BusinessItem[];
  total: number;
  pages: number;
  current_page: number;
  summary: {
    active: number;
    inactive: number;
    at_risk: number;
    expiring_soon: number;
  };
}

interface DetailResponse {
  business: {
    id: number;
    name: string;
    currency: string;
    timezone?: string;
    created_at: string;
    updated_at?: string;
    monthly_sales_goal?: number;
  };
  owner: {
    id?: number;
    name?: string;
    email?: string;
    plan?: string;
    membership_plan?: string;
    membership_start?: string;
    membership_end?: string;
    membership_auto_renew: boolean;
    lifecycle_status?: string;
    last_login?: string;
    is_active: boolean;
  };
  revenue: {
    monthly_equivalent: number;
    arr_equivalent: number;
    latest_payment?: { id?: number; plan?: string; amount?: number; status?: string; payment_date?: string } | null;
    failed_payment_at?: string;
  };
  metrics: {
    sales_count: number;
    sales_total: number;
    sales_count_30d: number;
    sales_total_30d: number;
    expenses_total: number;
    payments_count_30d: number;
    customers_count: number;
    products_count: number;
    team_members_count: number;
    pending_invitations: number;
    unread_feedback: number;
    active_modules_count: number;
  };
  risk: {
    level: RiskLevel;
    flags: string[];
    last_activity_at?: string;
    health_score?: number;
  };
  quick_actions: Array<{ label: string; to: string; kind: string }>;
  owner_control: {
    admin_status: string;
    follow_up: boolean;
    high_priority: boolean;
    last_reason?: string;
    updated_at?: string;
    structured_notes: Array<{ id?: string; title?: string; body?: string; category?: string; reason?: string; created_at?: string; actor?: { name?: string; email?: string } }>;
  };
  notes: Array<{ id: number; note: string; created_at?: string }>;
  feedback: Array<{ id: number; type?: string; subject?: string; message?: string; status?: string; user_name?: string; created_at?: string }>;
  interventions: Array<{ id?: number; timestamp?: string; actor_name?: string; actor_email?: string; summary?: string; reason?: string; intervention_type?: string; before?: any; after?: any; metadata?: Record<string, any> }>;
  team_members: Array<{ id?: number; name?: string; user_name?: string; email?: string; user_email?: string; role?: string; status?: string }>;
  modules: Array<{ id?: number; module_key?: string; enabled?: boolean }>;
  recent_activity: Array<{ id: number; action?: string; entity?: string; summary?: string; timestamp?: string }>;
  recent_subscription_payments: Array<{ id?: number; plan?: string; amount?: number; status?: string; payment_date?: string }>;
}

const money = (value?: number | null) => `$${Number(value || 0).toLocaleString()}`;
const planLabel = (value?: string) => ({ free: 'Free', basic: 'Basic', pro: 'Pro', business: 'Business' }[value || ''] || value || 'Sin plan');
const riskLabel = (value: string) => ({ plan_expired: 'Plan vencido', plan_expiring: 'Vence pronto', auto_renew_off: 'Renovación apagada', failed_payment: 'Pago fallido', inactive_usage: 'Sin actividad', owner_inactive: 'Dueño inactivo' }[value] || value);
const statusLabel = (value?: string) => ({ active: 'Activa', inactive: 'Inactiva', at_risk: 'En riesgo', expired: 'Vencido', expiring_soon: 'Vence pronto', renewal_off: 'Renovación apagada', free: 'Free' }[value || ''] || value || 'N/A');
const lifecycleLabel = (value?: string) => ({ active: 'Activa', expiring_soon: 'Vence pronto', renewal_off: 'Renovación apagada', expired: 'Vencida', free: 'Free', manual: 'Manual' }[value || ''] || value || 'N/A');
const adminStatusLabel = (value?: string) => ({ normal: 'Normal', watchlist: 'Watchlist', priority: 'Prioridad', restricted_review: 'Revisión restringida' }[value || ''] || value || 'N/A');
const asArray = <T,>(value: T[] | null | undefined): T[] => Array.isArray(value) ? value : [];
const relativeDate = (value?: string) => {
  if (!value) return 'Sin actividad';
  const date = new Date(value);
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'Hoy';
  if (days === 1) return 'Hace 1 día';
  if (days < 30) return `Hace ${days} días`;
  return date.toLocaleDateString();
};

export const AdminBusinesses = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState<BusinessesResponse['summary']>({ active: 0, inactive: 0, at_risk: 0, expiring_soon: 0 });
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessItem | null>(null);
  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [autoOpenedBusinessId, setAutoOpenedBusinessId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [selectedPlanCode, setSelectedPlanCode] = useState('pro_monthly');
  const [selectedAdminStatus, setSelectedAdminStatus] = useState('normal');
  const [structuredTitle, setStructuredTitle] = useState('');
  const [structuredBody, setStructuredBody] = useState('');
  const [interventionSaving, setInterventionSaving] = useState(false);
  const itemsPerPage = 20;
  const search = searchParams.get('search') || '';
  const plan = (searchParams.get('plan') as PlanFilter) || '';
  const status = (searchParams.get('status') as StatusFilter) || '';
  const risk = (searchParams.get('risk') as RiskFilter) || '';
  const businessId = searchParams.get('business_id') || '';

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setPage(1);
    setSearchParams(next);
  };

  const normalizeBusinessItem = (item: Partial<BusinessItem>): BusinessItem => ({
    id: Number(item.id || 0),
    name: item.name || 'Negocio',
    currency: item.currency || 'COP',
    created_at: item.created_at || new Date().toISOString(),
    updated_at: item.updated_at,
    user_name: item.user_name || 'Sin owner',
    owner_email: item.owner_email || 'Sin email',
    plan: item.plan || 'free',
    plan_status: item.plan_status || 'free',
    membership_end: item.membership_end,
    membership_auto_renew: Boolean(item.membership_auto_renew),
    owner_last_login: item.owner_last_login,
    owner_is_active: item.owner_is_active ?? true,
    sales_count: Number(item.sales_count || 0),
    sales_total: Number(item.sales_total || 0),
    sales_count_30d: Number(item.sales_count_30d || 0),
    sales_total_30d: Number(item.sales_total_30d || 0),
    expenses_total: Number(item.expenses_total || 0),
    customers_count: Number(item.customers_count || 0),
    team_members_count: Number(item.team_members_count || 0),
    active_modules_count: Number(item.active_modules_count || 0),
    events_30d: Number(item.events_30d || 0),
    last_activity_at: item.last_activity_at,
    status: item.status || 'inactive',
    risk_level: item.risk_level || 'low',
    risk_flags: asArray(item.risk_flags),
  });

  const normalizeDetailResponse = (payload: DetailResponse): DetailResponse => ({
    ...payload,
    business: {
      id: payload?.business?.id || 0,
      name: payload?.business?.name || 'Negocio',
      currency: payload?.business?.currency || 'COP',
      timezone: payload?.business?.timezone,
      created_at: payload?.business?.created_at || new Date().toISOString(),
      updated_at: payload?.business?.updated_at,
      monthly_sales_goal: payload?.business?.monthly_sales_goal,
    },
    owner: {
      id: payload?.owner?.id,
      name: payload?.owner?.name || 'Sin owner',
      email: payload?.owner?.email || 'Sin email',
      plan: payload?.owner?.plan || 'free',
      membership_plan: payload?.owner?.membership_plan,
      membership_start: payload?.owner?.membership_start,
      membership_end: payload?.owner?.membership_end,
      membership_auto_renew: Boolean(payload?.owner?.membership_auto_renew),
      lifecycle_status: payload?.owner?.lifecycle_status || 'free',
      last_login: payload?.owner?.last_login,
      is_active: payload?.owner?.is_active ?? true,
    },
    revenue: {
      monthly_equivalent: Number(payload?.revenue?.monthly_equivalent || 0),
      arr_equivalent: Number(payload?.revenue?.arr_equivalent || 0),
      latest_payment: payload?.revenue?.latest_payment || null,
      failed_payment_at: payload?.revenue?.failed_payment_at,
    },
    metrics: {
      sales_count: Number(payload?.metrics?.sales_count || 0),
      sales_total: Number(payload?.metrics?.sales_total || 0),
      sales_count_30d: Number(payload?.metrics?.sales_count_30d || 0),
      sales_total_30d: Number(payload?.metrics?.sales_total_30d || 0),
      expenses_total: Number(payload?.metrics?.expenses_total || 0),
      payments_count_30d: Number(payload?.metrics?.payments_count_30d || 0),
      customers_count: Number(payload?.metrics?.customers_count || 0),
      products_count: Number(payload?.metrics?.products_count || 0),
      team_members_count: Number(payload?.metrics?.team_members_count || 0),
      pending_invitations: Number(payload?.metrics?.pending_invitations || 0),
      unread_feedback: Number(payload?.metrics?.unread_feedback || 0),
      active_modules_count: Number(payload?.metrics?.active_modules_count || 0),
    },
    quick_actions: asArray(payload?.quick_actions),
    notes: asArray(payload?.notes),
    feedback: asArray(payload?.feedback),
    interventions: asArray(payload?.interventions),
    team_members: asArray(payload?.team_members),
    modules: asArray(payload?.modules),
    recent_activity: asArray(payload?.recent_activity),
    recent_subscription_payments: asArray(payload?.recent_subscription_payments),
    risk: {
      level: payload?.risk?.level || 'low',
      flags: asArray(payload?.risk?.flags),
      last_activity_at: payload?.risk?.last_activity_at,
      health_score: payload?.risk?.health_score,
    },
    owner_control: {
      admin_status: payload?.owner_control?.admin_status || 'normal',
      follow_up: Boolean(payload?.owner_control?.follow_up),
      high_priority: Boolean(payload?.owner_control?.high_priority),
      last_reason: payload?.owner_control?.last_reason,
      updated_at: payload?.owner_control?.updated_at,
      structured_notes: asArray(payload?.owner_control?.structured_notes),
    },
  });

  const fetchBusinesses = async () => {
    try {
      setLoading(true);
      const res = await api.get<BusinessesResponse>('/admin/businesses', {
        params: { page, per_page: itemsPerPage, business_id: businessId || undefined, search: search || undefined, plan: plan || undefined, status: status || undefined, risk: risk || undefined },
      });
      setBusinesses(asArray(res.data.businesses).map(normalizeBusinessItem));
      setTotalPages(res.data.pages || 1);
      setTotalItems(res.data.total || 0);
      setSummary(res.data.summary || { active: 0, inactive: 0, at_risk: 0, expiring_soon: 0 });
    } catch (err) {
      console.error(err);
      toast.error('Error al cargar negocios');
    } finally {
      setLoading(false);
    }
  };

  const refreshDetail = async () => {
    if (!selectedBusiness) return;
    await openDetail(selectedBusiness);
  };

  const submitIntervention = async (payload: Record<string, unknown>, successMessage?: string) => {
    if (!selectedBusiness) return;
    if (!actionReason.trim() || actionReason.trim().length < 5) {
      toast.error('Debes registrar un motivo claro para la intervención');
      return;
    }

    try {
      setInterventionSaving(true);
      await api.post(`/admin/businesses/${selectedBusiness.id}/interventions`, { ...payload, reason: actionReason.trim() });
      toast.success(successMessage || 'Intervención registrada');
      setStructuredTitle('');
      setStructuredBody('');
      setActionReason('');
      await refreshDetail();
      fetchBusinesses();
    } catch (err) {
      console.error(err);
      toast.error('No se pudo registrar la intervención');
    } finally {
      setInterventionSaving(false);
    }
  };

  const closeDetail = () => {
    setSelectedBusiness(null);
    setDetail(null);
    setNoteDraft('');
    setActionReason('');
    setStructuredTitle('');
    setStructuredBody('');
  };

  useEffect(() => {
    fetchBusinesses();
  }, [page, search, plan, status, risk, businessId]);

  useEffect(() => {
    if (!businessId || businessId === autoOpenedBusinessId || businesses.length !== 1) return;
    if (String(businesses[0].id) !== String(businessId)) return;
    setAutoOpenedBusinessId(businessId);
    openDetail(businesses[0]);
  }, [businessId, businesses, autoOpenedBusinessId]);

  const openDetail = async (business: BusinessItem) => {
    try {
      setSelectedBusiness(business);
      setDetail(null);
      setNoteDraft('');
      setDetailLoading(true);
      const res = await api.get<DetailResponse>(`/admin/businesses/${business.id}/owner-detail`);
      const normalized = normalizeDetailResponse(res.data);
      setDetail(normalized);
      setSelectedPlanCode(normalized.owner.membership_plan || `${normalized.owner.plan || 'pro'}_monthly`);
      setSelectedAdminStatus(normalized.owner_control?.admin_status || 'normal');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cargar el detalle del negocio');
    } finally {
      setDetailLoading(false);
    }
  };

  const activeFilters = useMemo(() => [search, plan, status, risk, businessId].filter(Boolean).length, [search, plan, status, risk, businessId]);

  const handleCopyContext = async () => {
    if (!selectedBusiness || !detail) return;
    const text = [
      `Negocio: ${detail.business.name}`,
      `Owner: ${detail.owner.name || 'N/A'} <${detail.owner.email || 'N/A'}>`,
      `Plan: ${planLabel(detail.owner.plan)}`,
      `Riesgo: ${detail.risk.level}`,
      `Health score: ${detail.risk.health_score ?? 'N/A'}`,
      `Última actividad: ${relativeDate(detail.risk.last_activity_at)}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      toast.success('Contexto copiado');
    } catch {
      toast.error('No se pudo copiar');
    }
  };

  const createNote = async () => {
    if (!selectedBusiness || !noteDraft.trim()) return;
    try {
      setNoteSaving(true);
      const res = await api.post(`/admin/businesses/${selectedBusiness.id}/notes`, { note: noteDraft.trim() });
      setDetail((current) => current ? { ...current, notes: [res.data.note, ...(current.notes || [])] } : current);
      setNoteDraft('');
      toast.success('Nota interna guardada');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo guardar la nota');
    } finally {
      setNoteSaving(false);
    }
  };

  const deleteNote = async (noteId: number) => {
    if (!selectedBusiness) return;
    try {
      await api.delete(`/admin/businesses/${selectedBusiness.id}/notes/${noteId}`);
      setDetail((current) => current ? { ...current, notes: (current.notes || []).filter((note) => note.id !== noteId) } : current);
      toast.success('Nota eliminada');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo eliminar la nota');
    }
  };

  const columns: Column<BusinessItem>[] = [
    {
      header: 'Cuenta',
      cell: (b) => (
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-blue-500/10 p-2 text-blue-400"><Store size={18} /></div>
          <div>
            <div className="font-medium text-white">{b.name}</div>
            <div className="text-xs text-slate-500">{b.user_name} · {b.owner_email}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Estado',
      cell: (b) => (
        <div className="space-y-1">
          <StatusBadge variant={b.status === 'at_risk' ? 'error' : b.status === 'active' ? 'success' : 'warning'}>{statusLabel(b.status)}</StatusBadge>
          <div className="text-xs text-slate-500">{statusLabel(b.plan_status)}</div>
        </div>
      ),
    },
    {
      header: 'Plan',
      cell: (b) => (
        <div className="space-y-1">
          <StatusBadge variant={b.plan === 'business' ? 'purple' : b.plan === 'pro' ? 'warning' : 'neutral'}>{planLabel(b.plan)}</StatusBadge>
          <div className="text-xs text-slate-500">{b.membership_end ? new Date(b.membership_end).toLocaleDateString() : 'Sin renovación'}</div>
        </div>
      ),
    },
    {
      header: 'Señales',
      cell: (b) => (
        <div className="flex flex-wrap gap-2">
          {asArray(b.risk_flags).length > 0 ? asArray(b.risk_flags).slice(0, 2).map((flag) => <StatusBadge key={`${b.id}-${flag}`} variant={b.risk_level === 'high' ? 'error' : 'warning'}>{riskLabel(flag)}</StatusBadge>) : <StatusBadge variant="success">Sin alertas</StatusBadge>}
        </div>
      ),
    },
    {
      header: 'Uso 30d',
      cell: (b) => (
        <div className="text-sm text-slate-300">
          <div>{b.events_30d} eventos</div>
          <div className="text-xs text-slate-500">{b.sales_count_30d} ventas · {money(b.sales_total_30d)}</div>
        </div>
      ),
    },
    {
      header: 'Última actividad',
      align: 'right',
      cell: (b) => <span className="text-xs text-slate-400">{relativeDate(b.last_activity_at)}</span>,
    },
  ];

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader title="Gestión de cuentas" description="Seguimiento de negocios, riesgo comercial, renovación, adopción y señales operativas." actions={<div className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">{totalItems} cuentas · {activeFilters} filtros activos</div>} />

      <OwnerCenterNav />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AdminCard>
          <div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">Activas</div><div className="mt-2 text-3xl font-bold text-white">{summary.active}</div></div><CheckCircle2 className="h-5 w-5 text-emerald-400" /></div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">En riesgo</div><div className="mt-2 text-3xl font-bold text-white">{summary.at_risk}</div></div><ShieldAlert className="h-5 w-5 text-rose-400" /></div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">Inactivas</div><div className="mt-2 text-3xl font-bold text-white">{summary.inactive}</div></div><Clock3 className="h-5 w-5 text-amber-400" /></div>
        </AdminCard>
        <AdminCard>
          <div className="flex items-center justify-between"><div><div className="text-xs uppercase tracking-wider text-slate-500">Vencen pronto</div><div className="mt-2 text-3xl font-bold text-white">{summary.expiring_soon}</div></div><CreditCard className="h-5 w-5 text-blue-400" /></div>
        </AdminCard>
      </div>

      <AdminCard noPadding>
        <div className="grid grid-cols-1 gap-4 border-b border-white/10 p-4 xl:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.45fr))_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input value={search} onChange={(e) => updateFilter('search', e.target.value)} placeholder="Buscar por negocio, dueño o email" className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-white placeholder-slate-500 outline-none transition-colors focus:border-blue-500" />
          </div>
          <select value={plan} onChange={(e) => updateFilter('plan', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"><option value="">Todos los planes</option><option value="free">Free</option><option value="basic">Basic</option><option value="pro">Pro</option><option value="business">Business</option></select>
          <select value={status} onChange={(e) => updateFilter('status', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"><option value="">Todos los estados</option><option value="active">Activas</option><option value="inactive">Inactivas</option><option value="at_risk">En riesgo</option></select>
          <select value={risk} onChange={(e) => updateFilter('risk', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"><option value="">Todo riesgo</option><option value="attention">Con señales</option><option value="high">Riesgo alto</option></select>
          <Button variant="ghost" onClick={() => { setSearchParams(new URLSearchParams()); setPage(1); }}>Limpiar</Button>
        </div>

        <AdminTable columns={columns} data={businesses} isLoading={loading} onRowClick={openDetail} pagination={{ currentPage: page, totalPages, onPageChange: setPage, totalItems, itemsPerPage }} emptyMessage="No se encontraron cuentas con los filtros actuales" />
      </AdminCard>

      <Modal isOpen={!!selectedBusiness} onClose={closeDetail} title={selectedBusiness ? `Cuenta: ${selectedBusiness.name}` : 'Detalle de cuenta'} maxWidth="max-w-6xl">
        {detailLoading && <div className="flex h-52 items-center justify-center"><div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500"></div></div>}
        {!detailLoading && detail && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-800/70 p-4 lg:col-span-2">
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div>
                    <div className="text-lg font-bold text-white">{detail.business.name}</div>
                    <div className="mt-1 text-sm text-slate-400">{detail.owner.name} · {detail.owner.email}</div>
                  </div>
                  <StatusBadge variant={detail.risk.level === 'high' ? 'error' : detail.risk.level === 'medium' ? 'warning' : 'success'}>{detail.risk.level === 'high' ? 'Riesgo alto' : detail.risk.level === 'medium' ? 'Atención' : 'Saludable'}</StatusBadge>
                </div>
                <div className="mb-4 flex flex-wrap gap-2">
                  {(detail.quick_actions || []).map((action) => <Button key={`${action.kind}-${action.to}`} size="sm" variant="secondary" onClick={() => navigate(action.to)}>{action.label}<ArrowRight className="ml-2 h-4 w-4" /></Button>)}
                  <Button size="sm" variant="ghost" onClick={handleCopyContext}><Copy className="mr-2 h-4 w-4" />Copiar contexto</Button>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-slate-900/70 p-3"><div className="text-xs uppercase tracking-wider text-slate-500">Ventas totales</div><div className="mt-1 text-lg font-bold text-emerald-400">{money(detail.metrics.sales_total)}</div><div className="text-xs text-slate-500">{detail.metrics.sales_count} ventas</div></div>
                  <div className="rounded-xl bg-slate-900/70 p-3"><div className="text-xs uppercase tracking-wider text-slate-500">MRR equivalente</div><div className="mt-1 text-lg font-bold text-white">{money(detail.revenue.monthly_equivalent)}</div><div className="text-xs text-slate-500">ARR {money(detail.revenue.arr_equivalent)}</div></div>
                  <div className="rounded-xl bg-slate-900/70 p-3"><div className="text-xs uppercase tracking-wider text-slate-500">Ventas 30d</div><div className="mt-1 text-lg font-bold text-white">{money(detail.metrics.sales_total_30d)}</div><div className="text-xs text-slate-500">{detail.metrics.sales_count_30d} ventas</div></div>
                  <div className="rounded-xl bg-slate-900/70 p-3"><div className="text-xs uppercase tracking-wider text-slate-500">Health score</div><div className="mt-1 text-lg font-bold text-white">{detail.risk.health_score ?? 0}/100</div><div className="text-xs text-slate-500">{detail.metrics.pending_invitations} invitaciones pendientes</div></div>
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-slate-800/70 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white"><UserCog className="h-4 w-4" />Lifecycle & owner control</div>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between"><span className="text-slate-400">Plan</span><StatusBadge variant={detail.owner.plan === 'business' ? 'purple' : detail.owner.plan === 'pro' ? 'warning' : 'neutral'}>{planLabel(detail.owner.plan)}</StatusBadge></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Lifecycle</span><StatusBadge variant={detail.owner.lifecycle_status === 'expired' ? 'error' : detail.owner.lifecycle_status === 'expiring_soon' || detail.owner.lifecycle_status === 'renewal_off' ? 'warning' : 'success'}>{lifecycleLabel(detail.owner.lifecycle_status)}</StatusBadge></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Fin membresía</span><span className="text-white">{detail.owner.membership_end ? new Date(detail.owner.membership_end).toLocaleDateString() : 'N/A'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Auto renew</span><span className="text-white">{detail.owner.membership_auto_renew ? 'Activo' : 'Apagado'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Admin status</span><StatusBadge variant={detail.owner_control.admin_status === 'priority' ? 'error' : detail.owner_control.admin_status === 'watchlist' || detail.owner_control.admin_status === 'restricted_review' ? 'warning' : 'neutral'}>{adminStatusLabel(detail.owner_control.admin_status)}</StatusBadge></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Prioridad</span><span className="text-white">{detail.owner_control.high_priority ? 'Alta' : 'Normal'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Seguimiento</span><span className="text-white">{detail.owner_control.follow_up ? 'Activo' : 'No'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Último acceso</span><span className="text-white">{relativeDate(detail.owner.last_login)}</span></div>
                  <div className="flex items-center justify-between"><span className="text-slate-400">Actividad negocio</span><span className="text-white">{relativeDate(detail.risk.last_activity_at)}</span></div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">{detail.risk.flags.length > 0 ? detail.risk.flags.map((flag) => <StatusBadge key={flag} variant={detail.risk.level === 'high' ? 'error' : 'warning'}>{riskLabel(flag)}</StatusBadge>) : <StatusBadge variant="success">Sin alertas</StatusBadge>}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
              <AdminCard title="Revenue & support snapshot">
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/70 p-3"><span className="text-slate-400">ARR</span><span className="font-semibold text-white">{money(detail.revenue.arr_equivalent)}</span></div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/70 p-3"><span className="text-slate-400">Pago fallido</span><span className="font-semibold text-white">{detail.revenue.failed_payment_at ? new Date(detail.revenue.failed_payment_at).toLocaleDateString() : 'No'}</span></div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/70 p-3"><span className="text-slate-400">Cobros 30d</span><span className="font-semibold text-white">{detail.metrics.payments_count_30d}</span></div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/70 p-3"><span className="text-slate-400">Gastos totales</span><span className="font-semibold text-rose-400">{money(detail.metrics.expenses_total)}</span></div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/70 p-3"><span className="text-slate-400">Feedback unread</span><span className="font-semibold text-white">{detail.metrics.unread_feedback}</span></div>
                  <div className="flex items-center justify-between rounded-xl bg-slate-900/70 p-3"><span className="text-slate-400">Módulos activos</span><span className="font-semibold text-white">{detail.metrics.active_modules_count}</span></div>
                </div>
              </AdminCard>

              <AdminCard title="Intervenciones rápidas" className="xl:col-span-2">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
                    <div className="rounded-xl bg-slate-900/70 p-3">
                      <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Cambiar plan</div>
                      <div className="flex gap-2">
                        <select value={selectedPlanCode} onChange={(e) => setSelectedPlanCode(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
                          {['basic_monthly', 'basic_quarterly', 'basic_annual', 'pro_monthly', 'pro_quarterly', 'pro_annual', 'business_monthly', 'business_quarterly', 'business_annual'].map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                        <Button size="sm" onClick={() => submitIntervention({ action: 'change_plan', plan_code: selectedPlanCode }, 'Plan actualizado')} disabled={interventionSaving}>Aplicar</Button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-900/70 p-3">
                      <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Renovación</div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => submitIntervention({ action: 'extend_membership', days: 7 }, 'Membresía extendida 7 días')} disabled={interventionSaving}>+7 días</Button>
                        <Button size="sm" variant="secondary" onClick={() => submitIntervention({ action: 'extend_membership', days: 30 }, 'Membresía extendida 30 días')} disabled={interventionSaving}>+30 días</Button>
                        <Button size="sm" variant="secondary" onClick={() => submitIntervention({ action: 'toggle_auto_renew', enabled: !detail.owner.membership_auto_renew }, detail.owner.membership_auto_renew ? 'Auto renew desactivado' : 'Auto renew activado')} disabled={interventionSaving}>{detail.owner.membership_auto_renew ? 'Apagar renew' : 'Activar renew'}</Button>
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-900/70 p-3">
                      <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Estado administrativo</div>
                      <div className="flex gap-2">
                        <select value={selectedAdminStatus} onChange={(e) => setSelectedAdminStatus(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
                          {['normal', 'watchlist', 'priority', 'restricted_review'].map((item) => <option key={item} value={item}>{adminStatusLabel(item)}</option>)}
                        </select>
                        <Button size="sm" onClick={() => submitIntervention({ action: 'set_admin_status', admin_status: selectedAdminStatus }, 'Estado administrativo actualizado')} disabled={interventionSaving}>Guardar</Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_auto_auto]">
                    <textarea value={actionReason} onChange={(e) => setActionReason(e.target.value)} placeholder="Motivo obligatorio de la intervención owner" className="min-h-[84px] w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500" />
                    <Button variant="secondary" onClick={() => submitIntervention({ action: 'set_priority', high_priority: !detail.owner_control.high_priority, follow_up: true }, detail.owner_control.high_priority ? 'Cuenta desmarcada de prioridad' : 'Cuenta marcada como prioridad')} disabled={interventionSaving}>{interventionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}{detail.owner_control.high_priority ? 'Quitar prioridad' : 'Marcar prioridad'}</Button>
                    <Button variant={detail.owner.is_active ? 'danger' : 'secondary'} onClick={() => submitIntervention({ action: 'set_owner_active', is_active: !detail.owner.is_active }, detail.owner.is_active ? 'Owner desactivado' : 'Owner activado')} disabled={interventionSaving}>{detail.owner.is_active ? 'Desactivar owner' : 'Activar owner'}</Button>
                  </div>

                  <div className="rounded-2xl border border-white/5 bg-slate-950/50 p-4">
                    <div className="mb-3 text-sm font-semibold text-white">Nota estructurada owner</div>
                    <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,0.35fr)_minmax(0,1fr)_auto]">
                      <input value={structuredTitle} onChange={(e) => setStructuredTitle(e.target.value)} placeholder="Título" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500" />
                      <input value={structuredBody} onChange={(e) => setStructuredBody(e.target.value)} placeholder="Detalle accionable, contexto o soporte" className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500" />
                      <Button onClick={() => submitIntervention({ action: 'add_structured_note', title: structuredTitle, body: structuredBody, category: 'owner_support' }, 'Nota estructurada agregada')} disabled={interventionSaving || !structuredTitle.trim() || !structuredBody.trim()}>Guardar nota</Button>
                    </div>
                  </div>
                </div>
              </AdminCard>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <AdminCard title="Equipo">
                <div className="space-y-3">{detail.team_members.length > 0 ? detail.team_members.slice(0, 6).map((member, idx) => <div key={member.id || idx} className="flex items-center justify-between rounded-xl bg-slate-900/70 p-3 text-sm"><div><div className="font-medium text-white">{member.user_name || member.name || 'Usuario'}</div><div className="text-xs text-slate-500">{member.user_email || member.email || 'Sin email'}</div></div><StatusBadge variant={member.status === 'active' ? 'success' : 'warning'}>{member.role || member.status || 'Miembro'}</StatusBadge></div>) : <div className="rounded-xl bg-slate-900/70 p-3 text-sm text-slate-400">Sin miembros de equipo.</div>}</div>
              </AdminCard>

              <AdminCard title="Módulos">
                <div className="flex flex-wrap gap-2">{detail.modules.length > 0 ? detail.modules.map((module, idx) => <StatusBadge key={module.id || `${module.module_key}-${idx}`} variant={module.enabled ? 'success' : 'neutral'}>{module.module_key || 'module'}</StatusBadge>) : <div className="rounded-xl bg-slate-900/70 p-3 text-sm text-slate-400">Sin módulos configurados.</div>}</div>
              </AdminCard>

              <AdminCard title="Feedback reciente">
                <div className="space-y-3">{detail.feedback.length > 0 ? detail.feedback.map((item) => <div key={item.id} className="rounded-xl bg-slate-900/70 p-3 text-sm"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{item.subject || 'Feedback'}</div><StatusBadge variant={item.status === 'unread' ? 'warning' : 'neutral'}>{item.status || 'N/A'}</StatusBadge></div><div className="mt-1 text-slate-400">{item.message}</div><div className="mt-2 text-xs text-slate-500">{item.user_name || 'Usuario'} · {item.created_at ? new Date(item.created_at).toLocaleString() : ''}</div></div>) : <div className="rounded-xl bg-slate-900/70 p-3 text-sm text-slate-400">Sin feedback reciente.</div>}</div>
              </AdminCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <AdminCard title="Actividad reciente">
                <div className="space-y-3">{detail.recent_activity.length > 0 ? detail.recent_activity.map((item) => <div key={item.id} className="rounded-xl bg-slate-900/70 p-3"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{item.action || 'Evento'}</div><div className="text-xs text-slate-500">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</div></div><div className="mt-1 text-sm text-slate-400">{item.summary || item.entity || 'Sin detalle'}</div></div>) : <div className="rounded-xl bg-slate-900/70 p-3 text-sm text-slate-400">No hay actividad reciente.</div>}</div>
              </AdminCard>

              <AdminCard title="Pagos de suscripción">
                <div className="space-y-3">{detail.recent_subscription_payments.length > 0 ? detail.recent_subscription_payments.map((payment, idx) => <div key={payment.id || idx} className="flex items-center justify-between rounded-xl bg-slate-900/70 p-3 text-sm"><div><div className="font-medium text-white">{payment.plan || 'Plan'}</div><div className="text-xs text-slate-500">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : 'Sin fecha'}</div></div><div className="text-right"><div className="font-semibold text-white">{money(payment.amount)}</div><StatusBadge variant={payment.status === 'completed' ? 'success' : payment.status === 'failed' ? 'error' : 'warning'}>{payment.status || 'unknown'}</StatusBadge></div></div>) : <div className="rounded-xl bg-slate-900/70 p-3 text-sm text-slate-400">No hay pagos recientes.</div>}</div>
              </AdminCard>

              <AdminCard title="Structured notes">
                <div className="space-y-3">{detail.owner_control.structured_notes.length > 0 ? detail.owner_control.structured_notes.map((note, idx) => <div key={note.id || idx} className="rounded-xl bg-slate-900/70 p-3 text-sm"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{note.title || 'Nota'}</div><StatusBadge variant="info">{note.category || 'general'}</StatusBadge></div><div className="mt-1 text-slate-400">{note.body}</div><div className="mt-2 text-xs text-slate-500">{note.actor?.name || note.actor?.email || 'Admin'} · {note.created_at ? new Date(note.created_at).toLocaleString() : ''}</div></div>) : <div className="rounded-xl bg-slate-900/70 p-3 text-sm text-slate-400">Sin notas estructuradas.</div>}</div>
              </AdminCard>

              <AdminCard title="Historial de intervenciones">
                <div className="space-y-3">{detail.interventions.length > 0 ? detail.interventions.map((item, idx) => <div key={item.id || idx} className="rounded-xl bg-slate-900/70 p-3 text-sm"><div className="flex items-center justify-between gap-3"><div className="font-medium text-white">{item.summary || 'Intervención'}</div><div className="text-xs text-slate-500">{item.timestamp ? new Date(item.timestamp).toLocaleString() : ''}</div></div><div className="mt-1 text-slate-400">{item.reason || item.intervention_type || 'Sin motivo registrado'}</div><div className="mt-2 text-xs text-slate-500">{item.actor_name || item.actor_email || 'Admin'}</div></div>) : <div className="rounded-xl bg-slate-900/70 p-3 text-sm text-slate-400">Sin intervenciones owner todavía.</div>}</div>
              </AdminCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <AdminCard title="Notas internas owner">
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} maxLength={280} placeholder="Registrar seguimiento, contexto o próxima acción" className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder-slate-500 outline-none focus:border-blue-500" />
                    <Button size="sm" onClick={createNote} disabled={noteSaving || !noteDraft.trim()}>Guardar</Button>
                  </div>
                  <div className="text-right text-xs text-slate-500">{noteDraft.length}/280</div>
                  <div className="space-y-2">{detail.notes.length > 0 ? detail.notes.map((note) => <div key={note.id} className="rounded-xl bg-slate-900/70 p-3 text-sm"><div className="flex items-start justify-between gap-3"><div><div className="text-slate-200">{note.note}</div><div className="mt-1 text-xs text-slate-500">{note.created_at ? new Date(note.created_at).toLocaleString() : ''}</div></div><button onClick={() => deleteNote(note.id)} className="rounded-lg p-2 text-slate-500 transition hover:bg-white/5 hover:text-rose-300"><Trash2 className="h-4 w-4" /></button></div></div>) : <div className="rounded-xl bg-slate-900/70 p-3 text-sm text-slate-400">Sin notas internas todavía.</div>}</div>
                </div>
              </AdminCard>

              <AdminCard title="Resumen de soporte">
                <div className="space-y-3 text-sm">
                  <div className="rounded-xl bg-slate-900/70 p-3 text-slate-300">Última razón owner control: {detail.owner_control.last_reason || 'Sin razón registrada'}</div>
                  <div className="rounded-xl bg-slate-900/70 p-3 text-slate-300">Último update owner control: {detail.owner_control.updated_at ? new Date(detail.owner_control.updated_at).toLocaleString() : 'Sin actualización'}</div>
                  <div className="rounded-xl bg-slate-900/70 p-3 text-slate-300">Latest subscription payment: {detail.revenue.latest_payment?.plan || 'Sin pago'} · {detail.revenue.latest_payment?.payment_date ? new Date(detail.revenue.latest_payment.payment_date).toLocaleDateString() : 'N/A'}</div>
                  <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-3 text-slate-300">Todas las acciones owner de este panel exigen motivo y quedan auditadas.</div>
                </div>
              </AdminCard>
            </div>

            <div className="flex justify-end"><Button variant="secondary" onClick={closeDetail}>Cerrar</Button></div>
          </div>
        )}
        {!detailLoading && !detail && selectedBusiness && <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm text-rose-200">No se pudo cargar el detalle de soporte para esta cuenta.</div>}
      </Modal>
    </div>
  );
};
