const DB_NAME = 'tudu-offline';
const STORE = 'mutations';
const CONFLICT_STORE = 'conflicts';
const DB_VERSION = 2;

export type QueuedOperation =
  | { id: string; type: 'create'; payload: unknown; tempId?: string; createdAt: number }
  | { id: string; type: 'update'; payload: { id: string; task: Record<string, unknown> }; baseline: Record<string, unknown>; createdAt: number }
  | { id: string; type: 'delete'; payload: string; createdAt: number }
  | { id: string; type: 'move'; payload: unknown[]; createdAt: number }
  | { id: string; type: 'batchDelete'; payload: string[]; createdAt: number }
  | { id: string; type: 'batchAssign'; payload: { ids: string[]; assigneeId: string | null }; createdAt: number };

export interface QueuedConflict {
  id: string;
  type: 'update';
  payload: { id: string; task: Record<string, unknown> };
  baseline: Record<string, unknown>;
  currentState: Record<string, unknown>;
  conflictFields: string[];
  conflictReason: string;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

const openDb = (): Promise<IDBDatabase> => {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(CONFLICT_STORE)) {
        db.createObjectStore(CONFLICT_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
};

const tx = async (
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => void,
): Promise<void> => {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction(store, mode);
    fn(t.objectStore(store));
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
};

export const enqueue = async (op: QueuedOperation): Promise<void> => {
  await tx(STORE, 'readwrite', (store) => store.put(op));
};

export const listQueue = async (): Promise<QueuedOperation[]> => {
  const db = await openDb();
  return new Promise<QueuedOperation[]>((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).getAll();
    req.onsuccess = () =>
      resolve(
        (req.result as QueuedOperation[]).sort((a, b) => a.createdAt - b.createdAt),
      );
    req.onerror = () => reject(req.error);
  });
};

export const removeFromQueue = async (id: string): Promise<void> => {
  await tx(STORE, 'readwrite', (store) => store.delete(id));
};

export const queueCount = async (): Promise<number> => {
  const db = await openDb();
  return new Promise<number>((resolve, reject) => {
    const t = db.transaction(STORE, 'readonly');
    const req = t.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

export const enqueueConflict = async (c: QueuedConflict): Promise<void> => {
  await tx(CONFLICT_STORE, 'readwrite', (store) => store.put(c));
};

export const listConflicts = async (): Promise<QueuedConflict[]> => {
  const db = await openDb();
  return new Promise<QueuedConflict[]>((resolve, reject) => {
    const t = db.transaction(CONFLICT_STORE, 'readonly');
    const req = t.objectStore(CONFLICT_STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedConflict[]);
    req.onerror = () => reject(req.error);
  });
};

export const removeConflict = async (id: string): Promise<void> => {
  await tx(CONFLICT_STORE, 'readwrite', (store) => store.delete(id));
};

export const conflictCount = async (): Promise<number> => {
  const db = await openDb();
  return new Promise<number>((resolve, reject) => {
    const t = db.transaction(CONFLICT_STORE, 'readonly');
    const req = t.objectStore(CONFLICT_STORE).count();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
};

/**
 * A network error is one where the request never reached the server (or
 * the server never answered). Axios sets `response` only when the server
 * *did* answer, so the presence of `response` means "server said no".
 */
export const isNetworkError = (error: unknown): boolean => {
  const e = error as { response?: unknown; code?: string; message?: string };
  if (e?.response) return false;
  if (e?.code === 'ERR_NETWORK' || e?.code === 'ECONNABORTED') return true;
  return typeof e?.message === 'string' && /network|failed to fetch|timeout/i.test(e.message);
};
