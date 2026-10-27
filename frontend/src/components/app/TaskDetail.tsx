import React, { useEffect, useState } from 'react';
import { X, ChevronRight, Timer as TimerIcon, Clock, Trash2 } from 'lucide-react';
import { useUpdateTask, useDeleteTask } from '../../hooks/useTasks';
import { useStartPomodoro } from '../../hooks/usePomodoro';
import { useStartTimer } from '../../hooks/useTime';
import { useUndoStore } from '../../store/undoStore';
import { useUiStore } from '../../store/uiStore';
import { useConfirmStore } from '../../store/confirmStore';
import AssigneeChip from '../workspace/AssigneeChip';
import SubtaskList from '../tasks/SubtaskList';
import TaskActivity from '../activity/TaskActivity';
import type { Task, Status, Category, Priority } from '../../types/task';

const FIELD_LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-ink-faint';

const toDateTimeLocal = (value?: string | null): string => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
};

interface TaskDetailProps {
  task: Task;
  onClose: () => void;
}

/**
 * The right-hand task editing panel (mockup's `TaskDetail`).
 *
 * Uses the same mutations as the modal `TaskForm` so behaviour is
 * identical; the only thing that changes is how the fields are laid
 * out on screen.
 */
const TaskDetail: React.FC<TaskDetailProps> = ({ task, onClose }) => {
  const confirm = useConfirmStore((s) => s.confirm);
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const startPomodoro = useStartPomodoro();
  const startTimer = useStartTimer();
  const setPendingUndo = useUndoStore((s) => s.setPending);
  const pushToast = useUiStore((s) => s.pushToast);

  const [title, setTitle] = useState(task.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [description, setDescription] = useState(task.description ?? '');
  const [showSubtasks, setShowSubtasks] = useState(true);
  const [showActivity, setShowActivity] = useState(false);

  // Reset local state when the panel switches to a different task.
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description ?? '');
    setEditingTitle(false);
  }, [task.id, task.title, task.description]);

  const saveTitle = () => {
    const trimmed = title.trim();
    if (!trimmed) {
      setTitle(task.title);
      setEditingTitle(false);
      return;
    }
    if (trimmed !== task.title) updateTask.mutate({ id: task.id, task: { title: trimmed } });
    setEditingTitle(false);
  };

  const saveDescription = () => {
    if ((description ?? '') !== (task.description ?? '')) {
      updateTask.mutate({ id: task.id, task: { description: description || undefined } });
    }
  };

  const setStatus = (status: Status) => updateTask.mutate({ id: task.id, task: { status } });
  const setCategory = (category: Category | '') =>
    updateTask.mutate({ id: task.id, task: { category: category || undefined } });
  const setPriority = (priority: Priority | '') =>
    updateTask.mutate({ id: task.id, task: { priority: priority || undefined } });
  const setDueDate = (value: string) =>
    updateTask.mutate({
      id: task.id,
      task: { due_date: value ? new Date(value).toISOString() : (undefined as any) },
    });

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Delete task?',
      message: 'You can undo this from the toast for 10 seconds.',
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        setPendingUndo({
          taskId: task.id,
          title: task.title,
          expiresAt: Date.now() + 10_000,
        });
        onClose();
      },
      onError: () => pushToast('Could not delete the task', 'error'),
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line-subtle px-4">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Task detail
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-hidden">
        <div className="space-y-5 p-4">
          {/* Title */}
          <div>
            {editingTitle ? (
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={saveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveTitle();
                  if (e.key === 'Escape') {
                    setTitle(task.title);
                    setEditingTitle(false);
                  }
                }}
                className="input"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingTitle(true)}
                className={
                  'w-full text-left text-base font-semibold ' +
                  (task.status === 'done' ? 'text-ink-faint line-through' : 'text-ink')
                }
              >
                {task.title}
              </button>
            )}
          </div>

          {/* Description */}
          <div>
            <p className={FIELD_LABEL + ' mb-1.5'}>Description</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={saveDescription}
              rows={3}
              placeholder="Add a description..."
              className="w-full resize-none rounded-md border border-line bg-surface px-2.5 py-2 text-[12px] text-ink placeholder:text-ink-faint focus:border-brand focus:outline-none"
            />
          </div>

          {/* Subtasks */}
          <div>
            <button
              type="button"
              onClick={() => setShowSubtasks((v) => !v)}
              aria-expanded={showSubtasks}
              className="flex w-full items-center gap-1.5 text-left"
            >
              <ChevronRight
                className={
                  'h-3 w-3 shrink-0 text-ink-faint transition-transform ' +
                  (showSubtasks ? 'rotate-90' : '')
                }
              />
              <span className={FIELD_LABEL}>Subtasks</span>
            </button>
            {showSubtasks && (
              <div className="mt-2">
                <SubtaskList taskId={task.id} taskTitle={task.title} />
              </div>
            )}
          </div>

          {/* Activity */}
          <div>
            <button
              type="button"
              onClick={() => setShowActivity((v) => !v)}
              aria-expanded={showActivity}
              className="flex w-full items-center gap-1.5 text-left"
            >
              <ChevronRight
                className={
                  'h-3 w-3 shrink-0 text-ink-faint transition-transform ' +
                  (showActivity ? 'rotate-90' : '')
                }
              />
              <span className={FIELD_LABEL}>Activity</span>
            </button>
            {showActivity && (
              <div className="mt-2 rounded-lg bg-raised p-2.5">
                <TaskActivity taskId={task.id} />
              </div>
            )}
          </div>

          {/* Timers */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => startPomodoro.mutate({ taskId: task.id })}
              disabled={startPomodoro.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-brand hover:text-brand disabled:opacity-50"
            >
              <TimerIcon className="h-3 w-3" />
              Start 25m
            </button>
            <button
              type="button"
              onClick={() => startTimer.mutate({ taskId: task.id })}
              disabled={startTimer.isPending}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-ink-muted transition-colors hover:border-doing hover:text-doing disabled:opacity-50"
            >
              <Clock className="h-3 w-3" />
              Start timer
            </button>
          </div>

          {/* Fields */}
          <div className="space-y-1.5 border-t border-line-subtle pt-3">
            <div className="flex items-center justify-between gap-2">
              <span className={FIELD_LABEL}>Status</span>
              <select
                value={task.status}
                onChange={(e) => setStatus(e.target.value as Status)}
                aria-label="Change task status"
                className="rounded bg-surface text-[12px] text-ink focus:outline-none"
              >
                <option value="todo">To-do</option>
                <option value="doing">Doing</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={FIELD_LABEL}>Category</span>
              <select
                value={task.category ?? ''}
                onChange={(e) => setCategory(e.target.value as Category | '')}
                className="rounded bg-surface text-[12px] text-ink focus:outline-none"
              >
                <option value="">None</option>
                <option value="work">Work</option>
                <option value="personal">Personal</option>
                <option value="study">Study</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={FIELD_LABEL}>Priority</span>
              <select
                value={task.priority ?? ''}
                onChange={(e) => setPriority(e.target.value as Priority | '')}
                className="rounded bg-surface text-[12px] text-ink focus:outline-none"
              >
                <option value="">None</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className={FIELD_LABEL}>Due</span>
              <input
                type="datetime-local"
                value={toDateTimeLocal(task.due_date)}
                onChange={(e) => setDueDate(e.target.value)}
                className="rounded bg-surface text-[12px] text-ink focus:outline-none"
              />
            </div>
          </div>

          {/* Assignee (only meaningful on team boards) */}
          <div className="border-t border-line-subtle pt-3">
            <AssigneeChip task={task} />
          </div>

          {/* Delete */}
          <div className="border-t border-line-subtle pt-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteTask.isPending}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete task
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskDetail;
