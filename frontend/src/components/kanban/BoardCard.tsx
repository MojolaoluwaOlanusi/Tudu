// src/components/kanban/BoardCard.tsx
import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Task } from '../../types/task';
import { KanbanCardBody } from './KanbanCard';

interface BoardCardProps {
  task: Task;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onOpen: (task: Task) => void;
}

/**
 * A single card on the board.
 *
 * Uses `useDraggable` (not `useSortable`) because card order inside a column is
 * fixed by `created_at` — only column membership changes. The mockup's grip
 * handle sits in the top-right corner and only appears on hover/focus.
 */
const BoardCard: React.FC<BoardCardProps> = ({
  task,
  isSelected,
  onToggleSelect,
  onOpen,
}) => {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, isDragging } =
    useDraggable({ id: task.id });

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={'group relative ' + (isDragging ? 'opacity-30' : '')}
    >
      <div
        onClick={() => onOpen(task)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onOpen(task);
        }}
        role="button"
        tabIndex={0}
        className="cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-1 focus-visible:ring-offset-canvas"
      >
        <KanbanCardBody
          task={task}
          isSelected={isSelected}
          onToggleSelect={onToggleSelect}
          onEdit={onOpen}
        />
      </div>
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        aria-label={'Drag ' + task.title}
        title="Drag to move"
        className="absolute right-1 top-1 cursor-grab rounded p-0.5 text-ink-faint opacity-0 transition-opacity hover:bg-subtle hover:text-ink group-hover:opacity-100 active:cursor-grabbing focus:opacity-100 focus:outline-none"
      >
        <GripVertical className="h-3 w-3" />
      </button>
    </div>
  );
};

export default BoardCard;