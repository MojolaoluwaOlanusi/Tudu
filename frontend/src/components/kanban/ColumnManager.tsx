import React, { useMemo, useState } from 'react';
import {
  useActiveBoardId,
  useBoardColumns,
  useCreateColumn,
  useDeleteColumn,
  useReorderColumns,
  useUpdateColumn,
} from '../../hooks/useBoards';
import { useUiStore } from '../../store/uiStore';
import { COLUMN_COLORS, STAGES } from '../../types/board';
import type { BoardColumn, ColumnColor, Stage } from '../../types/board';

interface ColumnManagerProps {
  onClose: () => void;
}

const STAGE_LABELS: Record<Stage, string> = {
  todo: 'To-do',
  doing: 'Doing',
  done: 'Done',
};

/**
 * Manage a board's columns: rename, change stage/colour, set a WIP limit,
 * delete, and reorder by dragging the ⋮⋮ handle.
 *
 * Reordering is optimistic (the row follows the cursor immediately) and is
 * persisted in the background; the socket broadcast then syncs every other
 * open tab.
 */
const ColumnManager: React.FC<ColumnManagerProps> = ({ onClose }) => {
  const boardId = useActiveBoardId();
  const { data: columns = [] } = useBoardColumns(boardId);
  const createColumn = useCreateColumn();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const reorderColumns = useReorderColumns();
  const pushToast = useUiStore((s) => s.pushToast);

  const [newName, setNewName] = useState('');
  const [newStage, setNewStage] = useState<Stage>('todo');
  const [newColor, setNewColor] = useState<ColumnColor>('gray');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...columns].sort((a, b) => a.position - b.position),
    [columns]
  );

  if (!boardId) return null;

  const fail = (err: unknown, fallback: string) =>
    pushToast(
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback,
      'error'
    );

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createColumn.mutate(
      { boardId, name, stage: newStage, color: newColor },
      {
        onSuccess: () => {
          setNewName('');
          pushToast(`Column "${name}" added`, 'success');
        },
        onError: (err) => fail(err, 'Could not add the column'),
      }
    );
  };

  const handleRename = (column: BoardColumn, name: string) => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === column.name) return;
    updateColumn.mutate(
      { id: column.id, boardId, patch: { name: trimmed } },
      { onError: (err) => fail(err, 'Could not rename the column') }
    );
  };

  const handleStage = (column: BoardColumn, stage: Stage) => {
    if (stage === column.stage) return;
    updateColumn.mutate(
      { id: column.id, boardId, patch: { stage } },
      { onError: (err) => fail(err, 'Could not change the stage') }
    );
  };

  const handleColor = (column: BoardColumn, color: ColumnColor) => {
    if (color === column.color) return;
    updateColumn.mutate(
      { id: column.id, boardId, patch: { color } },
      { onError: (err) => fail(err, 'Could not change the colour') }
    );
  };

  const handleWip = (column: BoardColumn, raw: string) => {
    const trimmed = raw.trim();
    const value = trimmed === '' ? null : Number(trimmed);
    if (value !== null && (!Number.isInteger(value) || value < 1)) {
      pushToast('WIP limit must be a whole number of at least 1', 'error');
      return;
    }
    if (value === column.wip_limit) return;
    updateColumn.mutate(
      { id: column.id, boardId, patch: { wip_limit: value } },
      { onError: (err) => fail(err, 'Could not set the WIP limit') }
    );
  };

  const handleDelete = (column: BoardColumn) => {
    if (
      !window.confirm(
        `Delete the "${column.name}" column? Its cards move to another column, they are not destroyed.`
      )
    ) {
      return;
    }
    deleteColumn.mutate(
      { id: column.id, boardId },
      {
        onSuccess: (result) => {
          const moved = result?.moved_tasks ?? 0;
          pushToast(
            moved > 0
              ? `Column deleted — ${moved} card${moved === 1 ? '' : 's'} moved`
              : 'Column deleted',
            'success'
          );
        },
        onError: (err) => fail(err, 'Could not delete the column'),
      }
    );
  };

  /* ------------------------- drag to reorder ------------------------- */

  const handleDragStart = (id: string) => (event: React.DragEvent) => {
    setDraggingId(id);
    event.dataTransfer.effectAllowed = 'move';
    // Firefox needs data set to actually start a drag.
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (overId: string) => (event: React.DragEvent) => {
    event.preventDefault();
    if (!draggingId || draggingId === overId) return;

    const from = sorted.findIndex((c) => c.id === draggingId);
    const to = sorted.findIndex((c) => c.id === overId);
    if (from < 0 || to < 0 || from === to) return;

    const next = [...sorted];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    // Optimistic: the cache is rewritten on drop, so the row visibly follows
    // the pointer. The API call persists the order; on failure the cache rolls
    // back to the previous order.
    reorderColumns.mutate(
      { boardId, columnIds: next.map((c) => c.id) },
      { onError: (err) => fail(err, 'Could not reorder the columns') }
    );
  };

  const handleDragEnd = () => setDraggingId(null);

  /* ----------------------------- render ----------------------------- */

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Manage columns"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-handwritten text-2xl text-ink">Columns</h2>
            <p className="text-xs text-ink-muted">
              Drag the ⋮⋮ handle to reorder. Each column carries a stage; a card
              dropped in it inherits that stage.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            Close
          </button>
        </div>

        <ul className="space-y-2">
          {sorted.map((column) => (
            <li
              key={column.id}
              draggable
              onDragStart={handleDragStart(column.id)}
              onDragOver={handleDragOver(column.id)}
              onDrop={handleDragEnd}
              onDragEnd={handleDragEnd}
              className={`flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3 ${
                draggingId === column.id ? 'opacity-60' : ''
              }`}
            >
              <button
                type="button"
                aria-label={`Reorder ${column.name}`}
                className="cursor-grab touch-none rounded-md px-1.5 py-1 text-ink-muted hover:text-ink active:cursor-grabbing"
              >
                ⋮⋮
              </button>

              <input
                type="text"
                defaultValue={column.name}
                key={`${column.id}-${column.name}`}
                maxLength={100}
                aria-label={`Name of ${column.name}`}
                onBlur={(event) => handleRename(column, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.currentTarget.blur();
                }}
                className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
              />

              <select
                value={column.stage}
                onChange={(event) => handleStage(column, event.target.value as Stage)}
                aria-label={`Stage of ${column.name}`}
                className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-ink"
              >
                {STAGES.map((stage) => (
                  <option key={stage} value={stage}>
                    {STAGE_LABELS[stage]}
                  </option>
                ))}
              </select>

              <select
                value={column.color}
                onChange={(event) => handleColor(column, event.target.value as ColumnColor)}
                aria-label={`Colour of ${column.name}`}
                className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-ink"
              >
                {COLUMN_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </select>

              <label className="flex items-center gap-1 text-[11px] text-ink-muted">
                WIP
                <input
                  type="number"
                  min={1}
                  defaultValue={column.wip_limit ?? ''}
                  key={`${column.id}-wip-${column.wip_limit ?? 'none'}`}
                  onBlur={(event) => handleWip(column, event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') event.currentTarget.blur();
                  }}
                  aria-label={`WIP limit of ${column.name}`}
                  placeholder="—"
                  className="w-14 rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-ink focus:border-accent focus:outline-none"
                />
              </label>

              <span className="text-[11px] text-ink-muted">
                {column.task_count ?? 0} card{(column.task_count ?? 0) === 1 ? '' : 's'}
                {column.over_wip_limit ? ' · over' : ''}
              </span>

              <button
                type="button"
                onClick={() => handleDelete(column)}
                aria-label={`Delete ${column.name}`}
                className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>

        <form onSubmit={handleCreate} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New column name"
            maxLength={100}
            aria-label="New column name"
            className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
          <select
            value={newStage}
            onChange={(event) => setNewStage(event.target.value as Stage)}
            aria-label="Stage for the new column"
            className="rounded-lg border border-hairline bg-surface px-2 py-2 text-sm text-ink"
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {STAGE_LABELS[stage]}
              </option>
            ))}
          </select>
          <select
            value={newColor}
            onChange={(event) => setNewColor(event.target.value as ColumnColor)}
            aria-label="Colour for the new column"
            className="rounded-lg border border-hairline bg-surface px-2 py-2 text-sm text-ink"
          >
            {COLUMN_COLORS.map((color) => (
              <option key={color} value={color}>
                {color}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!newName.trim() || createColumn.isPending}
            className="btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Add column
          </button>
        </form>
      </div>
    </div>
  );
};

export default ColumnManager;