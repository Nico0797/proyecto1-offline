import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, RefreshCw, Search } from 'lucide-react';
import api from '../../services/api';
import { useBusinessStore } from '../../store/businessStore';

interface PresentedAuditEntry {
  id: number;
  module?: string | null;
  category: string;
  action?: string | null;
  action_label: string;
  title: string;
  summary: string;
  highlights: string[];
  extra_changes_count?: number;
  actor: string;
  actor_role?: string | null;
  timestamp?: string | null;
  source_path?: string | null;
  source_label?: string | null;
}

const MODULE_OPTIONS = [
  { value: '', label: 'Todos los módulos' },
  { value: 'sales', label: 'Ventas' },
  { value: 'accounts_receivable', label: 'Pagos y cobros' },
  { value: 'customers', label: 'Clientes' },
  { value: 'products', label: 'Productos' },
  { value: 'raw_inventory', label: 'Inventario y bodega' },
  { value: 'team', label: 'Equipo y permisos' },
  { value: 'settings', label: 'Configuración' },
];

const ACTION_OPTIONS = [
  { value: '', label: 'Todas las acciones' },
  { value: 'create', label: 'Creación' },
  { value: 'update', label: 'Actualización' },
  { value: 'delete', label: 'Eliminación' },
  { value: 'adjust', label: 'Ajuste' },
  { value: 'pay', label: 'Pago' },
  { value: 'invite', label: 'Invitación' },
  { value: 'assign', label: 'Asignación' },
];

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const BusinessAuditTab = () => {
  const { activeBusiness } = useBusinessStore();
  const [entries, setEntries] = useState<PresentedAuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [moduleFilter, setModuleFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [query, setQuery] = useState('');
  const [expandedEntries, setExpandedEntries] = useState<number[]>([]);

  const fetchLogs = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const params = new URLSearchParams({
        page: String(page),
        per_page: '20',
      });
      if (moduleFilter) params.set('module', moduleFilter);
      if (actionFilter) params.set('action', actionFilter);
      if (query.trim()) params.set('q', query.trim());

      const response = await api.get(`/businesses/${activeBusiness.id}/audit?${params.toString()}`);
      const nextEntries = Array.isArray(response.data?.entries) ? response.data.entries : [];
      setEntries(nextEntries);
      setPages(Math.max(Number(response.data?.pages) || 1, 1));
      setTotal(Number(response.data?.total) || 0);
      setWarning(response.data?.warning || null);
      setExpandedEntries([]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'No pude cargar el historial del negocio.');
      setEntries([]);
      setPages(1);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchLogs();
  }, [activeBusiness?.id, page, moduleFilter, actionFilter, query]);

  const hasFilters = Boolean(moduleFilter || actionFilter || query.trim());

  const expandedSet = useMemo(() => new Set(expandedEntries), [expandedEntries]);

  const toggleExpanded = (entryId: number) => {
    setExpandedEntries((current) =>
      current.includes(entryId) ? current.filter((id) => id !== entryId) : [...current, entryId]
    );
  };

  if (!activeBusiness) {
    return null;
  }

  return (
    <div className="app-surface rounded-[28px] p-4 sm:p-6">
      <div className="app-section-stack border-b app-divider pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <h3 className="text-xl font-bold app-text">Historial del negocio</h3>
            <p className="max-w-3xl text-sm app-text-muted">
              Consulta una bitácora clara de cambios en configuración, módulos, equipo y otros ajustes relevantes,
              sin exponer detalles técnicos del sistema.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchLogs()}
            disabled={loading}
            className="theme-button-secondary inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition hover:bg-[color:var(--app-button-secondary-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Recargar
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          <label className="space-y-2 text-sm app-text-secondary">
            <span>Módulo</span>
            <select
              value={moduleFilter}
              onChange={(event) => {
                setModuleFilter(event.target.value);
                setPage(1);
              }}
              className="app-select"
            >
              {MODULE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm app-text-secondary">
            <span>Acción</span>
            <select
              value={actionFilter}
              onChange={(event) => {
                setActionFilter(event.target.value);
                setPage(1);
              }}
              className="app-select"
            >
              {ACTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-2 text-sm app-text-secondary lg:col-span-2">
            <span>Buscar en el historial</span>
            <div className="app-field-surface flex items-center gap-2 rounded-xl px-3 py-2">
              <Search className="h-4 w-4 app-text-muted" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Actor, cambio, módulo o acción"
                className="w-full bg-transparent text-sm app-text outline-none"
              />
            </div>
          </label>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm app-text-muted">
          <span>{total} eventos registrados</span>
          <span>
            Página {page} de {pages}
          </span>
        </div>
      </div>

      {error && <div className="app-banner-danger mt-4 px-4 py-3 text-sm">{error}</div>}

      {!error && warning && <div className="app-banner-warning mt-4 px-4 py-3 text-sm">{warning}</div>}

      {loading ? (
        <div className="mt-8 flex items-center justify-center gap-3 py-10 text-sm app-text-secondary">
          <Loader2 className="h-5 w-5 animate-spin" />
          Cargando historial...
        </div>
      ) : entries.length === 0 ? (
        <div className="app-empty-state mt-6 rounded-2xl px-4 py-10 text-center text-sm app-text-muted">
          {hasFilters
            ? 'No encontré eventos para los filtros actuales.'
            : 'Aún no hay eventos registrados para este negocio.'}
        </div>
      ) : (
        <div className="app-content-stack mt-6">
          {entries.map((entry) => {
            const visibleHighlights = entry.highlights.slice(0, 3);
            const hiddenHighlights = entry.highlights.slice(3);
            const isExpanded = expandedSet.has(entry.id);

            return (
              <article key={entry.id} className="app-soft-surface rounded-3xl p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-xs app-text-muted">
                      <span className="app-chip rounded-full px-2.5 py-1 uppercase tracking-wide">{entry.category}</span>
                      <span className="app-status-chip-info uppercase tracking-wide">{entry.action_label}</span>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-base font-semibold app-text sm:text-lg">{entry.title}</h4>
                      <p className="text-sm leading-6 app-text-secondary">{entry.summary}</p>
                    </div>

                    {visibleHighlights.length > 0 && (
                      <div className="rounded-2xl border app-divider bg-[color:var(--app-surface-muted)]/70 p-3">
                        <div className="mb-2 text-xs font-semibold uppercase tracking-wide app-text-muted">
                          Cambios principales
                        </div>
                        <ul className="space-y-2 text-sm app-text-secondary">
                          {visibleHighlights.map((highlight) => (
                            <li key={highlight} className="flex gap-2">
                              <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[color:var(--app-accent)]" />
                              <span>{highlight}</span>
                            </li>
                          ))}
                          {isExpanded &&
                            hiddenHighlights.map((highlight) => (
                              <li key={highlight} className="flex gap-2">
                                <span className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-[color:var(--app-accent)]" />
                                <span>{highlight}</span>
                              </li>
                            ))}
                        </ul>

                        {hiddenHighlights.length > 0 && (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(entry.id)}
                            className="mt-3 inline-flex items-center gap-1 text-sm font-medium app-text"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-4 w-4" />
                                Ocultar detalle
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-4 w-4" />
                                Ver {hiddenHighlights.length} cambio{hiddenHighlights.length === 1 ? '' : 's'} más
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 flex-col items-start gap-2 text-sm app-text-muted lg:items-end">
                    <span>{formatDateTime(entry.timestamp)}</span>
                    <span className="text-right">
                      {entry.actor}
                      {entry.actor_role ? ` · ${entry.actor_role}` : ''}
                    </span>
                    {entry.source_path && (
                      <a
                        href={entry.source_path}
                        className="inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium app-text hover:bg-[color:var(--app-button-secondary-hover)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        {entry.source_label || 'Ver origen'}
                      </a>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 border-t app-divider pt-4">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(current - 1, 1))}
          disabled={page <= 1 || loading}
          className="theme-button-secondary rounded-xl border px-3 py-2 text-sm transition hover:bg-[color:var(--app-button-secondary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Anterior
        </button>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(current + 1, pages))}
          disabled={page >= pages || loading}
          className="theme-button-secondary rounded-xl border px-3 py-2 text-sm transition hover:bg-[color:var(--app-button-secondary-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};
