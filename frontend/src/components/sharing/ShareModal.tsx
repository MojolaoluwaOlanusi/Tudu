import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLookupUser, useCreateShare } from '../../hooks/useSharing';
import { useUiStore } from '../../store/uiStore';
import { Task } from '../../types/task';
import { SharePermission } from '../../types/share';
import Avatar from './Avatar';

interface ShareModalProps {
  tasks: Task[];
}

/**
 * Step 11 polish. Same hooks and handlers as before, but the panel is an
 * explicit `rounded-2xl border border-hairline bg-surface` instead of
 * `.card` (the brush edge clashes with the pop-in), the lookup result is
 * shown as an avatar pill instead of a bare "Found:" line, the empty
 * state is friendlier, and the primary CTA picks up the brush stroke.
 */
const ShareModal: React.FC<ShareModalProps> = ({ tasks }) => {
  const closeShareModal = useUiStore((s) => s.closeShareModal);
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [permission, setPermission] = useState<SharePermission>('read_write');
  const [error, setError] = useState('');

  const debouncedEmail = useDebouncedValue(email, 400);
  const lookup = useLookupUser(debouncedEmail);
  const createShare = useCreateShare();

  const allSelected = tasks.length > 0 && selected.length === tasks.length;

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleAll = () =>
    setSelected(allSelected ? [] : tasks.map((task) => task.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (selected.length === 0) {
      setError('Select at least one task to share');
      return;
    }
    try {
      await createShare.mutateAsync({
        email: debouncedEmail.trim(),
        taskIds: selected,
        permissions: permission,
      });
      closeShareModal();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Could not share the list');
    }
  };

  return (
    <div
      className="scrim fixed inset-0 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share list"
    >
      <div className="animate-pop-in w-full max-w-lg rounded-2xl border border-hairline bg-surface p-5 shadow-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-handwritten text-2xl text-ink">Share your list</h3>
            <p className="mt-1 text-xs text-ink-muted">
              Pick the tasks you want to share, then send the invitation.
            </p>
          </div>
          <button
            type="button"
            onClick={closeShareModal}
            aria-label="Close"
            className="shrink-0 rounded-full p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="share-email">
              Share with
            </label>
            <input
              id="share-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              className="input"
            />
            {lookup.data && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-brand/40 bg-brand-subtle/20 px-2.5 py-1">
                <Avatar user={lookup.data} size="h-5 w-5" />
                <span className="text-[11px] font-medium text-ink">
                  {lookup.data.name || lookup.data.email}
                </span>
                <Check className="h-3 w-3 text-brand" strokeWidth={2.5} />
              </div>
            )}
            {lookup.isError && (
              <p className="mt-1 text-[11px] text-red-400">
                No user found with that email
              </p>
            )}
          </div>

          <div>
            <label className="label" htmlFor="share-permission">
              Permission
            </label>
            <select
              id="share-permission"
              value={permission}
              onChange={(e) => setPermission(e.target.value as SharePermission)}
              className="input"
            >
              <option value="read_write">Can edit</option>
              <option value="read">View only</option>
            </select>
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="label mb-0">
                Tasks ({selected.length} selected)
              </span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-[11px] font-medium text-brand hover:text-brand-hover"
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-line-subtle bg-canvas p-2">
              {tasks.length === 0 ? (
                <p className="px-2 py-3 text-center text-[11px] text-ink-faint">
                  You have no tasks to share yet.
                </p>
              ) : (
                tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(task.id)}
                      onChange={() => toggle(task.id)}
                      className="h-3.5 w-3.5 accent-brand"
                    />
                    <span className="min-w-0 flex-1 truncate text-xs text-ink">
                      {task.title}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wider text-ink-faint">
                      {task.status}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-400/40 bg-red-500/10 p-2.5 text-xs text-red-400">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={closeShareModal} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createShare.isPending || !debouncedEmail.trim()}
              className="btn-accent brush-stroke"
            >
              {createShare.isPending ? 'Sharing…' : 'Share'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ShareModal;