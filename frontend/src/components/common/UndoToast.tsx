import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useUndoStore } from '../../store/undoStore';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { taskService } from '../../services/taskService';
import { queryKeys } from '../../lib/queryClient';

const UNDO_WINDOW_MS = 10_000;

/**
 * Bottom-centred toast that offers to undo the last delete.
 *
 * The pending state lives in `useUndoStore` so the toast can be rendered at
 * the top of the app (next to ToastContainer) rather than from the component
 * that triggered the delete — otherwise navigating away would lose the undo.
 *
 * The countdown is redrawn four times a second so the button label is smooth,
 * but the authoritative clock is the store's `expiresAt`; a slow tick only
 * affects the displayed number, never whether the undo is accepted.
 */
const UndoToast = () => {
  const pending = useUndoStore((s) => s.pending);
  const clear = useUndoStore((s) => s.clearPending);
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const [secondsLeft, setSecondsLeft] = useState(10);

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
      if (ms <= 0) {
        clear();
        return;
      }
      setSecondsLeft(Math.max(1, Math.ceil(ms / 1000)));
    };

    update();
    const interval = window.setInterval(update, 250);

    // Ctrl/Cmd+Z, but only when focus is not inside a text field so the
    // browser's native undo in an input or textarea still works.
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
    // `pending.taskId` is included so the effect re-runs when a different
    // task replaces the current one; `restore` is stable across renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.taskId, pending?.expiresAt]);

  // Logout or token loss hides any outstanding toast.
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
      <div className="flex items-center gap-3 rounded-full border border-hairline bg-surface-2 px-4 py-2.5 shadow-lg">
        <span className="max-w-[16rem] truncate text-sm text-ink">
          Deleted <span className="font-semibold">“{pending.title}”</span>
        </span>
        <button
          type="button"
          onClick={() => restore.mutate(pending.taskId)}
          disabled={restore.isPending}
          className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
        >
          {restore.isPending ? 'Restoring…' : `Undo (${secondsLeft})`}
        </button>
      </div>
    </div>
  );
};

export default UndoToast;
