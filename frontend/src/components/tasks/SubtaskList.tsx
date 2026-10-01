import React, { useState } from 'react';
import {
  useSubtasks,
  useCreateSubtask,
  useUpdateSubtask,
  useDeleteSubtask,
} from '../../hooks/useSubtasks';
import { Subtask } from '../../types/task';
import AiBreakdownModal from '../ai/AiBreakdownModal';

interface SubtaskListProps {
  taskId: string;
  /** View-only, e.g. a shared list the user cannot edit. */
  readOnly?: boolean;
  /** Parent task title, so the AI knows what it is breaking down. */
  taskTitle?: string;
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

const SubtaskList: React.FC<SubtaskListProps> = ({
  taskId,
  readOnly,
  taskTitle,
}) => {
  const { data: subtasks, isLoading, isError } = useSubtasks(taskId);
  const createSubtask = useCreateSubtask();
  const updateSubtask = useUpdateSubtask();
  const deleteSubtask = useDeleteSubtask();

  const [title, setTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [showBreakdown, setShowBreakdown] = useState(false);

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
                onChange={readOnly ? undefined : () => toggle(subtask)}
                disabled={readOnly}
                aria-label={subtask.title}
                className={`h-3.5 w-3.5 shrink-0 accent-[#22c55e] ${
                  readOnly ? 'cursor-default' : 'cursor-pointer'
                }`}
              />

              {readOnly ? (
                <span
                  className={`flex-1 text-xs ${
                    subtask.completed ? 'text-ink-muted line-through' : 'text-ink'
                  }`}
                >
                  {subtask.title}
                </span>
              ) : editingId === subtask.id ? (
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

              {!readOnly && (
                <button
                  type="button"
                  onClick={() => deleteSubtask.mutate({ taskId, subtaskId: subtask.id })}
                  aria-label={`Delete ${subtask.title}`}
                  className="shrink-0 rounded p-0.5 text-ink-muted transition-colors hover:text-red-500"
                >
                  <DeleteIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {/* Add a sub-task straight from the task view */}
      {!readOnly && (
        <>
          {taskTitle && (
            <button
              type="button"
              onClick={() => setShowBreakdown(true)}
              className="mb-2 inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-strong"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
              </svg>
              Break this down
            </button>
          )}

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

          {showBreakdown && taskTitle && (
            <AiBreakdownModal
              taskTitle={taskTitle}
              taskId={taskId}
              onClose={() => setShowBreakdown(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default SubtaskList;
