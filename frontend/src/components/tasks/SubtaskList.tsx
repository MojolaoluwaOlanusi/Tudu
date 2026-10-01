import React, { useState } from 'react';
import {
  useSubtasks,
  useCreateSubtask,
  useUpdateSubtask,
  useDeleteSubtask,
} from '../../hooks/useSubtasks';
import { Subtask } from '../../types/task';

interface SubtaskListProps {
  taskId: string;
}

const DeleteIcon: React.FC = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    viewBox="0 0 24 24"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

const SubtaskList: React.FC<SubtaskListProps> = ({ taskId }) => {
  const { data: subtasks, isLoading, isError } = useSubtasks(taskId);
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();

  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const total = subtasks?.length ?? 0;
  const completed = subtasks?.filter((subtask) => subtask.completed).length ?? 0;
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    setTitle('');
    try {
      await createSubtask.mutateAsync({ taskId, title: trimmed });
    } catch {
      setTitle(trimmed);
    }
  };

  const startEditing = (subtask: Subtask) => {
    setEditingId(subtask.id);
    setEditingTitle(subtask.title);
  };

  const commitEdit = async () => {
    if (!editingId) return;
    const trimmed = editingTitle.trim();
    if (trimmed) {
      try {
        await updateSubtask.mutateAsync({
          taskId,
          subtaskId: editingId,
          updates: { title: trimmed },
        });
      } catch {
        /* keep editing on failure */
      }
    }
    setEditingId(null);
  };

  const toggle = (subtask: Subtask) =>
    updateSubtask.mutate({
      taskId,
      subtaskId: subtask.id,
      updates: { completed: !subtask.completed },
    });

  if (isLoading) {
    return <p className="py-2 text-xs text-ink-muted">Loading sub-tasks…</p>;
  }

  if (isError) {
    return <p className="py-2 text-xs text-red-500">Could not load sub-tasks.</p>;
  }

  return (
    <div className="mt-2">
      {/* Progress: "3/5 completed" */}
      {total > 0 && (
        <div className="mb-2 flex items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
          <span className="shrink-0 text-[11px] font-medium text-ink-muted">
            {completed}/{total} completed
          </span>
        </div>
      )}

      {/* Checklist */}
      {subtasks && subtasks.length > 0 && (
        <ul className="mb-2 space-y-1">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={subtask.completed}
                onChange={() => toggle(subtask)}
                aria-label={subtask.title}
                className="h-3.5 w-3.5 shrink-0 cursor-pointer accent-[#22c55e]"
              />

              {editingId === subtask.id ? (
                <input
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      commitEdit();
                    }
                    if (e.key === 'Escape') setEditingId(null);
                  }}
                  autoFocus
                  className="flex-1 rounded border border-hairline bg-surface px-1.5 py-0.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => startEditing(subtask)}
                  title="Click to rename"
                  className={`flex-1 text-left text-xs transition-colors hover:text-accent-strong ${
                    subtask.completed
                      ? 'text-ink-muted line-through'
                      : 'text-ink'
                  }`}
                >
                  {subtask.title}
                </button>
              )}

              <button
                type="button"
                onClick={() => deleteSubtask.mutate({ taskId, subtaskId: subtask.id })}
                aria-label={`Delete ${subtask.title}`}
                className="shrink-0 rounded p-0.5 text-ink-muted transition-colors hover:text-red-500"
              >
                <DeleteIcon />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add a sub-task straight from the task view */}
      <form onSubmit={handleAdd} className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a sub-task…"
          aria-label="New sub-task"
          className="flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={!title.trim() || createSubtask.isPending}
          className="shrink-0 rounded-lg bg-accent px-2.5 py-1.5 text-xs font-semibold text-white transition-opacity disabled:opacity-50"
        >
          Add
        </button>
      </form>
    </div>
  );
};

export default SubtaskList;
