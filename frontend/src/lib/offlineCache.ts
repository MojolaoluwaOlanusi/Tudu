import type { QueryClient } from '@tanstack/react-query';

const STORE_KEY = 'tudu.query.cache';
const TOKEN_KEY = 'tudu.cache.token';

interface StoredShape {
  token: string | null;
  entries: Record<string, unknown>;
}

const readStore = (): StoredShape => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return { token: null, entries: {} };
    const parsed = JSON.parse(raw) as Partial<StoredShape>;
    return {
      token: typeof parsed.token === 'string' ? parsed.token : null,
      entries: (parsed.entries as Record<string, unknown>) ?? {},
    };
  } catch {
    return { token: null, entries: {} };
  }
};

const writeStore = (store: StoredShape): void => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* quota exceeded or private mode — cosmetic */
  }
};

/**
 * Persist the result of a successful query. Called from a single
 * queryCache subscriber so every query is covered automatically.
 */
export const snapshotQuery = (
  key: readonly unknown[],
  data: unknown,
  token: string | null,
): void => {
  // Auth tokens and the current-user payload never need to survive a
  // reload as offline data — the auth store already persists its own.
  if (Array.isArray(key) && key[0] === 'auth') return;
  const store = readStore();
  store.token = token ?? store.token;
  store.entries[JSON.stringify(key)] = data;
  writeStore(store);
};

/**
 * Hydrate the React Query cache from localStorage. Only entries that
 * were snapshotted under the SAME auth token are restored, so a second
 * user on the same browser never sees the first user's data.
 */
export const hydrateQueryClient = (
  queryClient: QueryClient,
  currentToken: string | null,
): void => {
  const store = readStore();
  if (store.token !== currentToken) {
    // Different user (or first ever load) — drop the old cache.
    try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    return;
  }
  for (const [serialized, data] of Object.entries(store.entries)) {
    try {
      const key = JSON.parse(serialized);
      if (Array.isArray(key)) queryClient.setQueryData(key, data);
    } catch {
      /* malformed entry — skip */
    }
  }
};

export const clearOfflineCache = (): void => {
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
};
