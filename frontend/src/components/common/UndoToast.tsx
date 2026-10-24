import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUndoStore } from '../../store/undoStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { taskService } from '../../services/taskService';
import { queryKeys } from '../../lib/queryClient';

const UNDO_WINDOW_MS = 10_000;

/**
 * Step 8: adds a shrinking progress bar under the pill (matches mockup).
 * The progress bar is purely visual — the authoritative clock remains
 * `pending.expiresAt` in the store.
 *
 * Behaviour unchanged: same useUndoStore selectors, same restore mutation,
 * same Ctrl/Cmd+Z handler (skipped inside input/textarea), same auto-clear
 * on token loss.
 */
const UndoToast = () => {
  const pending = useUndoStore((s) => s.pending);
  const clear = useUndoStore((s) => s.clearPending);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const [secondsLeft, setSecondsLeft] = useState(10);
  const [progressPct, setProgressPct] = useState(100);

  const restore = useMutation({
    mutationFn: (taskId: string) => taskService.restoreTask(token!, taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      pushToast('Task restored', 'success');
      clear();
    },
    onError: () => {
      pushToast('Could not restore the task', 'error');
      clear();
    },
  });

  useEffect(() => {
    if (!pending) return;
    const update = () => {
      const ms = pending.expiresAt - Date.now();
      if (ms <= 0) { clear(); return; }
      setSecondsLeft(Math.max(1, Math.ceil(ms / 1000)));
      setProgressPct(Math.max(0, Math.min(100, (ms / UNDO_WINDOW_MS) * 100)));
    };
    update();
    const interval = window.setInterval(update, 100);
    const onKey = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
      const tag = (document.activeElement as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      event.preventDefault();
      restore.mutate(pending.taskId);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.taskId, pending?.expiresAt]);

  useEffect(() => {
    if (!token && pending) clear();
  }, [token, pending, clear]);

  if (!pending) return null;

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[80] -translate-x-1/2 px-4"
      role="status"
      aria-live="polite"
    >
      <div className="relative flex items-center gap-3 overflow-hidden rounded-md border border-line bg-surface px-3 py-2 shadow-lg">
        <span className="max-w-[16rem] truncate text-[12px] text-ink-muted">
          Deleted <span className="font-medium text-ink">{pending.title}</span>
        </span>
        <button
          type="button"
          onClick={() => restore.mutate(pending.taskId)}
          disabled={restore.isPending}
          className="rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-ink-inverse transition-colors hover:bg-brand-hover disabled:opacity-60"
        >
          {restore.isPending ? 'Restoring…' : `Undo (${secondsLeft})`}
        </button>
        <div
          className="absolute bottom-0 left-0 h-0.5 bg-brand transition-[width] duration-100"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </div>
  );
};

export default UndoToast;