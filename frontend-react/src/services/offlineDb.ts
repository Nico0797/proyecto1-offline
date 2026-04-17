type EntityStoreName = 'businesses' | 'customers' | 'products' | 'sales' | 'payments' | 'invoices' | 'treasury_accounts';

type StoreName = EntityStoreName | 'metadata' | 'sync_operations';

const INDEXED_DB_OPEN_TIMEOUT_MS = 4000;
const INDEXED_DB_REQUEST_TIMEOUT_MS = 3000;
const INDEXED_DB_TRANSACTION_TIMEOUT_MS = 4000;

export type OfflineSyncEntityType = 'sale' | 'payment' | 'customer' | 'product' | 'invoice';
export type OfflineSyncAction = 'create' | 'update' | 'delete' | 'status_update' | 'payment_create';
export type SyncOperationStatus = 'pending' | 'syncing' | 'synced' | 'failed' | 'blocked' | 'conflicted';
export type SyncErrorCategory =
  | 'network_unavailable'
  | 'server_unavailable'
  | 'validation_rejected'
  | 'business_rule_rejected'
  | 'conflict_detected'
  | 'parent_missing'
  | 'unexpected_server_error';
export type SyncOperationHistoryEntry = {
  at: string;
  status: SyncOperationStatus;
  message: string;
  category?: SyncErrorCategory | null;
};
export type SyncOperationConflict = {
  expected_updated_at?: string | null;
  actual_updated_at?: string | null;
  server_invoice_id?: number | null;
  server_invoice_number?: string | null;
  message?: string | null;
};

export type PendingSyncOperation = {
  id: string;
  businessId: number;
  entityType: OfflineSyncEntityType;
  action: OfflineSyncAction;
  entityId: number;
  endpoint: string;
  payload: Record<string, any>;
  tempId?: number | null;
  clientOperationId: string;
  createdAt: string;
  updatedAt: string;
  status: SyncOperationStatus;
  error: string | null;
  errorCategory?: SyncErrorCategory | null;
  errorDetail?: string | null;
  technicalDetail?: string | null;
  retryCount?: number;
  lastAttemptAt?: string | null;
  completedAt?: string | null;
  baseUpdatedAt?: string | null;
  entityLabel?: string | null;
  blockedByOperationId?: string | null;
  blockedByEntityId?: number | null;
  conflict?: SyncOperationConflict | null;
  history?: SyncOperationHistoryEntry[];
};

type EntityRecord<T> = {
  key: string;
  businessId: number;
  entityId: number;
  record: T;
  updatedAt: string;
};

type MetadataRecord = {
  key: string;
  value: any;
  updatedAt: string;
};

const DB_NAME = 'encaja-offline-db';
const DB_VERSION = 2;

let dbPromise: Promise<IDBDatabase> | null = null;

const entityStores: EntityStoreName[] = ['businesses', 'customers', 'products', 'sales', 'payments', 'invoices', 'treasury_accounts'];

const createTimeoutError = (message: string) => {
  const error = new Error(message);
  error.name = 'OfflineDbTimeoutError';
  return error;
};

const getDb = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    const timeoutId = window.setTimeout(() => {
      dbPromise = null;
      reject(createTimeoutError('Timed out opening offline database'));
    }, INDEXED_DB_OPEN_TIMEOUT_MS);

    request.onupgradeneeded = () => {
      const db = request.result;

      const metadataStore = db.objectStoreNames.contains('metadata')
        ? request.transaction?.objectStore('metadata')
        : db.createObjectStore('metadata', { keyPath: 'key' });

      if (metadataStore && !metadataStore.indexNames.contains('updatedAt')) {
        metadataStore.createIndex('updatedAt', 'updatedAt', { unique: false });
      }

      entityStores.forEach((storeName) => {
        const store = db.objectStoreNames.contains(storeName)
          ? request.transaction?.objectStore(storeName)
          : db.createObjectStore(storeName, { keyPath: 'key' });

        if (!store) return;

        if (!store.indexNames.contains('businessId')) {
          store.createIndex('businessId', 'businessId', { unique: false });
        }

        if (!store.indexNames.contains('entityId')) {
          store.createIndex('entityId', 'entityId', { unique: false });
        }

        if (!store.indexNames.contains('updatedAt')) {
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      });

      const syncStore = db.objectStoreNames.contains('sync_operations')
        ? request.transaction?.objectStore('sync_operations')
        : db.createObjectStore('sync_operations', { keyPath: 'id' });

      if (syncStore) {
        if (!syncStore.indexNames.contains('businessId')) {
          syncStore.createIndex('businessId', 'businessId', { unique: false });
        }

        if (!syncStore.indexNames.contains('status')) {
          syncStore.createIndex('status', 'status', { unique: false });
        }

        if (!syncStore.indexNames.contains('createdAt')) {
          syncStore.createIndex('createdAt', 'createdAt', { unique: false });
        }
      }
    };

    request.onsuccess = () => {
      window.clearTimeout(timeoutId);
      resolve(request.result);
    };
    request.onerror = () => {
      window.clearTimeout(timeoutId);
      dbPromise = null;
      reject(request.error || new Error('No se pudo abrir la base offline'));
    };
    request.onblocked = () => {
      window.clearTimeout(timeoutId);
      dbPromise = null;
      reject(new Error('La base offline quedó bloqueada'));
    };
  });

  return dbPromise;
};

const transact = async <T>(storeName: StoreName, mode: IDBTransactionMode, executor: (store: IDBObjectStore) => Promise<T> | T) => {
  const db = await getDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    const timeoutId = window.setTimeout(() => {
      try {
        transaction.abort();
      } catch {
        // noop
      }
      reject(createTimeoutError(`Timed out running transaction for ${storeName}`));
    }, INDEXED_DB_TRANSACTION_TIMEOUT_MS);

    Promise.resolve(executor(store))
      .then((result) => {
        transaction.oncomplete = () => {
          window.clearTimeout(timeoutId);
          resolve(result);
        };
        transaction.onerror = () => {
          window.clearTimeout(timeoutId);
          reject(transaction.error || new Error(`Error en transacción ${storeName}`));
        };
        transaction.onabort = () => {
          window.clearTimeout(timeoutId);
          reject(transaction.error || new Error(`Transacción abortada ${storeName}`));
        };
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
};

const requestToPromise = <T = any>(request: IDBRequest<T>) =>
  new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(createTimeoutError('Timed out waiting for IndexedDB request'));
    }, INDEXED_DB_REQUEST_TIMEOUT_MS);

    request.onsuccess = () => {
      window.clearTimeout(timeoutId);
      resolve(request.result);
    };
    request.onerror = () => {
      window.clearTimeout(timeoutId);
      reject(request.error || new Error('Operación IndexedDB falló'));
    };
  });

const makeEntityKey = (businessId: number, entityId: number) => `${businessId}:${entityId}`;

const getAllByIndex = async <T>(storeName: StoreName, indexName: string, query: IDBValidKey) =>
  transact(storeName, 'readonly', async (store) => {
    const index = store.index(indexName);
    return requestToPromise<T[]>(index.getAll(query));
  });

const deleteByKey = async (storeName: StoreName, key: IDBValidKey) =>
  transact(storeName, 'readwrite', async (store) => {
    await requestToPromise(store.delete(key));
  });

export const offlineDb = {
  async putEntities<T>(storeName: EntityStoreName, businessId: number, records: T[], getEntityId: (record: T) => number) {
    const updatedAt = new Date().toISOString();

    await transact(storeName, 'readwrite', async (store) => {
      const existing = await requestToPromise<EntityRecord<T>[]>(store.index('businessId').getAll(businessId));
      const nextKeys = new Set(records.map((record) => makeEntityKey(businessId, getEntityId(record))));

      await Promise.all(
        existing
          .filter((record) => !nextKeys.has(record.key))
          .map((record) => requestToPromise(store.delete(record.key)))
      );

      await Promise.all(
        records.map((record) => {
          const entityId = getEntityId(record);
          const payload: EntityRecord<T> = {
            key: makeEntityKey(businessId, entityId),
            businessId,
            entityId,
            record,
            updatedAt,
          };

          return requestToPromise(store.put(payload));
        })
      );
    });
  },

  async upsertEntity<T>(storeName: EntityStoreName, businessId: number, entityId: number, record: T) {
    const payload: EntityRecord<T> = {
      key: makeEntityKey(businessId, entityId),
      businessId,
      entityId,
      record,
      updatedAt: new Date().toISOString(),
    };

    await transact(storeName, 'readwrite', async (store) => {
      await requestToPromise(store.put(payload));
    });
  },

  async getEntities<T>(storeName: EntityStoreName, businessId: number): Promise<T[]> {
    const rows = await getAllByIndex<EntityRecord<T>>(storeName, 'businessId', businessId);
    return rows
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .map((row) => row.record);
  },

  async getEntity<T>(storeName: EntityStoreName, businessId: number, entityId: number): Promise<T | null> {
    const row = await transact(storeName, 'readonly', async (store) =>
      requestToPromise<EntityRecord<T> | undefined>(store.get(makeEntityKey(businessId, entityId)))
    );

    return row?.record ?? null;
  },

  async deleteEntity(storeName: EntityStoreName, businessId: number, entityId: number) {
    await deleteByKey(storeName, makeEntityKey(businessId, entityId));
  },

  async deleteEntitiesByBusiness(storeName: EntityStoreName, businessId: number) {
    await transact(storeName, 'readwrite', async (store) => {
      const rows = await requestToPromise<EntityRecord<unknown>[]>(store.index('businessId').getAll(businessId));
      await Promise.all(rows.map((row) => requestToPromise(store.delete(row.key))));
    });
  },

  async putMetadata(key: string, value: any) {
    const payload: MetadataRecord = {
      key,
      value,
      updatedAt: new Date().toISOString(),
    };

    await transact('metadata', 'readwrite', async (store) => {
      await requestToPromise(store.put(payload));
    });
  },

  async getMetadata<T>(key: string): Promise<T | null> {
    const row = await transact('metadata', 'readonly', async (store) =>
      requestToPromise<MetadataRecord | undefined>(store.get(key))
    );

    return (row?.value as T) ?? null;
  },

  async putSyncOperation(operation: PendingSyncOperation) {
    await transact('sync_operations', 'readwrite', async (store) => {
      await requestToPromise(store.put(operation));
    });
  },

  async getSyncOperation(operationId: string): Promise<PendingSyncOperation | null> {
    const row = await transact('sync_operations', 'readonly', async (store) =>
      requestToPromise<PendingSyncOperation | undefined>(store.get(operationId))
    );

    return row ?? null;
  },

  async listSyncOperations(businessId?: number): Promise<PendingSyncOperation[]> {
    const rows = businessId == null
      ? await transact('sync_operations', 'readonly', async (store) => requestToPromise<PendingSyncOperation[]>(store.getAll()))
      : await getAllByIndex<PendingSyncOperation>('sync_operations', 'businessId', businessId);

    return rows.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  },

  async listPendingSyncOperations(businessId?: number): Promise<PendingSyncOperation[]> {
    const rows = await this.listSyncOperations(businessId);
    return rows.filter((row) => row.status === 'pending');
  },

  async listActiveSyncOperations(businessId?: number): Promise<PendingSyncOperation[]> {
    const rows = await this.listSyncOperations(businessId);
    return rows.filter((row) => row.status !== 'synced');
  },

  async updateSyncOperation(operationId: string, patch: Partial<PendingSyncOperation>) {
    const current = await this.getSyncOperation(operationId);
    if (!current) return null;

    const next: PendingSyncOperation = {
      ...current,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await this.putSyncOperation(next);
    return next;
  },

  async deleteSyncOperation(operationId: string) {
    await deleteByKey('sync_operations', operationId);
  },

  async deleteSyncOperationsByBusiness(businessId: number) {
    await transact('sync_operations', 'readwrite', async (store) => {
      const rows = await requestToPromise<PendingSyncOperation[]>(store.index('businessId').getAll(businessId));
      await Promise.all(rows.map((row) => requestToPromise(store.delete(row.id))));
    });
  },

  async countPendingSyncOperations(businessId?: number) {
    const rows = await this.listActiveSyncOperations(businessId);
    return rows.length;
  },
};
