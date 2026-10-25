import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Pencil, Trash2, ChevronRight } from 'lucide-react';
import { Task, Category, Priority } from '../../types/task';
import SubtaskList from './SubtaskList';
import TaskActivity from '../activity/TaskActivity';
import StartPomodoroButton from '../pomodoro/StartPomodoroButton';
import StartTimerButton from '../time/StartTimerButton';
import { useFeatureFlag } from '../../hooks/useFeatureFlag';
import PomodoroTimer from '../pomodoro/PomodoroTimer';
import CheckPop from '../common/CheckPop';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { useUiStore } from '../../store/uiStore';

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: Task['status']) => void;
  isShared?: boolean;
  readOnlySubtasks?: boolean;
}

const categoryColors: Record<Category, string> = {
  work: 'bg-blue-500/10 text-blue-400',
  personal: 'bg-purple-500/10 text-purple-400',
  study: 'bg-emerald-500/10 text-emerald-400',
};

const priorityColors: Record<Priority, string> = {
  low: 'bg-line-subtle text-ink-muted',
  medium: 'bg-amber-500/10 text-amber-400',
  high: 'bg-red-500/10 text-red-400',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onEdit,
  onDelete,
  onStatusChange,
  isShared,
  readOnlySubtasks,
}) => {
  const isOverdue =
    !!task.due_date &&
    new Date(task.due_date) < new Date() &&
    task.status !== 'done';
  const [showSubtasks, setShowSubtasks] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const activeTaskId = usePomodoroStore((state) => state.taskId);
  const sessionActive = usePomodoroStore((state) => state.sessionId !== null);
  const hasTimeTracking = useFeatureFlag('time.tracking');

  const subtaskTotal = task.subtask_count ?? 0;
  const subtaskDone = task.subtasks_completed ?? 0;
  const subtaskPercent =
    subtaskTotal === 0 ? 0 : Math.round((subtaskDone / subtaskTotal) * 100);

  const [celebrated, setCelebrated] = useState(task.status === 'done');
  useEffect(() => {
    if (task.status === 'done' && !celebrated) {
      setCelebrated(true);
    } else if (task.status !== 'done') {
      setCelebrated(false);
    }
  }, [task.status, celebrated]);

  const copyId = () => {
    if (task.short_id == null) return;
    try {
      navigator.clipboard.writeText(`TUDU-${task.short_id}`);
      useUiStore.getState().pushToast('Task ID copied', 'info');
    } catch {
      /* clipboard unavailable in some browsers */
    }
  };

  return (
    <div className="card p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg" data-tour="task-card">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          {task.short_id != null && (
            <button
              type="button"
              onClick={copyId}
              title="Copy Task ID for GitHub"
              className="self-start rounded bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink-muted transition-colors hover:text-ink"
            >
              TUDU-{task.short_id}
            </button>
          )}
          <div className="flex min-w-0 items-start gap-2">
            {task.status === 'done' && (
              <span className="mt-0.5">
                <CheckPop
                  key={`${task.id}-${celebrated ? 'done' : 'open'}`}
                  size={20}
                  animate
                />
              </span>
            )}
            <h3
              className={
                'min-w-0 flex-1 text-base font-semibold transition-colors ' +
                (task.status === 'done'
                  ? 'text-ink-muted line-through'
                  : 'text-ink')
              }
            >
              {task.title}
            </h3>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(task)}
              title="Edit"
              aria-label="Edit task"
              className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-subtle hover:text-brand"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(task.id)}
              title="Delete"
              aria-label="Delete task"
              className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="mb-3 text-sm leading-relaxed text-ink-muted">
          {task.description}
        </p>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {isShared && (
          <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-[11px] font-medium text-brand">
            Shared
          </span>
        )}
        {task.category && (
          <span
            className={
              'rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ' +
              (categoryColors[task.category] ?? 'bg-line-subtle text-ink-muted')
            }
          >
            {task.category}
          </span>
        )}
        {task.priority && (
          <span
            className={
              'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
              (priorityColors[task.priority] ?? 'bg-line-subtle text-ink-muted')
            }
          >
            {PRIORITY_LABEL[task.priority] ?? task.priority}
          </span>
        )}
        {task.due_date && (
          <span
            className={
              'rounded-full px-2 py-0.5 text-[11px] font-medium ' +
              (isOverdue
                ? 'bg-red-500/10 text-red-400'
                : 'bg-line-subtle text-ink-muted')
            }
          >
            {isOverdue ? 'Overdue: ' : ''}
            {format(new Date(task.due_date), 'MMM d, h:mm a')}
          </span>
        )}
      </div>

      <div className="mb-3 border-t border-line-subtle pt-3">
        <button
          type="button"
          onClick={() => setShowSubtasks((v) => !v)}
          aria-expanded={showSubtasks}
          data-tour="subtasks"
          className="flex w-full items-center gap-2 text-left"
        >
          <ChevronRight
            className={
              'h-3.5 w-3.5 shrink-0 text-ink-muted transition-transform ' +
              (showSubtasks ? 'rotate-90' : '')
            }
          />
          <span className="text-xs font-semibold text-ink">Sub-tasks</span>
          {subtaskTotal > 0 ? (
            <>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line-subtle">
                <span
                  className="block h-full rounded-full bg-brand transition-all"
                  style={{ width: `${subtaskPercent}%` }}
                />
              </span>
              <span className="shrink-0 text-[11px] font-medium text-ink-muted tabular-nums">
                {subtaskDone}/{subtaskTotal}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-ink-muted">Add steps</span>
          )}
        </button>
        {showSubtasks && (
          <div className="mt-2 pl-5">
            <SubtaskList
              taskId={task.id}
              readOnly={readOnlySubtasks}
              taskTitle={task.title}
            />
          </div>
        )}
      </div>

      {!readOnlySubtasks && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StartPomodoroButton taskId={task.id} />
          {hasTimeTracking && (
            <StartTimerButton taskId={task.id} taskTitle={task.title} />
          )}
          {sessionActive && activeTaskId === task.id && <PomodoroTimer />}
        </div>
      )}

      <div className="mb-3">
        <button
          type="button"
          onClick={() => setShowActivity((v) => !v)}
          aria-expanded={showActivity}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-muted transition-colors hover:text-brand"
        >
          <ChevronRight
            className={
              'h-3 w-3 transition-transform ' +
              (showActivity ? 'rotate-90' : '')
            }
          />
          Activity
        </button>
        {showActivity && (
          <div className="mt-2 rounded-lg bg-raised p-2.5">
            <TaskActivity taskId={task.id} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {onStatusChange ? (
          <select
            value={task.status}
            onChange={(e) =>
              onStatusChange(task.id, e.target.value as Task['status'])
            }
            aria-label="Change task status"
            className="rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
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
