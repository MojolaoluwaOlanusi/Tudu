import React, { type CSSProperties, type ReactNode } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format } from 'date-fns';
import { Task } from '../../types/task';
import { isOverdueTask } from '../../lib/taskCache';

interface KanbanCardBodyProps {
  task: Task;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (task: Task) => void;
  dragHandle?: ReactNode;
}

const categoryStyles: Record<string, string> = {
  work: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200',
  personal: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200',
  study: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200',
};

const priorityStyles: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200',
  high: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
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

  return (
    <div
      className={`card p-3 transition-shadow hover:shadow-lg ${
        isSelected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <div className="flex items-start gap-2">
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
          className="flex-1 text-left text-sm font-semibold text-ink transition-colors hover:text-accent-strong"
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
                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200'
                : 'bg-surface-2 text-ink-muted'
            }`}
          >
            {overdue ? 'Overdue ' : ''}
            {format(new Date(task.due_date), 'MMM d')}
          </span>
        )}
      </div>
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
