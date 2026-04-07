import { useEffect, useMemo, useState } from 'react';
import { Filter, Search, User } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { AdminPageHeader } from '../../components/Admin/ui/AdminPageHeader';
import { AdminCard } from '../../components/Admin/ui/AdminCard';
import { AdminTable, Column } from '../../components/Admin/ui/AdminTable';
import { StatusBadge } from '../../components/Admin/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { OwnerCenterNav } from '../../components/Admin/ui/OwnerCenterNav';
import { Button } from '../../components/ui/Button';

interface ActivityLog {
  id: number;
  business_id?: number;
  business_name?: string;
  user_email?: string;
  actor_name?: string;
  actor_role?: string;
  action: string;
  entity: string;
  entity_type?: string;
  entity_id?: number;
  module?: string;
  summary?: string;
  details?: any;
  timestamp: string;
}

interface ActivityResponse {
  logs: ActivityLog[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
  legacy_mode?: boolean;
  warning?: string;
  filters?: {
    business_filter_available?: boolean;
    module_filter_available?: boolean;
    actor_filter_available?: boolean;
    actions?: Array<{ value: string; count: number }>;
    modules?: Array<{ value: string; count: number }>;
  };
}

interface BusinessOption {
  id: number;
  name: string;
}

const actionVariant = (action: string) => {
  if (action === 'delete' || action === 'failed_login' || action === 'access_denied') return 'error' as const;
  if (action === 'create') return 'success' as const;
  if (action === 'update') return 'warning' as const;
  if (action === 'login' || action === 'logout') return 'purple' as const;
  return 'info' as const;
};

export const AdminActivity = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<ActivityLog | null>(null);
  const [filtersMeta, setFiltersMeta] = useState<ActivityResponse['filters']>({});
  const [legacyWarning, setLegacyWarning] = useState('');
  const [businesses, setBusinesses] = useState<BusinessOption[]>([]);
  const perPage = 20;

  const businessId = searchParams.get('business_id') || '';
  const action = searchParams.get('action') || '';
  const module = searchParams.get('module') || '';
  const actor = searchParams.get('actor') || '';

  useEffect(() => {
    api.get('/admin/businesses', { params: { page: 1, per_page: 100 } })
      .then((res) => setBusinesses((res?.data?.businesses || []).map((item: any) => ({ id: item.id, name: item.name }))))
      .catch(() => setBusinesses([]));
  }, []);

  useEffect(() => {
    const params: Record<string, string | number> = { page, per_page: perPage };
    if (businessId) params.business_id = businessId;
    if (action) params.action = action;
    if (module) params.module = module;
    if (actor) params.actor = actor;

    setLoading(true);
    api.get('/admin/activity', { params })
      .then((res) => {
        const payload: ActivityResponse = res?.data || { logs: [], total: 0, page: 1, per_page: perPage, pages: 1 };
        setLogs(payload.logs || []);
        setTotal(payload.total || 0);
        setPages(payload.pages || 1);
        setFiltersMeta(payload.filters || {});
        setLegacyWarning(payload.warning || '');
      })
      .catch((err) => {
        console.error(err);
        setLogs([]);
      })
      .finally(() => setLoading(false));
  }, [page, businessId, action, module, actor]);

  const updateFilter = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete('page');
    setPage(1);
    setSearchParams(next);
  };

  const columns: Column<ActivityLog>[] = useMemo(() => [
    {
      header: 'Actor',
      cell: (item) => (
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-700 text-slate-300">
            <User className="h-4 w-4" />
          </div>
          <div>
            <div className="font-medium text-white">{item.actor_name || item.user_email || 'Sistema'}</div>
            <div className="text-xs text-slate-500">{item.actor_role || item.user_email || 'Evento interno'}</div>
          </div>
        </div>
      ),
    },
    {
      header: 'Acción',
      cell: (item) => <StatusBadge variant={actionVariant(item.action)}>{item.action}</StatusBadge>,
    },
    {
      header: 'Entidad',
      cell: (item) => (
        <div>
          <div className="text-slate-200">{item.entity_type || item.entity}</div>
          <div className="text-xs text-slate-500">#{item.entity_id || 'N/A'} · {item.module || 'general'}</div>
        </div>
      ),
    },
    {
      header: 'Negocio',
      cell: (item) => <span className="text-sm text-slate-300">{item.business_name || 'Plataforma'}</span>,
    },
    {
      header: 'Detalle',
      cell: (item) => <span className="line-clamp-2 max-w-xs text-sm text-slate-400">{item.summary || 'Sin resumen adicional'}</span>,
    },
    {
      header: 'Fecha',
      align: 'right',
      cell: (item) => <span className="text-xs text-slate-400">{new Date(item.timestamp).toLocaleString()}</span>,
    },
  ], []);

  return (
    <div className="space-y-6 pb-10">
      <AdminPageHeader
        title="Activity & Audit Center"
        description="Trazabilidad operativa de la plataforma con filtros por cuenta, módulo, actor y acción."
        actions={<div className="rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400">{total} eventos</div>}
      />

      <OwnerCenterNav />

      {legacyWarning && <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">{legacyWarning}</div>}

      <AdminCard noPadding>
        <div className="grid grid-cols-1 gap-3 border-b border-white/10 p-4 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,0.5fr)_minmax(0,0.5fr)_minmax(0,0.7fr)_auto]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={actor}
              onChange={(e) => updateFilter('actor', e.target.value)}
              placeholder="Buscar actor o email"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 py-2 pl-10 pr-4 text-white placeholder-slate-500 outline-none focus:border-blue-500"
            />
          </div>
          <select value={businessId} onChange={(e) => updateFilter('business_id', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" disabled={!filtersMeta?.business_filter_available}>
            <option value="">Todos los negocios</option>
            {businesses.map((business) => <option key={business.id} value={String(business.id)}>{business.name}</option>)}
          </select>
          <select value={module} onChange={(e) => updateFilter('module', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500" disabled={!filtersMeta?.module_filter_available}>
            <option value="">Todos los módulos</option>
            {(filtersMeta?.modules || []).map((item) => <option key={item.value} value={item.value}>{item.value}</option>)}
          </select>
          <select value={action} onChange={(e) => updateFilter('action', e.target.value)} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-blue-500">
            <option value="">Todas las acciones</option>
            {(filtersMeta?.actions || []).map((item) => <option key={item.value} value={item.value}>{item.value}</option>)}
          </select>
          <Button variant="ghost" onClick={() => { setSearchParams(new URLSearchParams()); setPage(1); }}>
            <Filter className="h-4 w-4" />
            Limpiar
          </Button>
        </div>

        <AdminTable
          columns={columns}
          data={logs}
          isLoading={loading}
          emptyMessage="No hay actividad para los filtros actuales"
          onRowClick={setSelectedLog}
          pagination={{ currentPage: page, totalPages: pages, onPageChange: setPage, totalItems: total, itemsPerPage: perPage }}
        />
      </AdminCard>

      <Modal isOpen={!!selectedLog} onClose={() => setSelectedLog(null)} title="Detalle de actividad" maxWidth="max-w-3xl">
        {selectedLog && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-wider text-slate-500">Actor</div>
                <div className="mt-1 font-medium text-white">{selectedLog.actor_name || selectedLog.user_email || 'Sistema'}</div>
                <div className="text-sm text-slate-400">{selectedLog.actor_role || 'Sin rol registrado'}</div>
              </div>
              <div className="rounded-xl bg-slate-900/70 p-4">
                <div className="text-xs uppercase tracking-wider text-slate-500">Contexto</div>
                <div className="mt-1 font-medium text-white">{selectedLog.business_name || 'Plataforma'}</div>
                <div className="text-sm text-slate-400">{selectedLog.module || 'general'} · {new Date(selectedLog.timestamp).toLocaleString()}</div>
              </div>
            </div>
            <div className="rounded-xl bg-slate-900/70 p-4">
              <div className="mb-2 flex items-center gap-2">
                <StatusBadge variant={actionVariant(selectedLog.action)}>{selectedLog.action}</StatusBadge>
                <span className="text-sm text-slate-300">{selectedLog.entity_type || selectedLog.entity} #{selectedLog.entity_id || 'N/A'}</span>
              </div>
              <div className="text-sm text-slate-400">{selectedLog.summary || 'Sin resumen adicional disponible.'}</div>
            </div>
            <div className="rounded-xl bg-slate-950/80 p-4">
              <div className="mb-2 text-xs uppercase tracking-wider text-slate-500">Metadata</div>
              <pre className="max-h-[320px] overflow-auto whitespace-pre-wrap break-words text-xs text-slate-300">{JSON.stringify(selectedLog.details || {}, null, 2)}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
