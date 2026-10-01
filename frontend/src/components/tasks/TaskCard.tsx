import React, { useState } from 'react';
import { Task, Category, Priority } from '../../types/task';
import { format } from 'date-fns';
import SubtaskList from './SubtaskList';

interface TaskCardProps {
  task: Task;
  /** Omit a handler to hide that control (e.g. on a shared list). */
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: Task['status']) => void;
  /** True when this task has been shared with a collaborator. */
  isShared?: boolean;
  /** Show sub-tasks but do not allow changing them. */
  readOnlySubtasks?: boolean;
}

const categoryColors: Record<Category, string> = {
  work: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  personal: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  study: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
};

const priorityColors: Record<Priority, string> = {
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete, onStatusChange, isShared, readOnlySubtasks }) => {
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';
  const [showSubtasks, setShowSubtasks] = useState(false);

  const subtaskTotal = task.subtask_count ?? 0;
  const subtaskDone = task.subtasks_completed ?? 0;
  const subtaskPercent =
    subtaskTotal === 0 ? 0 : Math.round((subtaskDone / subtaskTotal) * 100);

  return (
    <div className="rounded-2xl border border-hairline border-l-4 border-l-accent bg-surface p-4 shadow-surface transition-all hover:shadow-lg">
      <div className="mb-2 flex items-start justify-between gap-3">
        <h3 className="flex-1 font-semibold text-ink">{task.title}</h3>
        <div className="flex shrink-0 gap-1">
          {onEdit && (
            <button
              onClick={() => onEdit(task)}
              className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-accent-soft hover:text-accent-strong"
              title="Edit"
              aria-label="Edit task"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(task.id)}
              className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-300"
              title="Delete"
              aria-label="Delete task"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="mb-3 text-sm text-ink-muted">{task.description}</p>
      )}

      <div className="flex flex-wrap gap-2 mb-3">
        {isShared && (
          <span className="rounded-full bg-accent-soft px-2 py-1 text-[10px] font-semibold uppercase text-accent-strong">
            Shared
          </span>
        )}
        {task.category && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${categoryColors[task.category]}`}>
            {task.category}
          </span>
        )}
        {task.priority && (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
            {task.priority}
          </span>
        )}
        {task.due_date && (
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${isOverdue ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200' : 'bg-surface-2 text-ink-muted'}`}>
            {isOverdue ? 'Overdue: ' : ''}{format(new Date(task.due_date), 'MMM d, yyyy, h:mm a')}
          </span>
        )}
      </div>

      {/* Sub-tasks: collapsible checklist with progress. The toggle is always
          visible so a brand new task can get its first sub-task. */}
      <div className="mb-3 border-t border-hairline pt-3">
        <button
          type="button"
          onClick={() => setShowSubtasks((open) => !open)}
          aria-expanded={showSubtasks}
          className="flex w-full items-center gap-2 text-left"
        >
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ${
              showSubtasks ? 'rotate-90' : ''
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <path d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-xs font-semibold text-ink">Sub-tasks</span>

          {subtaskTotal > 0 ? (
            <>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                <span
                  className="block h-full rounded-full bg-accent transition-all duration-300"
                  style={{ width: `${subtaskPercent}%` }}
                />
              </span>
              <span className="shrink-0 text-[11px] font-medium text-ink-muted">
                {subtaskDone}/{subtaskTotal}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-ink-muted">Add steps</span>
          )}
        </button>

        {showSubtasks && (
          <SubtaskList taskId={task.id} readOnly={readOnlySubtasks} />
        )}
      </div>

      <div className="flex items-center gap-2">
        {onStatusChange ? (
          <select
            value={task.status}
            onChange={(e) => onStatusChange(task.id, e.target.value as Task['status'])}
            className="rounded-lg border border-hairline bg-surface px-2.5 py-1 text-sm text-ink"
          >
            <option value="todo">To-do</option>
            <option value="doing">Doing</option>
            <option value="done">Done</option>
          </select>
        ) : (
          <span className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium uppercase text-ink-muted">
            {task.status}
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
