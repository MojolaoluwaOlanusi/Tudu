// src/components/kanban/BoardColumn.tsx
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { MoreHorizontal, Plus } from 'lucide-react';
import { Task } from '../../types/task';
import { BoardColumn as BoardColumnType } from '../../types/board';
import BoardCard from './BoardCard';

const COLUMN_COLOR_HEX: Record<string, string> = {
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

interface BoardColumnProps {
  column: BoardColumnType;
  tasks: Task[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onOpenTask: (task: Task) => void;
  onOpenColumnSettings: () => void;
  onAddCard: () => void;
  isColumnDragging: boolean;
  onColumnDragStart: () => void;
  onColumnDragOver: (e: React.DragEvent) => void;
  onColumnDrop: () => void;
  onColumnDragEnd: () => void;
}

const BoardColumn: React.FC<BoardColumnProps> = ({
  column,
  tasks,
  selectedIds,
  onToggleSelect,
  onOpenTask,
  onOpenColumnSettings,
  onAddCard,
  isColumnDragging,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDrop,
  onColumnDragEnd,
}) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const atLimit = column.wip_limit != null && tasks.length >= column.wip_limit;
  const color = COLUMN_COLOR_HEX[column.color] ?? COLUMN_COLOR_HEX.gray;

  return (
    <div
      className={
        'flex h-full w-72 shrink-0 flex-col overflow-hidden rounded-xl border transition-opacity ' +
        (isOver ? 'border-brand bg-brand-subtle/20' : 'border-line-subtle bg-canvas/40') +
        (isColumnDragging ? ' opacity-40' : '')
      }
    >
      <div className="h-1 shrink-0" style={{ backgroundColor: color }} />
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', column.id);
          onColumnDragStart();
        }}
        onDragOver={(e) => onColumnDragOver(e)}
        onDrop={(e) => {
          e.preventDefault();
          onColumnDrop();
        }}
        onDragEnd={onColumnDragEnd}
        className="shrink-0 cursor-grab border-b border-line-subtle px-3 py-2 active:cursor-grabbing"
        title="Drag to reorder"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {column.name}
            </span>
            <span
              className={
                'shrink-0 rounded-sm px-1.5 text-[10px] font-medium tabular-nums ' +
                (atLimit ? 'bg-red-500/15 text-red-400' : 'bg-line-subtle text-ink-faint')
              }
            >
              {tasks.length}
              {column.wip_limit != null ? '/' + column.wip_limit : ''}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddCard();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label="Add card"
              title="Add card"
              className="rounded p-1 text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenColumnSettings();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              aria-label={'Settings for ' + column.name}
              title="Column settings"
              className="rounded p-1 text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
      <div
        ref={setNodeRef}
        className="min-h-0 flex-1 overflow-y-auto p-2 scroll-hidden"
      >
        {tasks.length === 0 ? (
          <div
            className={
              'flex h-24 items-center justify-center rounded-lg border-2 border-dashed text-[11px] ' +
              (isOver
                ? 'border-brand bg-brand-subtle/30 text-brand'
                : 'border-line-subtle text-ink-faint')
            }
          >
            {isOver ? 'Drop here' : 'No cards'}
          </div>
        ) : (
          <div className="space-y-2">
            {tasks.map((task) => (
              <BoardCard
                key={task.id}
                task={task}
                isSelected={selectedIds.includes(task.id)}
                onToggleSelect={onToggleSelect}
                onOpen={onOpenTask}
              />
            ))}
            {isOver && <div className="h-0.5 rounded-full bg-brand" />}
          </div>
        )}
      </div>
    </div>
  );
};

export default BoardColumn;
