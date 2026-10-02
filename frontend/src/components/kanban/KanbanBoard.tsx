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
import { Task, Status } from '../../types/task';
import { useKanbanTasks, useMoveTasks } from '../../hooks/useKanban';
import { useUiStore } from '../../store/uiStore';
import KanbanColumn from './KanbanColumn';
import { KanbanCardBody } from './KanbanCard';
import { useConfetti } from '../common/ConfettiProvider';
import { COLUMNS, resolveTargetStatus, buildMoveUpdates, isNoOpMove } from './logic';

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

  const sensors = useSensors(
    // A small threshold keeps clicks and checkboxes working.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  const allTasks = useMemo(() => tasks ?? [], [tasks]);

  const grouped = useMemo(() => {
    const result: Record<Status, Task[]> = { todo: [], doing: [], done: [] };
    allTasks.forEach((task) => result[task.status ?? 'todo'].push(task));
    return result;
  }, [allTasks]);

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

    const targetStatus = resolveTargetStatus(String(over.id), allTasks);
    if (!targetStatus || isNoOpMove(dragged.status, targetStatus)) return;

    // Move the dragged card, plus any other selected cards.
    const idsToMove = selectedIds.includes(draggedId) ? selectedIds : [draggedId];
    const updates = buildMoveUpdates(allTasks, idsToMove, targetStatus);

    if (updates.length === 0) return;

    moveTasks(updates, {
      onError: () => pushToast('Could not move the task. It was put back.', 'error'),
      // Only celebrate once the server has actually accepted the move.
      onSuccess: () => {
        if (targetStatus === 'done') burst();
      },
    });

    setSelectedIds([]);
    if (updates.length > 1) {
      pushToast(`Moved ${updates.length} tasks to ${targetStatus}`, 'success');
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {COLUMNS.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              title={column.title}
              tasks={grouped[column.status]}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onEdit={(task) => openTaskForm(task.id)}
            />
          ))}
        </div>
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
