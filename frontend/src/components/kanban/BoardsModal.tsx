import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useBoards, useCreateBoard, useDeleteBoard, useRenameBoard } from '../../hooks/useBoards';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';
import { useConfirmStore } from '../../store/confirmStore';
import PublishTemplateModal from './PublishTemplateModal';
import FeatureGate from '../common/FeatureGate';

interface BoardsModalProps {
  onClose: () => void;
}

/** Create, rename and delete boards (personal, or inside a workspace). */
const BoardsModal: React.FC<BoardsModalProps> = ({ onClose }) => {
  const confirm = useConfirmStore((s) => s.confirm);
  const { data: boards = [] } = useBoards();
  const { data: workspaces = [] } = useWorkspaces();
  const createBoard = useCreateBoard();
  const renameBoard = useRenameBoard();
  const deleteBoard = useDeleteBoard();
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const pushToast = useUiStore((s) => s.pushToast);
  const [newName, setNewName] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [publishBoard, setPublishBoard] = useState<{ id: string; name: string } | null>(null);

  // Viewers cannot add boards to a workspace.
  const creatable = workspaces.filter((w) => w.role !== 'viewer');

  const fail = (err: unknown, fallback: string) => {
    const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
    pushToast(message || fallback, 'error');
  };

  const busy = createBoard.isPending || renameBoard.isPending || deleteBoard.isPending;

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createBoard.mutate(
      { name, workspaceId: workspaceId || undefined },
      {
        onSuccess: (board) => {
          setNewName('');
          setActiveBoard(board.id);
          pushToast(`Board "${board.name}" created`, 'success');
          onClose();
        },
        onError: (err) => fail(err, 'Could not create the board'),
      }
    );
  };

  const handleRename = (id: string, current: string, next: string) => {
    const name = next.trim();
    if (!name || name === current) return;
    renameBoard.mutate({ id, name }, { onError: (err) => fail(err, 'Could not rename the board') });
  };

  const handleDelete = async (id: string, name: string, taskCount: number) => {
    const ok = await confirm({
      title: `Delete "${name}"?`,
      message:
        taskCount > 0
          ? `This will also delete its ${taskCount} task${taskCount === 1 ? '' : 's'}. This cannot be undone.`
          : 'This cannot be undone.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteBoard.mutate(id, {
      onSuccess: () => pushToast(`Board "${name}" deleted`, 'success'),
      onError: (err) => fail(err, 'Could not delete the board'),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Manage boards"
      >
        <div className="mb-4 rounded-xl border border-line-subtle bg-surface-2/40 p-4">
          <div className="mb-3">
            <h3 className="text-sm font-semibold text-ink">Create a board</h3>
            <p className="mt-0.5 text-xs text-ink-muted">
              Name it and choose where it lives. Press Enter to create.
            </p>
          </div>

          <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              placeholder="New board name"
              maxLength={255}
              aria-label="New board name"
              className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
            />
            {creatable.length > 0 && (
              <select
                value={workspaceId}
                onChange={(event) => setWorkspaceId(event.target.value)}
                aria-label="Where to create the board"
                className="rounded-lg border border-hairline bg-surface px-2 py-2 text-sm text-ink"
              >
                <option value="">Personal</option>
                {creatable.map((w) => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            )}
            <button
              type="submit"
              disabled={!newName.trim() || busy}
              className="btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
            >
              Create board
            </button>
          </form>

          <div className="mt-3">
            <Link
              to="/settings/templates"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-brand hover:text-brand"
            >
              Browse templates
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <ul className="space-y-2">
          {boards.map((board) => {
            const isAdmin = (board.role ?? 'admin') === 'admin';
            return (
              <li
                key={board.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3"
              >
                <input
                  type="text"
                  defaultValue={board.name}
                  key={`${board.id}-${board.name}`}
                  maxLength={255}
                  readOnly={!isAdmin}
                  aria-label={`Name of ${board.name}`}
                  onBlur={(event) => isAdmin && handleRename(board.id, board.name, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                  className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
                />
                <span className="text-[11px] text-ink-muted">
                  {board.workspace_name ? `${board.workspace_name} · ` : ''}
                  {board.task_count ?? 0} task{(board.task_count ?? 0) === 1 ? '' : 's'}
                </span>
                {isAdmin && (
                  <>
                    <FeatureGate
                      feature="templates.publish"
                      fallback={
                        <button
                          type="button"
                          onClick={() => {
                            window.location.href = '/pricing';
                          }}
                          className="flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-accent hover:text-ink"
                          title="Upgrade to Pro to publish templates to the marketplace"
                        >
                          Publish
                          <span className="rounded-full bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent-strong">
                            Pro
                          </span>
                        </button>
                      }
                    >
                      <button
                        type="button"
                        onClick={() => setPublishBoard({ id: board.id, name: board.name })}
                        disabled={busy}
                        className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-accent-strong hover:border-accent disabled:opacity-40"
                      >
                        Publish
                      </button>
                    </FeatureGate>
                    <button
                      type="button"
                      onClick={() => handleDelete(board.id, board.name, board.task_count ?? 0)}
                      disabled={busy}
                      aria-label={`Delete ${board.name}`}
                      className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-400 hover:border-red-300 disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {publishBoard && <PublishTemplateModal boardId={publishBoard.id} initialName={publishBoard.name} onClose={() => setPublishBoard(null)} />}
    </div>
  );
};

export default BoardsModal;