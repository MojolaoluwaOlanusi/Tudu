import React, { useState } from 'react';
import {
  useCreateColumn,
  useDeleteColumn,
  useReorderColumns,
  useUpdateColumn,
} from '../../hooks/useBoards';
import { useUiStore } from '../../store/uiStore';
import { BoardColumn, COLUMN_COLORS, STAGES, Stage } from '../../types/board';
import { COLUMN_COLOR_HEX } from '../kanban/KanbanColumn';

interface ColumnManagerProps {
  boardId: string;
  columns: BoardColumn[];
  onClose: () => void;
}

const stageLabels: Record<Stage, string> = {
  todo: 'To-do',
  doing: 'Doing',
  done: 'Done',
};

/**
 * Add, rename, recolour, re-stage, set a WIP limit on and reorder a board's
 * columns.
 *
 * Reordering uses explicit move buttons rather than a second drag surface: the
 * board already uses pointer drag for cards, and two competing drag gestures on
 * one screen is a well-known source of dropped drags on touch devices. The
 * buttons also stay reachable by keyboard, which a drag alternative would not.
 */
const ColumnManager: React.FC<ColumnManagerProps> = ({ boardId, columns, onClose }) => {
  const createColumn = useCreateColumn();
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const reorderColumns = useReorderColumns();
  const pushToast = useUiStore((s) => s.pushToast);

  const [newName, setNewName] = useState('');
  const [newStage, setNewStage] = useState<Stage>('todo');

  const fail = (err: unknown, fallback: string) => {
    const message = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
    pushToast(message || fallback, 'error');
  };

  const busy =
    createColumn.isPending ||
    updateColumn.isPending ||
    deleteColumn.isPending ||
    reorderColumns.isPending;

  const handleAdd = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;

    createColumn.mutate(
      { boardId, input: { name, stage: newStage } },
      {
        onSuccess: () => {
          setNewName('');
          pushToast(`Column "${name}" added`, 'success');
        },
        onError: (err) => fail(err, 'Could not add the column'),
      }
    );
  };

  const move = (index: number, delta: number) => {
    const next = index + delta;
    if (next < 0 || next >= columns.length) return;
    const ids = columns.map((c) => c.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(next, 0, moved);
    reorderColumns.mutate(ids, {
      onError: (err) => fail(err, 'Could not reorder the columns'),
    });
  };

  const handleDelete = (column: BoardColumn) => {
    deleteColumn.mutate(column.id, {
      onSuccess: (result) =>
        pushToast(
          result.moved_tasks > 0
            ? `Column deleted - ${result.moved_tasks} task${
                result.moved_tasks === 1 ? '' : 's'
              } moved to another column`
            : 'Column deleted',
          'success'
        ),
      onError: (err) => fail(err, 'Could not delete the column'),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Manage columns"
        data-tour="column-manager"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-handwritten text-2xl text-ink">Columns</h2>
            <p className="text-xs text-ink-muted">
              Every column carries a stage, so cards in it always report that stage as their
              status - which is what keeps analytics and filters honest.
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

        <ul className="space-y-3">
          {columns.map((column, index) => (
            <li
              key={column.id}
              className="rounded-xl border border-hairline bg-surface-2 p-3"
              data-column-row={column.id}
            >
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={column.name}
                  aria-label={`Name of ${column.name}`}
                  maxLength={100}
                  onChange={(event) =>
                    updateColumn.mutate({
                      columnId: column.id,
                      input: { name: event.target.value },
                    })
                  }
                  className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-sm font-semibold text-ink focus:border-accent focus:outline-none"
                />

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0 || busy}
                    aria-label={`Move ${column.name} earlier`}
                    className="rounded-lg border border-hairline bg-surface px-2 py-1.5 text-xs text-ink-muted hover:text-ink disabled:opacity-40"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === columns.length - 1 || busy}
                    aria-label={`Move ${column.name} later`}
                    className="rounded-lg border border-hairline bg-surface px-2 py-1.5 text-xs text-ink-muted hover:text-ink disabled:opacity-40"
                  >
                    ▼
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                  Stage
                  <select
                    value={column.stage}
                    aria-label={`Stage of ${column.name}`}
                    onChange={(event) =>
                      updateColumn.mutate({
                        columnId: column.id,
                        input: { stage: event.target.value as Stage },
                      })
                    }
                    className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-ink"
                  >
                    {STAGES.map((stage) => (
                      <option key={stage} value={stage}>
                        {stageLabels[stage]}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                  Colour
                  <select
                    value={column.color}
                    aria-label={`Colour of ${column.name}`}
                    onChange={(event) =>
                      updateColumn.mutate({
                        columnId: column.id,
                        input: { color: event.target.value },
                      })
                    }
                    className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-ink"
                  >
                    {COLUMN_COLORS.map((color) => (
                      <option key={color} value={color}>
                        {color}
                      </option>
                    ))}
                  </select>
                  <span
                    aria-hidden="true"
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: COLUMN_COLOR_HEX[column.color] ?? '#94a3b8' }}
                  />
                </label>

                <label className="flex items-center gap-1.5 text-xs text-ink-muted">
                  WIP
                  <input
                    type="number"
                    min={1}
                    value={column.wip_limit ?? ''}
                    placeholder="none"
                    aria-label={`WIP limit for ${column.name}`}
                    onChange={(event) => {
                      const raw = event.target.value;
                      updateColumn.mutate({
                        columnId: column.id,
                        input: { wip_limit: raw === '' ? null : Number(raw) },
                      });
                    }}
                    className="w-16 rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-ink"
                  />
                </label>

                <button
                  type="button"
                  onClick={() => handleDelete(column)}
                  disabled={columns.length <= 1 || busy}
                  aria-label={`Delete ${column.name}`}
                  className="ml-auto rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300 disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>

        <form onSubmit={handleAdd} className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New column name"
            maxLength={100}
            className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
          <select
            value={newStage}
            onChange={(event) => setNewStage(event.target.value as Stage)}
            aria-label="Stage of the new column"
            className="rounded-lg border border-hairline bg-surface px-2 py-2 text-sm text-ink"
          >
            {STAGES.map((stage) => (
              <option key={stage} value={stage}>
                {stageLabels[stage]}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!newName.trim() || busy}
            className="btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Add
          </button>
        </form>
      </div>
    </div>
  );
};

export default ColumnManager;
