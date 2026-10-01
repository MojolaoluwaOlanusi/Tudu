import React, { useState } from 'react';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { useLookupUser, useCreateShare } from '../../hooks/useSharing';
import { useUiStore } from '../../store/uiStore';
import { Task } from '../../types/task';
import { SharePermission } from '../../types/share';

interface ShareModalProps {
  tasks: Task[];
}

/** Invite a collaborator to view (or edit) a selection of your tasks. */
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
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const toggleAll = () => setSelected(allSelected ? [] : tasks.map((task) => task.id));

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
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Share list"
    >
      <div className="card animate-fade-in w-full max-w-lg p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-handwritten text-2xl text-ink">Share your list</h3>
          <button
            type="button"
            onClick={closeShareModal}
            aria-label="Close"
            className="rounded-lg p-1 text-ink-muted hover:text-ink"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="share-email">
              Share with (email)
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
              <p className="mt-1 text-xs font-medium text-accent-strong">
                Found: {lookup.data.name || lookup.data.email}
              </p>
            )}
            {lookup.isError && (
              <p className="mt-1 text-xs text-red-500">No user found with that email</p>
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
              <span className="label mb-0">Tasks ({selected.length} selected)</span>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs font-medium text-accent-strong hover:text-accent"
              >
                {allSelected ? 'Clear all' : 'Select all'}
              </button>
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-hairline p-2">
              {tasks.length === 0 ? (
                <p className="p-2 text-xs text-ink-muted">You have no tasks to share yet.</p>
              ) : (
                tasks.map((task) => (
                  <label
                    key={task.id}
                    className="flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-surface-2"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(task.id)}
                      onChange={() => toggle(task.id)}
                      className="h-3.5 w-3.5 accent-[#22c55e]"
                    />
                    <span className="flex-1 truncate text-xs text-ink">{task.title}</span>
                    <span className="text-[10px] uppercase text-ink-muted">{task.status}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-red-100 p-2 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button type="button" onClick={closeShareModal} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createShare.isPending || !debouncedEmail.trim()}
              className="btn-accent"
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