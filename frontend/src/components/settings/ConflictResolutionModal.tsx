import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  listConflicts,
  removeConflict,
  enqueue,
  type QueuedConflict,
} from '../../lib/offlineQueue';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';

interface Props {
  onClose: () => void;
  onResolved: () => void;
}

type Pick = 'mine' | 'theirs';

const ConflictResolutionModal: React.FC<Props> = ({ onClose, onResolved }) => {
  const token = useAuthStore((s) => s.token);
  const queryClient = useQueryClient();
  const pushToast = useUiStore((s) => s.pushToast);
  const [conflicts, setConflicts] = useState<QueuedConflict[]>([]);
  const [picks, setPicks] = useState<Record<string, Record<string, Pick>>>({});

  useEffect(() => {
    void (async () => {
      const list = await listConflicts();
      setConflicts(list);
      const initial: Record<string, Record<string, Pick>> = {};
      for (const c of list) {
        initial[c.id] = {};
        for (const f of c.conflictFields) initial[c.id][f] = 'mine';
      }
      setPicks(initial);
    })();
  }, []);

  const setPick = (conflictId: string, field: string, pick: Pick) => {
    setPicks((prev) => ({
      ...prev,
      [conflictId]: { ...prev[conflictId], [field]: pick },
    }));
  };

  const resolve = async (c: QueuedConflict, forceDiscard: boolean) => {
    if (forceDiscard) {
      await removeConflict(c.id);
      pushToast('Discarded queued change', 'info');
      onResolved();
      return;
    }
    const merged: Record<string, unknown> = {};
    for (const [field, value] of Object.entries(c.payload.task)) {
      const pick = picks[c.id]?.[field] ?? 'mine';
      merged[field] = pick === 'mine' ? value : c.currentState[field];
    }
    // Re-queue with the merged values and a fresh baseline of what the
    // server currently reports, so the next flush compares apples to apples.
    await enqueue({
      id: crypto.randomUUID(),
      type: 'update',
      payload: { id: c.payload.id, task: merged },
      baseline: Object.fromEntries(
        Object.keys(merged).map((f) => [f, c.currentState[f]]),
      ),
      createdAt: Date.now(),
    });
    await removeConflict(c.id);
    pushToast('Merged and requeued', 'success');
    onResolved();
  };

  const content = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/60"
      onClick={onClose}
      role="presentation"
      style={{ paddingTop: 'max(4rem, env(safe-area-inset-top, 0px) + 4rem)' }}
    >
      <div className="flex min-h-full items-start justify-center px-3 pb-8 sm:px-4">
        <div
          className="w-full max-w-2xl rounded-2xl border border-hairline bg-surface p-5 shadow-2xl sm:p-6"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Resolve offline conflicts"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-handwritten text-2xl text-ink">Resolve conflicts</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                These changes were made offline and clash with the server. Pick a value for each field.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
            >
              Close
            </button>
          </div>

          {conflicts.length === 0 ? (
            <p className="text-sm text-ink-muted">No conflicts.</p>
          ) : (
            <ul className="space-y-3">
              {conflicts.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-hairline bg-surface-2 p-4"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink">
                      {(c.currentState.title as string) || (c.payload.task.title as string) || 'Untitled task'}
                    </p>
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-400">
                      {c.conflictReason}
                    </span>
                  </div>
                  <table className="w-full text-xs">
                    <thead className="text-[10px] uppercase tracking-wide text-ink-muted">
                      <tr>
                        <th className="pb-1 text-left">Field</th>
                        <th className="pb-1 text-left">Yours</th>
                        <th className="pb-1 text-left">Theirs</th>
                        <th className="pb-1 text-right">Keep</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.conflictFields.map((field) => {
                        const mine = String(c.payload.task[field] ?? '—');
                        const theirs = String(c.currentState[field] ?? '—');
                        return (
                          <tr key={field} className="border-t border-hairline/50">
                            <td className="py-1 pr-2 font-mono text-[11px] text-ink-muted">
                              {field}
                            </td>
                            <td className="max-w-[12rem] truncate py-1 pr-2 text-ink">{mine}</td>
                            <td className="max-w-[12rem] truncate py-1 pr-2 text-ink">{theirs}</td>
                            <td className="py-1 text-right">
                              <div className="inline-flex overflow-hidden rounded-full border border-hairline">
                                <button
                                  type="button"
                                  onClick={() => setPick(c.id, field, 'mine')}
                                  className={
                                    'px-2 py-0.5 text-[10px] font-semibold ' +
                                    ((picks[c.id]?.[field] ?? 'mine') === 'mine'
                                      ? 'bg-accent text-white'
                                      : 'bg-surface text-ink-muted hover:text-ink')
                                  }
                                >
                                  Mine
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPick(c.id, field, 'theirs')}
                                  className={
                                    'px-2 py-0.5 text-[10px] font-semibold ' +
                                    (picks[c.id]?.[field] === 'theirs'
                                      ? 'bg-accent text-white'
                                      : 'bg-surface text-ink-muted hover:text-ink')
                                  }
                                >
                                  Theirs
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-3 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void resolve(c, true)}
                      className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300"
                    >
                      Discard all mine
                    </button>
                    <button
                      type="button"
                      onClick={() => void resolve(c, false)}
                      className="btn-accent rounded-full px-3 py-1.5 text-xs font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default ConflictResolutionModal;
