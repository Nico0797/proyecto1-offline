import type {
  Business,
  Customer,
  Invoice,
  Payment,
  Product,
  Sale,
  TreasuryAccount,
} from '../types';
import { offlineDb, type PendingSyncOperation } from './offlineDb';
import { offlineSyncService } from './offlineSyncService';
import {
  buildOfflineAccessibleContexts,
  buildOfflineActiveContext,
  buildOfflineUser,
  persistOfflineSessionSnapshot,
} from './offlineSession';
import { buildInfo } from '../generated/buildInfo';

export const LOCAL_BACKUP_VERSION = 'encaja-local-backup-v1';

const SESSION_STORAGE_KEYS = [
  'activeBusiness',
  'activeContext',
  'accessibleContexts',
  'user',
  'account_access_snapshot',
] as const;

type BusinessIndexedDbSnapshot = {
  businessId: number;
  customers: Customer[];
  products: Product[];
  sales: Sale[];
  payments: Payment[];
  invoices: Invoice[];
  treasuryAccounts: TreasuryAccount[];
  syncOperations: PendingSyncOperation[];
};

export type LocalBackupSnapshot = {
  version: typeof LOCAL_BACKUP_VERSION;
  exportedAt: string;
  build: {
    gitCommitShort: string;
    builtAtDisplay: string;
  };
  activeBusinessId: number | null;
  businesses: Business[];
  localStorageEntries: Record<string, string>;
  indexedDb: BusinessIndexedDbSnapshot[];
};

const getWindow = () => {
  if (typeof window === 'undefined') {
    throw new Error('El respaldo local solo está disponible en el navegador.');
  }

  return window;
};

const getLocalStorageEntries = () => {
  const win = getWindow();
  const entries: Record<string, string> = {};

  for (let index = 0; index < win.localStorage.length; index += 1) {
    const key = win.localStorage.key(index);
    if (!key) continue;
    if (key.startsWith('offline:') || SESSION_STORAGE_KEYS.includes(key as (typeof SESSION_STORAGE_KEYS)[number])) {
      const value = win.localStorage.getItem(key);
      if (value != null) {
        entries[key] = value;
      }
    }
  }

  return entries;
};

const mergeUniqueById = <T extends { id: number }>(records: T[]) => {
  const map = new Map<number, T>();
  records.forEach((record) => {
    map.set(Number(record.id), record);
  });
  return Array.from(map.values());
};

export const buildLocalBackupSnapshot = async (): Promise<LocalBackupSnapshot> => {
  const businesses = mergeUniqueById(await offlineSyncService.getBusinessesFromLocal());
  const activeBusinessId = (() => {
    const raw = getWindow().localStorage.getItem('activeBusiness');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      const id = Number(parsed?.id);
      return Number.isFinite(id) ? id : null;
    } catch {
      return null;
    }
  })();

  const indexedDb = await Promise.all(
    businesses.map(async (business) => ({
      businessId: business.id,
      customers: await offlineSyncService.getCustomersFromLocal(business.id),
      products: await offlineSyncService.getProductsFromLocal(business.id),
      sales: await offlineSyncService.getSalesFromLocal(business.id),
      payments: await offlineSyncService.getPaymentsFromLocal(business.id),
      invoices: await offlineSyncService.getInvoicesFromLocal(business.id),
      treasuryAccounts: await offlineSyncService.getTreasuryAccountsFromLocal(business.id),
      syncOperations: await offlineDb.listSyncOperations(business.id),
    })),
  );

  return {
    version: LOCAL_BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    build: {
      gitCommitShort: buildInfo.gitCommitShort,
      builtAtDisplay: buildInfo.builtAtDisplay,
    },
    activeBusinessId,
    businesses,
    localStorageEntries: getLocalStorageEntries(),
    indexedDb,
  };
};

export const downloadLocalBackupSnapshot = async () => {
  const win = getWindow();
  const snapshot = await buildLocalBackupSnapshot();
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  const url = win.URL.createObjectURL(blob);
  const link = win.document.createElement('a');
  const stamp = snapshot.exportedAt.replace(/[:.]/g, '-');
  link.href = url;
  link.download = `encaja-local-backup-${stamp}.json`;
  win.document.body.appendChild(link);
  link.click();
  link.remove();
  win.URL.revokeObjectURL(url);
};

const parseBackupSnapshot = (raw: string): LocalBackupSnapshot => {
  const parsed = JSON.parse(raw) as Partial<LocalBackupSnapshot>;
  if (parsed.version !== LOCAL_BACKUP_VERSION) {
    throw new Error('El archivo no corresponde a un respaldo local compatible de EnCaja.');
  }
  if (!Array.isArray(parsed.businesses)) {
    throw new Error('El respaldo no contiene negocios válidos.');
  }
  return parsed as LocalBackupSnapshot;
};

export const importLocalBackupSnapshot = async (file: File) => {
  const snapshot = parseBackupSnapshot(await file.text());
  const existingBusinesses = await offlineSyncService.getBusinessesFromLocal();
  const mergedBusinesses = mergeUniqueById([...existingBusinesses, ...snapshot.businesses]);

  await offlineSyncService.cacheBusinesses(mergedBusinesses);

  for (const business of mergedBusinesses) {
    await offlineSyncService.cacheBusiness(business);
  }

  for (const scope of snapshot.indexedDb) {
    for (const record of scope.customers || []) {
      await offlineDb.upsertEntity('customers', scope.businessId, Number(record.id), record);
    }
    for (const record of scope.products || []) {
      await offlineDb.upsertEntity('products', scope.businessId, Number(record.id), record);
    }
    for (const record of scope.sales || []) {
      await offlineDb.upsertEntity('sales', scope.businessId, Number(record.id), record);
    }
    for (const record of scope.payments || []) {
      await offlineDb.upsertEntity('payments', scope.businessId, Number(record.id), record);
    }
    for (const record of scope.invoices || []) {
      await offlineDb.upsertEntity('invoices', scope.businessId, Number(record.id), record);
    }
    for (const record of scope.treasuryAccounts || []) {
      await offlineDb.upsertEntity('treasury_accounts', scope.businessId, Number(record.id), record);
    }

    for (const operation of scope.syncOperations || []) {
      await offlineDb.putSyncOperation(operation);
    }
  }

  Object.entries(snapshot.localStorageEntries || {}).forEach(([key, value]) => {
    getWindow().localStorage.setItem(key, value);
  });

  const activeBusiness =
    mergedBusinesses.find((business) => business.id === snapshot.activeBusinessId)
    ?? mergedBusinesses[0]
    ?? null;

  persistOfflineSessionSnapshot({
    businesses: mergedBusinesses,
    activeBusiness,
  });

  const win = getWindow();
  const offlineUser = buildOfflineUser(activeBusiness);
  const offlineContext = buildOfflineActiveContext(activeBusiness);
  const accessibleContexts = buildOfflineAccessibleContexts(mergedBusinesses);

  if (offlineUser) {
    win.localStorage.setItem('user', JSON.stringify(offlineUser));
  }
  if (offlineContext) {
    win.localStorage.setItem('activeContext', JSON.stringify(offlineContext));
  }
  win.localStorage.setItem('accessibleContexts', JSON.stringify(accessibleContexts));

  return {
    snapshot,
    activeBusiness,
    businesses: mergedBusinesses,
  };
};
