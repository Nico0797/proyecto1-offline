import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Clock3, RefreshCw, RotateCcw, ShieldAlert, Trash2, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Button } from '../ui/Button';
import { ElevatedCard } from '../ui/ElevatedCard';
import { IconContainer } from '../ui/IconContainer';
import { AppStatusBadge } from '../ui/AppStatusBadge';
import { TeachingEmptyState } from '../ui/TeachingEmptyState';
import { useBusinessStore } from '../../store/businessStore';
import { useOfflineSyncStore } from '../../store/offlineSyncStore';
import { offlineSyncService, OFFLINE_SYNC_EVENT } from '../../services/offlineSyncService';
import { offlineDb, type PendingSyncOperation, type SyncErrorCategory, type SyncOperationStatus } from '../../services/offlineDb';
import { getSyncPresentation } from '../Sync/syncStatus';

const STATUS_META: Record<SyncOperationStatus, { label: string; tone: 'info' | 'success' | 'warning' | 'danger' }> = {
  pending: {
    label: 'En cola',
    tone: 'warning',
  },
  syncing: {
    label: 'Sincronizando',
    tone: 'info',
  },
  synced: {
    label: 'Completada',
    tone: 'success',
  },
  failed: {
    label: 'Fallo',
    tone: 'danger',
  },
  blocked: {
    label: 'Bloqueada',
    tone: 'warning',
  },
  conflicted: {
    label: 'Conflicto',
    tone: 'danger',
  },
};

const ENTITY_LABELS: Record<PendingSyncOperation['entityType'], string> = {
  invoice: 'Factura',
  sale: 'Venta',
  payment: 'Cobro',
  customer: 'Cliente',
  product: 'Producto',
};

const ACTION_LABELS: Record<string, string> = {
  create: 'Crear',
  update: 'Actualizar',
  status_update: 'Cambiar estado',
  payment_create: 'Registrar pago',
  delete: 'Eliminar',
};

const CATEGORY_LABELS: Record<SyncErrorCategory, string> = {
  network_unavailable: 'Sin conexion',
  server_unavailable: 'Servidor no disponible',
  validation_rejected: 'Validacion rechazada',
  business_rule_rejected: 'Regla de negocio',
  conflict_detected: 'Conflicto detectado',
  parent_missing: 'Dependencia pendiente',
  unexpected_server_error: 'Error inesperado',
};

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
};

const getEntityLabel = (operation: PendingSyncOperation) => {
  if (operation.entityLabel) {
    return operation.entityLabel;
  }

  const prefix = ENTITY_LABELS[operation.entityType] || 'Registro';
  return `${prefix} #${operation.entityId}`;
};

const buildSummaryCards = (operations: PendingSyncOperation[]) => {
  const summary = operations.reduce(
    (acc, operation) => {
      acc[operation.status] += 1;
      return acc;
    },
    { pending: 0, syncing: 0, failed: 0, blocked: 0, conflicted: 0, synced: 0 },
  );

  return [
    {
      label: 'Pendientes',
      value: summary.pending + summary.syncing,
      tone: 'warning' as const,
      helper: 'Esperando envio o en proceso',
    },
    {
      label: 'Conflictos',
      value: summary.conflicted,
      tone: 'danger' as const,
      helper: 'Necesitan revision manual',
    },
    {
      label: 'Fallos',
      value: summary.failed,
      tone: 'danger' as const,
      helper: 'Errores recuperables',
    },
    {
      label: 'Bloqueadas',
      value: summary.blocked,
      tone: 'info' as const,
      helper: 'Dependen de otra operacion',
    },
  ];
};

type SyncCenterPanelProps = {
  embedded?: boolean;
};

export const SyncCenterPanel = ({ embedded = false }: SyncCenterPanelProps) => {
  const { activeBusiness } = useBusinessStore();
  const {
    enabled,
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    conflictedCount,
    blockedCount,
    lastSyncAt,
    lastError,
    syncNow,
    refresh: refreshStore,
  } = useOfflineSyncStore();
  const [operations, setOperations] = useState<PendingSyncOperation[]>([]);
  const [loading, setLoading] = useState(false);

  const presentation = getSyncPresentation({
    enabled,
    isOnline,
    isSyncing,
    pendingCount,
    failedCount,
    conflictedCount,
    blockedCount,
    lastSyncAt,
    lastError,
  });

  const loadOperations = async () => {
    if (!activeBusiness) return;
    setLoading(true);
    try {
      const nextOperations = (await offlineDb.listSyncOperations(activeBusiness.id))
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setOperations(nextOperations);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOperations();
  }, [activeBusiness?.id]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleChange = () => {
      void loadOperations();
    };

    window.addEventListener(OFFLINE_SYNC_EVENT, handleChange);
    return () => window.removeEventListener(OFFLINE_SYNC_EVENT, handleChange);
  }, [activeBusiness?.id]);

  const summaryCards = useMemo(() => buildSummaryCards(operations), [operations]);
  const retryableOperationIds = operations
    .filter((operation) => ['failed', 'blocked', 'conflicted'].includes(operation.status))
    .map((operation) => operation.id);

  const handleRetry = async (operationId: string) => {
    if (!activeBusiness) return;

    await offlineSyncService.retrySyncOperation(operationId);
    await refreshStore(activeBusiness.id);
    await loadOperations();

    if (isOnline) {
      await syncNow(activeBusiness.id, 'auto');
      await loadOperations();
    }
  };

  const handleRetryAll = async () => {
    if (!activeBusiness || retryableOperationIds.length === 0) return;

    for (const operationId of retryableOperationIds) {
      await offlineSyncService.retrySyncOperation(operationId);
    }

    await refreshStore(activeBusiness.id);
    await loadOperations();

    if (isOnline) {
      await syncNow(activeBusiness.id, 'manual');
      await loadOperations();
    }
  };

  const handleDismiss = async (operationId: string) => {
    await offlineSyncService.dismissSyncOperation(operationId);
    if (activeBusiness) {
      await refreshStore(activeBusiness.id);
    }
    await loadOperations();
  };

  const handleDiscard = async (operationId: string) => {
    try {
      await offlineSyncService.discardInvoicePendingChanges(operationId);
      toast.success('Se descartaron los cambios locales y se restauro la version del servidor.');
      if (activeBusiness) {
        await refreshStore(activeBusiness.id);
      }
      await loadOperations();
    } catch (error: any) {
      toast.error(error?.message || 'No fue posible descartar los cambios locales.');
    }
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      <ElevatedCard tone="sync" className="overflow-hidden">
        <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <IconContainer
              icon={!isOnline ? WifiOff : presentation.tone === 'danger' ? AlertTriangle : Clock3}
              tone="sync"
              size="lg"
            />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold tracking-tight app-text sm:text-lg">
                  {embedded ? 'Estado local' : 'Estado local y respaldo'}
                </h3>
                <AppStatusBadge
                  tone={
                    presentation.tone === 'danger'
                      ? 'danger'
                      : presentation.tone === 'warning'
                        ? 'warning'
                        : presentation.tone === 'info'
                          ? 'info'
                          : 'success'
                  }
                >
                  {presentation.label}
                </AppStatusBadge>
              </div>
              <p className="mt-1 text-sm leading-6 app-text-muted">{presentation.detail}</p>
              {!enabled ? (
                <p className="mt-2 text-xs app-text-muted">
                  El modo offline no esta disponible en este dispositivo o navegador.
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              variant="secondary"
              onClick={() => activeBusiness && void syncNow(activeBusiness.id, 'manual')}
              disabled={!activeBusiness || isSyncing || !isOnline}
            >
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Actualizando...' : 'Actualizar ahora'}
            </Button>
            {retryableOperationIds.length > 0 ? (
              <Button variant="outline" onClick={handleRetryAll} disabled={!activeBusiness}>
                <RotateCcw className="h-4 w-4" />
                Reintentar todo
              </Button>
            ) : null}
            {!embedded ? (
              <Link to="/invoices" className="min-w-0">
                <Button variant="ghost" className="w-full sm:w-auto">
                  Volver a facturas
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </ElevatedCard>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <ElevatedCard key={card.label} tone={card.tone === 'danger' ? 'alerts' : card.tone === 'warning' ? 'expenses' : 'sync'} className="p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] app-text-muted">{card.label}</div>
                <div className="mt-3 text-2xl font-semibold tracking-tight app-text">{card.value}</div>
              </div>
              <AppStatusBadge tone={card.tone}>{card.helper}</AppStatusBadge>
            </div>
            <div className="mt-3 text-sm app-text-muted">{card.helper}</div>
          </ElevatedCard>
        ))}
      </div>

      <ElevatedCard tone={presentation.tone === 'danger' ? 'alerts' : 'sync'} className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <IconContainer icon={ShieldAlert} tone={presentation.tone === 'danger' ? 'alerts' : 'sync'} size="md" />
          <div>
            <div className="text-sm font-semibold app-text">Reglas del flujo local</div>
            <p className="mt-1 text-sm leading-6 app-text-muted">
              El estado general se resume arriba y este centro concentra el detalle. Aqui puedes revisar el motivo,
              reintentar o descartar cambios locales de facturas cuando haga falta.
            </p>
          </div>
        </div>
      </ElevatedCard>

      {operations.length === 0 && !loading ? (
        <ElevatedCard tone="neutral" className="p-3 sm:p-4">
          <TeachingEmptyState
            icon={ShieldAlert}
            title="No hay operaciones pendientes"
            description="Cuando registres cambios locales, aqui veras el detalle, los incidentes y el historial breve."
            primaryActionLabel="Ir a facturas"
            onPrimaryAction={() => window.location.assign('/invoices')}
          />
        </ElevatedCard>
      ) : (
        <>
          <ElevatedCard className="hidden overflow-hidden p-0 md:block">
            <table className="min-w-full text-sm">
              <thead className="app-table-head text-left text-xs font-semibold uppercase tracking-[0.22em]">
                <tr>
                  <th className="px-4 py-3">Registro</th>
                  <th className="px-4 py-3">Operacion</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Detalle</th>
                  <th className="px-4 py-3">Actualizado</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="app-table-body divide-y divide-gray-100">
                {operations.map((operation) => (
                  <tr key={operation.id} className="app-table-row align-top">
                    <td className="px-4 py-3">
                      <div className="font-semibold app-text">{getEntityLabel(operation)}</div>
                      <div className="text-xs app-text-muted">{operation.clientOperationId}</div>
                    </td>
                    <td className="px-4 py-3 app-text-secondary">{ACTION_LABELS[operation.action] || operation.action}</td>
                    <td className="px-4 py-3">
                      <AppStatusBadge tone={STATUS_META[operation.status].tone}>
                        {STATUS_META[operation.status].label}
                      </AppStatusBadge>
                      {operation.errorCategory ? (
                        <div className="mt-2 text-xs app-text-muted">
                          {CATEGORY_LABELS[operation.errorCategory] || operation.errorCategory}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 app-text-secondary">
                      <div>{operation.error || operation.history?.[operation.history.length - 1]?.message || 'Sin novedades'}</div>
                      {operation.conflict?.actual_updated_at ? (
                        <div className="mt-1 text-xs text-rose-500">
                          Servidor actualizado: {formatDateTime(operation.conflict.actual_updated_at)}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 app-text-secondary">{formatDateTime(operation.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {['failed', 'blocked', 'conflicted'].includes(operation.status) ? (
                          <Button variant="secondary" size="sm" onClick={() => void handleRetry(operation.id)}>
                            <RotateCcw className="h-4 w-4" />
                            Reintentar
                          </Button>
                        ) : null}
                        {operation.entityType === 'invoice' && operation.status !== 'synced' && operation.status !== 'syncing' ? (
                          <Button variant="outline" size="sm" onClick={() => void handleDiscard(operation.id)}>
                            <AlertTriangle className="h-4 w-4" />
                            Usar servidor
                          </Button>
                        ) : null}
                        <Button variant="ghost" size="sm" onClick={() => void handleDismiss(operation.id)}>
                          <Trash2 className="h-4 w-4" />
                          Quitar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ElevatedCard>

          <div className="grid gap-3 md:hidden">
            {operations.map((operation) => (
              <ElevatedCard
                key={operation.id}
                tone={operation.status === 'failed' || operation.status === 'conflicted' ? 'alerts' : operation.status === 'pending' ? 'sync' : 'neutral'}
                className="p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold app-text">{getEntityLabel(operation)}</div>
                    <div className="mt-1 text-sm app-text-muted">{ACTION_LABELS[operation.action] || operation.action}</div>
                  </div>
                  <AppStatusBadge tone={STATUS_META[operation.status].tone}>
                    {STATUS_META[operation.status].label}
                  </AppStatusBadge>
                </div>

                <div className="app-muted-panel mt-4 rounded-2xl p-3 text-sm app-text-secondary">
                  <div>{operation.error || operation.history?.[operation.history.length - 1]?.message || 'Sin novedades'}</div>
                  {operation.errorCategory ? (
                    <div className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] app-text-muted">
                      {CATEGORY_LABELS[operation.errorCategory] || operation.errorCategory}
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 text-xs app-text-muted">
                  Actualizado: {formatDateTime(operation.updatedAt)}
                </div>

                <div className="mt-4 grid gap-2">
                  {['failed', 'blocked', 'conflicted'].includes(operation.status) ? (
                    <Button variant="secondary" onClick={() => void handleRetry(operation.id)} className="w-full">
                      <RotateCcw className="h-4 w-4" />
                      Reintentar
                    </Button>
                  ) : null}
                  {operation.entityType === 'invoice' && operation.status !== 'synced' && operation.status !== 'syncing' ? (
                    <Button variant="outline" onClick={() => void handleDiscard(operation.id)} className="w-full">
                      <AlertTriangle className="h-4 w-4" />
                      Usar servidor
                    </Button>
                  ) : null}
                  <Button variant="ghost" onClick={() => void handleDismiss(operation.id)} className="w-full">
                    <Trash2 className="h-4 w-4" />
                    Quitar
                  </Button>
                </div>
              </ElevatedCard>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
