import React, { type CSSProperties, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { Task } from '../../types/task';
import { isOverdueTask } from '../../lib/taskCache';
import AssigneeChip from '../workspace/AssigneeChip';

interface KanbanCardBodyProps {
  task: Task;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (task: Task) => void;
  dragHandle?: ReactNode;
}

const categoryStyles: Record<string, string> = {
  work: 'bg-blue-500/10 text-blue-400',
  personal: 'bg-purple-500/10 text-purple-400',
  study: 'bg-emerald-500/10 text-emerald-400',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-line-subtle text-ink-muted',
  medium: 'bg-amber-500/10 text-amber-400',
  high: 'bg-red-500/10 text-red-400',
};

/** Presentational card - also used inside the DragOverlay. */
export const KanbanCardBody: React.FC<KanbanCardBodyProps> = ({
  task,
  isSelected,
  onToggleSelect,
  onEdit,
  dragHandle,
}) => {
  const overdue = isOverdueTask(task);
  const subtaskTotal = task.subtask_count ?? 0;
  const subtaskDone = task.subtasks_completed ?? 0;
  const subtaskPercent =
    subtaskTotal === 0 ? 0 : Math.round((subtaskDone / subtaskTotal) * 100);

  return (
    <div
      className={`card p-3 transition-shadow hover:shadow-lg ${
        isSelected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <div className="flex min-w-0 items-start gap-2">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => onToggleSelect(task.id)}
          aria-label={`Select ${task.title}`}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[#22c55e]"
        />
        <button
          type="button"
          onClick={() => onEdit(task)}
          className="min-w-0 flex-1 break-words text-left text-sm font-semibold text-ink transition-colors hover:text-accent-strong"
        >
          {task.title}
        </button>
        {dragHandle}
      </div>

      {task.description && (
        <p className="mt-2 line-clamp-2 text-xs text-ink-muted">{task.description}</p>
      )}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {task.category && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
              categoryStyles[task.category]
            }`}
          >
            {task.category}
          </span>
        )}
        {task.priority && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
              priorityStyles[task.priority]
            }`}
          >
            {task.priority}
          </span>
        )}
        {task.due_date && (
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              overdue
                ? 'bg-red-500/10 text-red-400'
                : 'bg-line-subtle text-ink-muted'
            }`}
          >
            {overdue ? 'Overdue ' : ''}
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
      </div>

      <AssigneeChip task={task} />

      {subtaskTotal > 0 && (
        <div className="mt-2 flex items-center gap-1.5">
          <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
            <span
              className="block h-full rounded-full bg-accent transition-all duration-300"
              style={{ width: `${subtaskPercent}%` }}
            />
          </span>
          <span className="shrink-0 text-[10px] font-medium text-ink-muted">
            {subtaskDone}/{subtaskTotal}
          </span>
        </div>
      )}
    </div>
  );
};

const KanbanCard: React.FC<KanbanCardBodyProps> = ({
  task,
  isSelected,
  onToggleSelect,
  onEdit,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task.id, data: { task } });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <KanbanCardBody
        task={task}
        isSelected={isSelected}
        onToggleSelect={onToggleSelect}
        onEdit={onEdit}
        dragHandle={
          <button
            type="button"
            aria-label={`Drag ${task.title}`}
            className="shrink-0 cursor-grab touch-none rounded-lg p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-accent-strong active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 4a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm0 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm9-13a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm-1 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm1 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
            </svg>
          </button>
        }
      />
    </div>
  );
};

export default KanbanCard;
