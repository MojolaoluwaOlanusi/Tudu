import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Task, Status } from '../../types/task';
import KanbanCard from './KanbanCard';

interface KanbanColumnProps {
  status: Status;
  title: string;
  tasks: Task[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onEdit: (task: Task) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({
  status,
  title,
  tasks,
  selectedIds,
  onToggleSelect,
  onEdit,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: status, data: { status } });

  return (
    <section className="flex min-h-[18rem] flex-col rounded-2xl border border-hairline bg-surface-2 p-3">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-handwritten text-xl text-ink">{title}</h3>
        <span className="rounded-full bg-surface px-2 py-0.5 text-xs font-semibold text-ink-muted">
          {tasks.length}
        </span>
      </header>

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
