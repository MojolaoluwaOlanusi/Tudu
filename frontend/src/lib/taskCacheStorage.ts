const KEY = 'tudu.tasks.cache';

interface CachedTask {
  id: string;
  [k: string]: unknown;
}

/**
 * localStorage snapshot of the caller's task list. Written on every
 * successful fetch and read back when the app starts offline so users
 * see their last-known tasks instead of an empty list.
 */
export const saveTaskCache = (tasks: CachedTask[]): void => {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks));
  } catch {
    /* quota or private mode — cosmetic */
  }
};

export const loadTaskCache = (): CachedTask[] | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CachedTask[]) : null;
  } catch {
    return null;
  }
};

export const hasTaskCache = (): boolean => loadTaskCache() !== null;
