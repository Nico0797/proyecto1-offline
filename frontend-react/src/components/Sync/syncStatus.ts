import type { OfflineSyncState } from '../../store/offlineSyncStore';

type SyncSnapshot = Pick<
  OfflineSyncState,
  | 'enabled'
  | 'isOnline'
  | 'isSyncing'
  | 'pendingCount'
  | 'failedCount'
  | 'conflictedCount'
  | 'blockedCount'
  | 'lastSyncAt'
  | 'lastError'
>;

export type SyncTone = 'success' | 'info' | 'warning' | 'danger' | 'neutral';

export type SyncPresentation = {
  tone: SyncTone;
  label: string;
  shortLabel: string;
  detail: string;
  count: number;
  showBanner: boolean;
  showAlertBadge: boolean;
};

const formatLastSync = (value: string | null) => {
  if (!value) return 'Sin sincronizacion previa';

  try {
    return `Ultima sync ${new Date(value).toLocaleString()}`;
  } catch {
    return 'Ultima sync no disponible';
  }
};

export const getSyncPresentation = (state: SyncSnapshot): SyncPresentation => {
  if (!state.enabled) {
    return {
      tone: 'neutral',
      label: 'Sync no disponible',
      shortLabel: 'Sync',
      detail: 'Este dispositivo no tiene soporte de sincronizacion offline activo.',
      count: 0,
      showBanner: false,
      showAlertBadge: false,
    };
  }

  const incidentCount = state.failedCount + state.conflictedCount + state.blockedCount;
  const hasPending = state.pendingCount > 0;
  const hasError = Boolean(state.lastError) || incidentCount > 0;
  const isOfflineImportant = !state.isOnline && (hasPending || hasError);

  if (hasError) {
    return {
      tone: 'danger',
      label: 'Sync requiere atencion',
      shortLabel: 'Error',
      detail: state.lastError || `${incidentCount} incidente${incidentCount === 1 ? '' : 's'} pendiente${incidentCount === 1 ? '' : 's'}. ${formatLastSync(state.lastSyncAt)}`,
      count: incidentCount || state.pendingCount,
      showBanner: true,
      showAlertBadge: true,
    };
  }

  if (state.isSyncing) {
    return {
      tone: 'info',
      label: 'Sincronizando',
      shortLabel: 'Sync',
      detail: hasPending
        ? `${state.pendingCount} cambio${state.pendingCount === 1 ? '' : 's'} en proceso.`
        : 'Actualizando respaldo y operaciones pendientes.',
      count: state.pendingCount,
      showBanner: hasPending,
      showAlertBadge: hasPending,
    };
  }

  if (isOfflineImportant) {
    return {
      tone: 'warning',
      label: 'Modo offline activo',
      shortLabel: 'Offline',
      detail: `${state.pendingCount} cambio${state.pendingCount === 1 ? '' : 's'} esperando conexion. ${formatLastSync(state.lastSyncAt)}`,
      count: state.pendingCount,
      showBanner: true,
      showAlertBadge: true,
    };
  }

  if (hasPending) {
    return {
      tone: 'warning',
      label: 'Cambios pendientes',
      shortLabel: 'Pend.',
      detail: `${state.pendingCount} cambio${state.pendingCount === 1 ? '' : 's'} listo${state.pendingCount === 1 ? '' : 's'} para enviar. ${formatLastSync(state.lastSyncAt)}`,
      count: state.pendingCount,
      showBanner: true,
      showAlertBadge: true,
    };
  }

  return {
    tone: 'success',
    label: 'Todo al dia',
    shortLabel: 'OK',
    detail: formatLastSync(state.lastSyncAt),
    count: 0,
    showBanner: false,
    showAlertBadge: false,
  };
};
