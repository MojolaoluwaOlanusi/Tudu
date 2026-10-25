// src/components/kanban/BoardView.tsx
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
import { Plus } from 'lucide-react';
import { useKanbanTasks, useMoveTasks } from '../../hooks/useKanban';
import {
  useActiveBoardId,
  useBoardColumns,
  useCreateColumn,
  useReorderColumns,
} from '../../hooks/useBoards';
import { useUiStore } from '../../store/uiStore';
import { useConfetti } from '../common/ConfettiProvider';
import { isNetworkError, shouldShowQueuedToast } from '../../lib/offlineQueue';
import BoardColumn from './BoardColumn';
import { KanbanCardBody } from './KanbanCard';
import {
  FALLBACK_COLUMNS,
  buildMoveUpdates,
  columnForTask,
  resolveTargetColumn,
  type ColumnLike,
} from './logic';

const BoardView: React.FC = () => {
  const { data: tasks, isLoading, isError, error, refetch } = useKanbanTasks();
  const { mutate: moveTasks } = useMoveTasks();
  const { mutate: createColumn } = useCreateColumn();
  const { mutate: reorderColumns } = useReorderColumns();
  const openTaskForm = useUiStore((s) => s.openTaskForm);
  const closeTaskForm = useUiStore((s) => s.closeTaskForm);
  const isTaskFormOpen = useUiStore((s) => s.isTaskFormOpen);
  const openDetail = useUiStore((s) => s.openDetail);
  const pushToast = useUiStore((s) => s.pushToast);
  const { burst } = useConfetti();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [columnDropTarget, setColumnDropTarget] = useState<{
    id: string;
    side: 'left' | 'right';
  } | null>(null);

  const boardId = useActiveBoardId();
  const { data: boardColumns } = useBoardColumns(boardId);

  const hasRealColumns = Array.isArray(boardColumns) && boardColumns.length > 0;
  const columns: ColumnLike[] = hasRealColumns ? boardColumns! : FALLBACK_COLUMNS;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const visibleTasks = useMemo(
    () =>
      (tasks ?? []).filter(
        (task) =>
          !hasRealColumns ||
          !boardId ||
          !task.board_id ||
          task.board_id === boardId
      ),
    [tasks, hasRealColumns, boardId]
  );

  const activeTask = activeId
    ? visibleTasks.find((t) => t.id === activeId) ?? null
    : null;

  const toggleSelect = (id: string) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  /* ----------------------------- Card drag ----------------------------- */

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const draggedId = String(active.id);
    const dragged = visibleTasks.find((task) => task.id === draggedId);
    if (!dragged) return;

    const targetColumn = resolveTargetColumn(String(over.id), visibleTasks, columns);
    if (!targetColumn) return;

    const currentColumn = columnForTask(dragged, columns);
    if (currentColumn?.id === targetColumn.id) return;

    // Client-side WIP pre-check: same rule the mockup uses, and the server
    // still validates. Gives an instant toast without a network round-trip.
    if (targetColumn.wip_limit != null) {
      const targetCount = visibleTasks.filter(
        (t) => t.column_id === targetColumn.id
      ).length;
      if (targetCount >= targetColumn.wip_limit) {
        pushToast(
          `"${targetColumn.name}" is full (WIP limit ${targetColumn.wip_limit}). Move or finish a card first.`
        );
        return;
      }
    }

    const idsToMove = selectedIds.includes(draggedId) ? selectedIds : [draggedId];
    const updates = buildMoveUpdates(
      visibleTasks,
      idsToMove,
      targetColumn.stage,
      hasRealColumns ? targetColumn.id : undefined
    );
    if (updates.length === 0) return;

    moveTasks(updates, {
      onError: (err) => {
        if (isNetworkError(err)) {
          if (shouldShowQueuedToast()) {
            pushToast('Saved offline — will sync when you reconnect', 'info');
          }
          return;
        }
        pushToast('Could not move the task. It was put back.', 'error');
      },
      onSuccess: () => {
        if (targetColumn.stage === 'done') burst();
      },
    });

    setSelectedIds([]);
    if (updates.length > 1) {
      pushToast(`Moved ${updates.length} tasks to ${targetColumn.name}`, 'success');
    }
  };

  /* ----------------------- Column drag (native) ------------------------ */

  const handleColumnDragStart = (id: string) => setDraggedColId(id);

  const handleColumnDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (!draggedColId) return;
    if (draggedColId === columnId) {
      setColumnDropTarget(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const side = e.clientX < rect.left + rect.width / 2 ? 'left' : 'right';
    setColumnDropTarget({ id: columnId, side });
  };

  const handleColumnDrop = () => {
    if (!draggedColId || !columnDropTarget || !boardId) {
      setDraggedColId(null);
      setColumnDropTarget(null);
      return;
    }
    const fromIdx = columns.findIndex((c) => c.id === draggedColId);
    const overIdx = columns.findIndex((c) => c.id === columnDropTarget.id);
    if (fromIdx < 0 || overIdx < 0) {
      setDraggedColId(null);
      setColumnDropTarget(null);
      return;
    }
    let toIdx = columnDropTarget.side === 'left' ? overIdx : overIdx + 1;
    if (fromIdx < toIdx) toIdx -= 1;
    if (fromIdx !== toIdx) {
      const nextOrder = [...columns];
      const [moved] = nextOrder.splice(fromIdx, 1);
      nextOrder.splice(toIdx, 0, moved);
      reorderColumns(
        { boardId, columnIds: nextOrder.map((c) => c.id) },
        { onError: () => pushToast('Could not reorder the columns', 'error') }
      );
    }
    setDraggedColId(null);
    setColumnDropTarget(null);
  };

  const handleColumnDragEnd = () => {
    setDraggedColId(null);
    setColumnDropTarget(null);
  };

  /* --------------------------- Add a column --------------------------- */

  const handleAddColumn = () => {
    if (!boardId) return;
    createColumn(
      { boardId, name: 'New column', stage: 'todo' },
      {
        onSuccess: (col) => openDetail({ type: 'column', id: col.id }),
        onError: () => pushToast('Could not add the column', 'error'),
      }
    );
  };

  /* ----------------------------- Rendering ---------------------------- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-accent" />
      </div>
    );
  }

  if (isError && (!tasks || tasks.length === 0)) {
    return (
      <div className="card p-10 text-center">
        <p className="text-red-500">
          {(error as Error)?.message || 'Could not load the board.'}
        </p>
        <button onClick={() => refetch()} className="btn-ghost mt-4">
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="shrink-0 border-b border-line-subtle px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="font-handwritten text-3xl leading-none text-ink sm:text-4xl">
              Board
            </h1>
            <p className="mt-2 text-[11px] text-ink-faint">
              Drag a card by its grip. Drag a column header to reorder.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="btn-ghost !py-1.5 !text-[13px]"
              >
                Clear ({selectedIds.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => openTaskForm(null)}
              className="btn-accent brush-stroke !py-1.5 !text-[13px]"
              data-tour="new-task"
            >
              + New task
            </button>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex h-full gap-3">
            {columns.map((column) => {
              const columnTasks = visibleTasks
                .filter((t) => columnForTask(t, columns)?.id === column.id)
                .sort((a, b) =>
                  (b.created_at || '').localeCompare(a.created_at || '')
                );
              const showDrop =
                columnDropTarget &&
                columnDropTarget.id === column.id &&
                draggedColId !== column.id;
              return (
                <div key={column.id} className="relative shrink-0 h-full">
                  {showDrop && (
                    <div
                      className={
                        'pointer-events-none absolute top-0 bottom-0 z-10 w-1 rounded-full bg-brand ' +
                        (columnDropTarget!.side === 'left' ? '-left-2' : '-right-2')
                      }
                      aria-hidden="true"
                    />
                  )}
                  <BoardColumn
                    column={column as never}
                    tasks={columnTasks}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onOpenTask={(task) => openDetail({ type: 'task', id: task.id })}
                    onOpenColumnSettings={() =>
                      openDetail({ type: 'column', id: column.id })
                    }
                    onAddCard={() => openTaskForm(null, column.id)}
                    isColumnDragging={draggedColId === column.id}
                    onColumnDragStart={() => handleColumnDragStart(column.id)}
                    onColumnDragOver={(e) => handleColumnDragOver(e, column.id)}
                    onColumnDrop={handleColumnDrop}
                    onColumnDragEnd={handleColumnDragEnd}
                  />
                </div>
              );
            })}
            <button
              type="button"
              onClick={handleAddColumn}
              className="flex w-72 shrink-0 self-stretch items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-line-subtle text-[12px] font-medium text-ink-faint transition-colors hover:border-brand hover:text-brand"
            >
              <Plus className="h-4 w-4" />
              Add column
            </button>
          </div>
          <DragOverlay
            dropAnimation={{ duration: 200, easing: 'cubic-bezier(0.2, 0, 0, 1)' }}
          >
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
      </div>
    </div>
  );
};

export default BoardView;

