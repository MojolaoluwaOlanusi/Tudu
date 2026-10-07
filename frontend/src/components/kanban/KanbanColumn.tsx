import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task } from '../../types/task';
import { ColumnLike } from './logic';
import KanbanCard from './KanbanCard';

/**
 * Column accents, as explicit hex rather than Tailwind class names: those
 * would be assembled at runtime, so the JIT build could never see them and
 * would purge every one of them from the stylesheet.
 */
export const COLUMN_COLOR_HEX: Record<string, string> = {
  gray: '#94a3b8',
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  green: '#22c55e',
  teal: '#14b8a6',
  blue: '#3b82f6',
  violet: '#8b5cf6',
  pink: '#ec4899',
};

interface KanbanColumnProps {
  column: ColumnLike;
  tasks: Task[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onEdit: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  column,
  tasks,
  selectedIds,
  onToggleSelect,
  onEdit,
}) => {
  // The droppable id is the column id rather than its stage: two columns may
  // share a stage ("Doing" and "In review"), and dnd-kit ids must be unique.
  const { setNodeRef, isOver } = useDroppable({ id: column.id, data: { column } });

  const accent = COLUMN_COLOR_HEX[column.color ?? 'gray'] ?? COLUMN_COLOR_HEX.gray;
  const atLimit = column.over_wip_limit === true;

  return (
    <section
      className="flex min-h-[18rem] flex-col rounded-2xl border border-hairline bg-surface-2 p-3"
      data-tour="kanban-column"
      data-column-id={column.id}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex min-w-0 items-center gap-2 font-handwritten text-xl text-ink">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: accent }}
          />
          <span className="truncate">{column.name}</span>
        </h3>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
            atLimit ? 'bg-red-500/15 text-red-500' : 'bg-surface text-ink-muted'
          }`}
          title={
            column.wip_limit
              ? `${tasks.length} of ${column.wip_limit} WIP limit`
              : `${tasks.length} task${tasks.length === 1 ? '' : 's'}`
          }
        >
          {column.wip_limit ? `${tasks.length}/${column.wip_limit}` : tasks.length}
        </span>
      </header>

      {atLimit && (
        <p className="mb-2 rounded-lg bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
          WIP limit reached
        </p>
      )}

      <div
        ref={setNodeRef}
        className={`flex-1 rounded-xl transition-colors duration-200 ${
          isOver ? 'bg-accent-soft ring-2 ring-accent' : ''
        }`}
      >
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-2">
            {tasks.length === 0 ? (
              <p className="rounded-xl border border-dashed border-hairline p-6 text-center text-xs text-ink-muted">
                {isOver ? 'Drop here' : 'No tasks'}
              </p>
            ) : (
              tasks.map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  isSelected={selectedIds.includes(task.id)}
                  onToggleSelect={onToggleSelect}
                  onEdit={onEdit}
                />
              ))
            )}
          </div>
        </SortableContext>
      </div>
    </section>
  );
};

export default KanbanColumn;
