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
  isNetworkError,
  type QueuedOperation,
} from '../lib/offlineQueue';
import { snapshotQuery } from '../lib/offlineCache';

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

export interface SyncProgress {
  /** Number of queued ops processed so far. */
  done: number;
  /** Total queued at the start of this flush. 0 when idle. */
  total: number;
}

export const useOfflineSync = () => {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const [pending, setPending] = useState(0);
  const [conflictTotal, setConflictTotal] = useState(0);
  const [progress, setProgress] = useState<SyncProgress>({ done: 0, total: 0 });
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
      if (queue.length === 0) {
        setProgress({ done: 0, total: 0 });
        await refreshCounts();
        return;
      }
      setProgress({ done: 0, total: queue.length });
      let done = 0;
      for (const op of queue) {
        try {
          await execute(op, token);
          await removeFromQueue(op.id);
        } catch (err) {
          if (isNetworkError(err)) break;
          await removeFromQueue(op.id);
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast('Could not sync offline change: ' + (detail || 'unknown error'), 'error');
        }
        done += 1;
        setProgress({ done, total: queue.length });
      }
      await refreshCounts();
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    } finally {
      flushing.current = false;
      // Clear progress after a short delay so the circle is readable.
      window.setTimeout(() => setProgress({ done: 0, total: 0 }), 1200);
    }
  }, [token, queryClient, pushToast, refreshCounts]);

  // Snapshot every successful query to localStorage. This is the load-
  // bearing piece for offline: no matter which page the user is on, the
  // data they have already seen is written to disk.
  useEffect(() => {
    const unsub = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      if (event.query.state.status !== 'success') return;
      snapshotQuery(event.query.queryKey, event.query.state.data, token);
    });
    return () => unsub();
  }, [queryClient, token]);

  useEffect(() => {
    void refreshCounts();
    const onOnline = () => void flush();
    window.addEventListener('online', onOnline);

    // Refresh the pill the moment something is enqueued, so the
    // count reflects offline actions immediately.
    const onEnqueued = () => void refreshCounts();
    window.addEventListener('tudu-offline-enqueued', onEnqueued);

    // Belt-and-braces: poll every 3s in case an event is missed.
    const poll = window.setInterval(() => void refreshCounts(), 3000);

    const onMessage = (event: MessageEvent) => {
      if (event.data === 'tudu-sync') void flush();
    };
    const sw = navigator.serviceWorker;
    sw?.addEventListener('message', onMessage);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('tudu-offline-enqueued', onEnqueued);
      window.clearInterval(poll);
      sw?.removeEventListener('message', onMessage);
    };
  }, [flush, refreshCounts]);

  return { pending, conflictTotal, progress, flush, refreshCounts };
};
