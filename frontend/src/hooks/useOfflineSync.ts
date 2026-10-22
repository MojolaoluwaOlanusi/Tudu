import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { taskService } from '../services/taskService';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import {
  listQueue,
  removeFromQueue,
  queueCount,
  conflictCount,
  enqueueConflict,
  isNetworkError,
  type QueuedOperation,
} from '../lib/offlineQueue';
import { loadTaskCache, saveTaskCache } from '../lib/taskCacheStorage';

const isStale = (
  baseline: Record<string, unknown>,
  current: Record<string, unknown>,
): string[] => {
  const changed: string[] = [];
  for (const field of Object.keys(baseline)) {
    if (JSON.stringify(baseline[field]) !== JSON.stringify(current[field])) {
      changed.push(field);
    }
  }
  return changed;
};

const execute = async (op: QueuedOperation, token: string): Promise<void> => {
  switch (op.type) {
    case 'create':
      await taskService.createTask(token, op.payload as never);
      return;
    case 'update':
      await taskService.updateTask(token, op.payload.id, op.payload.task as never);
      return;
    case 'delete':
      await taskService.deleteTask(token, op.payload);
      return;
    case 'move':
      await taskService.batchUpdateTaskStatus(token, op.payload as never);
      return;
    case 'batchDelete':
      await taskService.batchDelete(token, op.payload);
      return;
    case 'batchAssign':
      await taskService.batchAssign(token, op.payload.ids, op.payload.assigneeId);
      return;
  }
};

/**
 * Detect a conflict before executing an update: fetch the current task,
 * compare the queued baseline fields with the server's current values.
 * Returns null when safe to apply, or a QueuedConflict if not.
 */
const detectConflict = async (
  op: Extract<QueuedOperation, { type: 'update' }>,
  token: string,
) => {
  let current: Record<string, unknown>;
  try {
    current = (await taskService.getTaskById(token, op.payload.id)) as unknown as Record<
      string,
      unknown
    >;
  } catch {
    // Task itself is gone — surface as a conflict, not a silent drop.
    return {
      ...op,
      currentState: {},
      conflictFields: Object.keys(op.payload.task),
      conflictReason: 'Task no longer exists on the server',
    };
  }

  const conflicts = isStale(op.baseline, current);
  if (conflicts.length === 0) return null;

  return {
    ...op,
    currentState: current,
    conflictFields: conflicts,
    conflictReason: 'Fields changed on the server',
  };
};

export const useOfflineSync = () => {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const [pending, setPending] = useState(0);
  const [conflictTotal, setConflictTotal] = useState(0);
  const flushing = useRef(false);

  const refreshCounts = useCallback(async () => {
    try {
      setPending(await queueCount());
      setConflictTotal(await conflictCount());
    } catch {
      /* IndexedDB unavailable: ignore */
    }
  }, []);

  const flush = useCallback(async () => {
    if (!token || flushing.current) return;
    flushing.current = true;
    try {
      const queue = await listQueue();
      for (const op of queue) {
        if (op.type === 'update') {
          const conflict = await detectConflict(op, token);
          if (conflict) {
            await enqueueConflict(conflict);
            await removeFromQueue(op.id);
            continue;
          }
        }
        try {
          await execute(op, token);
          await removeFromQueue(op.id);
        } catch (err) {
          if (isNetworkError(err)) break;
          await removeFromQueue(op.id);
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast('Could not sync offline change: ' + (detail || 'unknown error'), 'error');
        }
      }
      await refreshCounts();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } finally {
      flushing.current = false;
    }
  }, [token, queryClient, pushToast, refreshCounts]);

  // Hydrate React Query from the localStorage task snapshot when offline.
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (navigator.onLine) return;
    const cached = loadTaskCache();
    if (!cached) return;
    queryClient.setQueryData(['tasks', 'list', {}], cached);
    queryClient.setQueryData(['tasks', 'kanban'], cached);
  }, [queryClient]);

  // Save the task list to localStorage whenever the main query succeeds.
  useEffect(() => {
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      const key = event.query.queryKey;
      if (!Array.isArray(key) || key[0] !== 'tasks') return;
      if (key[1] !== 'kanban' && key[1] !== 'list') return;
      const data = event.query.state.data;
      if (Array.isArray(data)) saveTaskCache(data as never);
    });
    return () => unsub();
  }, [queryClient]);

  useEffect(() => {
    void refreshCounts();
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);
    const onMessage = (event: MessageEvent) => {
      if (event.data === 'tudu-sync') void flush();
    };
    const sw = navigator.serviceWorker;
    sw?.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('online', onOnline);
      sw?.removeEventListener('message', onMessage);
    };
  }, [flush, refreshCounts]);

  return { pending, conflictTotal, flush, refreshCounts };
};
