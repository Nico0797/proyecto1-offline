import { create } from 'zustand';
import { offlineSyncService, OFFLINE_SYNC_EVENT } from '../services/offlineSyncService';
import { isOfflineProductMode } from '../runtime/runtimeMode';

const ACCOUNT_ACCESS_STORAGE_KEY = 'account_access_snapshot';

const isDemoPreviewActive = () => {
  if (typeof window === 'undefined') return false;
  try {
    const raw = localStorage.getItem(ACCOUNT_ACCESS_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Boolean(parsed?.demo_preview_active);
  } catch {
    return false;
  }
};

export type OfflineSyncToastEvent = {
  id: number;
  tone: 'success' | 'warning' | 'error' | 'info';
  title: string;
  description?: string;
};

export interface OfflineSyncState {
  enabled: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  failedCount: number;
  conflictedCount: number;
  blockedCount: number;
  lastSyncAt: string | null;
  lastError: string | null;
  trackedBusinessId: number | null;
  lastToastEvent: OfflineSyncToastEvent | null;
  initialize: (businessId?: number | null) => Promise<void>;
  refresh: (businessId?: number | null) => Promise<void>;
  syncNow: (businessId?: number | null, source?: 'manual' | 'reconnect' | 'auto') => Promise<void>;
  setTrackedBusiness: (businessId?: number | null) => void;
}

let listenersRegistered = false;

const createToastEvent = (event: Omit<OfflineSyncToastEvent, 'id'>): OfflineSyncToastEvent => ({
  id: Date.now() + Math.floor(Math.random() * 1000),
  ...event,
});

const bindGlobalListeners = () => {
  if (listenersRegistered || typeof window === 'undefined') {
    return;
  }

  listenersRegistered = true;

  window.addEventListener('online', () => {
    const state = useOfflineSyncStore.getState();
    useOfflineSyncStore.setState({ isOnline: true });
    void state.syncNow(state.trackedBusinessId, 'reconnect');
  });

  window.addEventListener('offline', () => {
    useOfflineSyncStore.setState({ isOnline: false });
  });

  window.addEventListener(OFFLINE_SYNC_EVENT, () => {
    const state = useOfflineSyncStore.getState();
    void state.refresh(state.trackedBusinessId);
  });
};

export const useOfflineSyncStore = create<OfflineSyncState>((set, get) => ({
  enabled: offlineSyncService.isEnabled(),
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingCount: 0,
  failedCount: 0,
  conflictedCount: 0,
  blockedCount: 0,
  lastSyncAt: null,
  lastError: null,
  trackedBusinessId: null,
  lastToastEvent: null,
  setTrackedBusiness: (businessId) => {
    set({ trackedBusinessId: businessId ?? null });
  },
  initialize: async (businessId) => {
    if (isOfflineProductMode()) {
      set({
        enabled: false,
        trackedBusinessId: businessId ?? null,
        isOnline: false,
        isSyncing: false,
        pendingCount: 0,
        failedCount: 0,
        conflictedCount: 0,
        blockedCount: 0,
        lastSyncAt: null,
        lastError: null,
        lastToastEvent: null,
      });
      return;
    }
    bindGlobalListeners();
    if (isDemoPreviewActive()) {
      set({
        enabled: false,
        trackedBusinessId: businessId ?? null,
        pendingCount: 0,
        failedCount: 0,
        conflictedCount: 0,
        blockedCount: 0,
        lastSyncAt: null,
        lastError: null,
      });
      return;
    }
    if (businessId != null) {
      set({ trackedBusinessId: businessId });
    }
    await get().refresh(businessId ?? get().trackedBusinessId);
  },
  refresh: async (businessId) => {
    const targetBusinessId = businessId ?? get().trackedBusinessId;
    if (isOfflineProductMode()) {
      set({
        enabled: false,
        trackedBusinessId: targetBusinessId ?? null,
        isOnline: false,
        isSyncing: false,
        pendingCount: 0,
        failedCount: 0,
        conflictedCount: 0,
        blockedCount: 0,
        lastSyncAt: null,
        lastError: null,
        lastToastEvent: null,
      });
      return;
    }
    if (isDemoPreviewActive()) {
      set({
        enabled: false,
        trackedBusinessId: targetBusinessId ?? null,
        pendingCount: 0,
        failedCount: 0,
        conflictedCount: 0,
        blockedCount: 0,
        lastSyncAt: null,
        lastError: null,
      });
      return;
    }
    const enabled = offlineSyncService.isEnabled();

    if (!enabled) {
      set({ enabled: false, pendingCount: 0, lastSyncAt: null, lastError: null });
      return;
    }

    const [pendingCount, lastSyncAt, summary] = await Promise.all([
      offlineSyncService.getPendingCount(targetBusinessId ?? undefined),
      targetBusinessId != null ? offlineSyncService.getLastSyncAt(targetBusinessId) : Promise.resolve(null),
      offlineSyncService.getSyncSummary(targetBusinessId ?? undefined),
    ]);

    set({
      enabled,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingCount,
      failedCount: summary.failed,
      conflictedCount: summary.conflicted,
      blockedCount: summary.blocked,
      lastSyncAt,
      trackedBusinessId: targetBusinessId ?? null,
    });
  },
  syncNow: async (businessId, source = 'manual') => {
    const targetBusinessId = businessId ?? get().trackedBusinessId;
    if (isOfflineProductMode()) {
      set({
        enabled: false,
        trackedBusinessId: targetBusinessId ?? null,
        isOnline: false,
        isSyncing: false,
        pendingCount: 0,
        failedCount: 0,
        conflictedCount: 0,
        blockedCount: 0,
        lastSyncAt: null,
        lastError: null,
        lastToastEvent: null,
      });
      return;
    }

    if (isDemoPreviewActive()) {
      set({
        enabled: false,
        trackedBusinessId: targetBusinessId ?? null,
        pendingCount: 0,
        failedCount: 0,
        conflictedCount: 0,
        blockedCount: 0,
        lastSyncAt: null,
        lastError: null,
      });
      if (source !== 'auto') {
        set({
          lastToastEvent: createToastEvent({
            tone: 'info',
            title: 'Vista previa activa',
            description: 'La sincronización queda deshabilitada mientras exploras el negocio de ejemplo.',
          }),
        });
      }
      return;
    }

    if (!offlineSyncService.isEnabled()) {
      set({ enabled: false });
      return;
    }

    if (!navigator.onLine) {
      await get().refresh(targetBusinessId);
      if (source === 'manual') {
        set({
          lastToastEvent: createToastEvent({
            tone: 'warning',
            title: 'Sin conexion',
            description: 'Tus cambios siguen guardados localmente hasta recuperar internet.',
          }),
        });
      }
      return;
    }

    set({ isSyncing: true, lastError: null, trackedBusinessId: targetBusinessId ?? null });

    try {
      const pendingCount = await offlineSyncService.getPendingCount(targetBusinessId ?? undefined);
      let syncResult = { synced: 0, failed: 0, lastError: null as string | null };

      if (pendingCount > 0) {
        syncResult = await offlineSyncService.syncPendingOperations(targetBusinessId ?? undefined);
        if (syncResult.lastError) {
          set({ lastError: syncResult.lastError });
        }
      } else if (targetBusinessId != null) {
        await offlineSyncService.prepareOfflineSnapshot(targetBusinessId);
      }

      await get().refresh(targetBusinessId);

      const nextState = get();
      const incidentCount = nextState.failedCount + nextState.conflictedCount + nextState.blockedCount;
      const hasIssues = incidentCount > 0 || Boolean(nextState.lastError) || syncResult.failed > 0;
      const syncedChanges = syncResult.synced;

      if (source === 'manual') {
        set({
          lastToastEvent: hasIssues
            ? createToastEvent({
                tone: 'error',
                title: 'La sincronizacion requiere revision',
                description: nextState.lastError || 'Hay cambios con conflicto, bloqueo o error pendientes por resolver.',
              })
            : createToastEvent({
                tone: 'success',
                title: pendingCount > 0 ? 'Sincronizacion completada' : 'Estado verificado',
                description: pendingCount > 0
                  ? `${syncedChanges} cambio${syncedChanges === 1 ? '' : 's'} enviado${syncedChanges === 1 ? '' : 's'} y el resto quedo al dia.`
                  : 'No habia cambios pendientes; el respaldo local se actualizo correctamente.',
              }),
        });
      }

      if (source === 'reconnect') {
        set({
          lastToastEvent: hasIssues
            ? createToastEvent({
                tone: 'warning',
                title: 'Conexion recuperada',
                description: nextState.lastError || 'Volvimos a estar en linea, pero quedaron cambios que necesitan revision.',
              })
            : createToastEvent({
                tone: 'success',
                title: 'Conexion recuperada',
                description: syncedChanges > 0
                  ? `${syncedChanges} cambio${syncedChanges === 1 ? '' : 's'} se sincronizo automaticamente.`
                  : 'La app volvio a estar en linea y no hay pendientes por enviar.',
              }),
        });
      }
    } catch (error: any) {
      set({
        lastError: error?.message || 'No se pudo sincronizar',
        lastToastEvent: source === 'auto'
          ? null
          : createToastEvent({
              tone: source === 'reconnect' ? 'warning' : 'error',
              title: source === 'reconnect' ? 'Conexion recuperada' : 'No se pudo sincronizar',
              description: error?.message || 'Revisa tu conexion o intenta nuevamente desde el centro de sincronizacion.',
            }),
      });
      await get().refresh(targetBusinessId);
    } finally {
      set({ isSyncing: false });
    }
  },
}));
