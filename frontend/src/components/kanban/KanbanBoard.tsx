import React, { useMemo, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Task } from '../../types/task';
import { useKanbanTasks, useMoveTasks } from '../../hooks/useKanban';
import { useActiveBoardId, useBoardColumns } from '../../hooks/useBoards';
import { useUiStore } from '../../store/uiStore';
import KanbanColumn from './KanbanColumn';
import ColumnManager from './ColumnManager';
import { KanbanCardBody } from './KanbanCard';
import { useConfetti } from '../common/ConfettiProvider';
import {
  FALLBACK_COLUMNS,
  buildMoveUpdates,
  columnForTask,
  resolveTargetColumn,
  type ColumnLike,
} from './logic';

/** Bouncy drop animation played when a card is released. */
const dropAnimation = {
  duration: 250,
  easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)',
};

const KanbanBoard: React.FC = () => {
  const { data: tasks, isLoading, isError, error, refetch } = useKanbanTasks();
  const { mutate: moveTasks, isPending } = useMoveTasks();
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const pushToast = useUiStore((s) => s.pushToast);
  const { burst } = useConfetti();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showColumns, setShowColumns] = useState(false);

  const sensors = useSensors(
    // A small threshold keeps clicks and checkboxes working.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const boardId = useActiveBoardId();
  const { data: boardColumns } = useBoardColumns(boardId);

  // Real columns once the backend has answered; the three classic columns
  // before that, and when the backend predates custom columns entirely.
  const hasRealColumns = Array.isArray(boardColumns) && boardColumns.length > 0;
  const columns: ColumnLike[] = hasRealColumns ? boardColumns! : FALLBACK_COLUMNS;

  // Written as complete class names so Tailwind's scanner can see them; a
  // template-built `grid-cols-${n}` would be purged from the stylesheet.
  const gridClass =
    columns.length > 4
      ? 'grid grid-cols-1 gap-4 md:grid-cols-5'
      : columns.length > 3
        ? 'grid grid-cols-1 gap-4 md:grid-cols-4'
        : 'grid grid-cols-1 gap-4 md:grid-cols-3';

  const allTasks = useMemo(() => tasks ?? [], [tasks]);

  // Cards are grouped by the column they sit in rather than a fixed status
  // bucket, so two columns sharing a stage ("Doing" / "In review") stay apart.
  const grouped = useMemo(() => {
    const result: Record<string, Task[]> = {};
    columns.forEach((column) => {
      result[column.id] = [];
    });
    allTasks.forEach((task) => {
      const column = columnForTask(task, columns) ?? columns[0];
      if (column) result[column.id]?.push(task);
    });
    return result;
  }, [allTasks, columns]);

  const activeTask = useMemo(
    () => allTasks.find((task) => task.id === activeId) ?? null,
    [allTasks, activeId]
  );

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const draggedId = String(active.id);
    const dragged = allTasks.find((task) => task.id === draggedId);
    if (!dragged) return;

    const targetColumn = resolveTargetColumn(String(over.id), allTasks, columns);
    if (!targetColumn) return;

    // Same *stage* is not enough to call it a no-op: two columns can share a
    // stage, so compare the column the card is actually sitting in.
    const currentColumn = columnForTask(dragged, columns);
    if (currentColumn?.id === targetColumn.id) return;

    // Move the dragged card, plus any other selected cards.
    const idsToMove = selectedIds.includes(draggedId) ? selectedIds : [draggedId];
    const updates = buildMoveUpdates(
      allTasks,
      idsToMove,
      targetColumn.stage,
      // The fallback columns are identified by status rather than a real UUID,
      // so those moves stay status-only and the backend keeps its old shape.
      hasRealColumns ? targetColumn.id : undefined
    );

    if (updates.length === 0) return;

    moveTasks(updates, {
      onError: () => pushToast('Could not move the task. It was put back.', 'error'),
      // Only celebrate once the server has actually accepted the move.
      onSuccess: () => {
        if (targetColumn.stage === 'done') burst();
      },
    });

    setSelectedIds([]);
    if (updates.length > 1) {
      pushToast(`Moved ${updates.length} tasks to ${targetColumn.name}`, 'success');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="card p-10 text-center">
        <p className="text-red-500">{(error as Error)?.message || 'Could not load the board.'}</p>
        <button onClick={() => refetch()} className="btn-ghost mt-4">
          Try again
        </button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-handwritten text-3xl text-ink sm:text-4xl">Board</h2>
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <button onClick={() => setSelectedIds([])} className="btn-ghost">
                Clear ({selectedIds.length})
              </button>
            )}
            {boardId && (
              <button
                onClick={() => setShowColumns(true)}
                data-tour="manage-columns"
                className="btn-ghost"
              >
                Columns
              </button>
            )}
            <button onClick={() => openTaskForm(null)} className="btn-accent brush-stroke">
              + New task
            </button>
          </div>
        </div>

        <p className="text-xs text-ink-muted">
          Drag a card by its ⠿ handle to move it between columns.
          {selectedIds.length > 0 && ' Selected cards move together.'}
          {isPending && ' Saving…'}
        </p>

        <div className={gridClass}>
          {columns.map((column) => (
            <KanbanColumn
              key={column.id}
              column={column}
              tasks={grouped[column.id] ?? []}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onEdit={(task) => openTaskForm(task.id)}
            />
          ))}
        </div>

        {showColumns && boardId && hasRealColumns && (
          <ColumnManager
            boardId={boardId}
            columns={boardColumns!}
            onClose={() => setShowColumns(false)}
          />
        )}
      </div>

      {/* Card that follows the cursor while dragging. */}
      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <div className="w-64 rotate-2 cursor-grabbing">
            <KanbanCardBody
              task={activeTask}
              isSelected={false}
              onToggleSelect={() => {}}
              onEdit={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
