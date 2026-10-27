import React, { useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import { useUpdateColumn, useDeleteColumn } from '../../hooks/useBoards';
import { useUiStore } from '../../store/uiStore';
import { useConfirmStore } from '../../store/confirmStore';
import { COLUMN_COLORS, STAGES } from '../../types/board';
import type { BoardColumn, ColumnColor, Stage } from '../../types/board';

const STAGE_LABELS: Record<Stage, string> = {
  todo: 'To-do',
  doing: 'Doing',
  done: 'Done',
};

const FIELD_LABEL = 'text-[11px] font-semibold uppercase tracking-wider text-ink-faint';

interface ColumnSettingsProps {
  column: BoardColumn;
  onClose: () => void;
}

/**
 * The right-hand column editing panel (mockup's `ColumnSettings`).
 *
 * Edit / delete via the same hooks the old `ColumnManager` modal used, so
 * behaviour is unchanged; only the presentation moved into the panel.
 */
const ColumnSettings: React.FC<ColumnSettingsProps> = ({ column, onClose }) => {
  const confirm = useConfirmStore((s) => s.confirm);
  const updateColumn = useUpdateColumn();
  const deleteColumn = useDeleteColumn();
  const pushToast = useUiStore((s) => s.pushToast);

  const [name, setName] = useState(column.name);
  const [stage, setStage] = useState<Stage>(column.stage);
  const [color, setColor] = useState<ColumnColor>(column.color);
  const [wip, setWip] = useState(column.wip_limit != null ? String(column.wip_limit) : '');

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setName(column.name);
      return;
    }
    if (trimmed !== column.name) {
      updateColumn.mutate({ id: column.id, boardId: column.board_id, patch: { name: trimmed } });
    }
  };
  const saveStage = (v: Stage) => {
    setStage(v);
    updateColumn.mutate({ id: column.id, boardId: column.board_id, patch: { stage: v } });
  };
  const saveColor = (c: ColumnColor) => {
    setColor(c);
    updateColumn.mutate({ id: column.id, boardId: column.board_id, patch: { color: c } });
  };
  const saveWip = () => {
    const trimmed = wip.trim();
    const next = trimmed === '' ? null : Number(trimmed);
    if (next !== null && (!Number.isInteger(next) || next < 1)) {
      pushToast('WIP limit must be a whole number of at least 1', 'error');
      setWip(column.wip_limit != null ? String(column.wip_limit) : '');
      return;
    }
    if (next !== column.wip_limit) {
      updateColumn.mutate({ id: column.id, boardId: column.board_id, patch: { wip_limit: next } });
    }
  };

  const handleDelete = async () => {
    const ok = await confirm({
      title: `Delete "${column.name}"?`,
      message: 'Its cards move to another column, they are not destroyed.',
      confirmLabel: 'Delete column',
      destructive: true,
    });
    if (!ok) return;
    deleteColumn.mutate(
      { id: column.id, boardId: column.board_id },
      {
        onSuccess: () => {
          pushToast('Column deleted', 'success');
          onClose();
        },
        onError: () => pushToast('Could not delete the column', 'error'),
      },
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-line-subtle px-4">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
          Column settings
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-hidden p-4">
        <div className="space-y-4">
          <div>
            <label className={FIELD_LABEL + ' mb-1 block'} htmlFor="col-name">
              Name
            </label>
            <input
              id="col-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveName();
                  e.currentTarget.blur();
                }
              }}
              maxLength={100}
              className="input"
            />
          </div>

          <div>
            <label className={FIELD_LABEL + ' mb-1 block'} htmlFor="col-stage">
              Stage
            </label>
            <select
              id="col-stage"
              value={stage}
              onChange={(e) => saveStage(e.target.value as Stage)}
              className="input"
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[11px] text-ink-faint">
              Cards inherit their status from the column&apos;s stage.
            </p>
          </div>

          <div>
            <p className={FIELD_LABEL + ' mb-1'}>Color</p>
            <div className="flex flex-wrap gap-2">
              {COLUMN_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => saveColor(c)}
                  aria-label={c}
                  title={c}
                  className={
                    'h-7 w-7 rounded-full border-2 capitalize transition-all ' +
                    (color === c
                      ? 'border-ink scale-110'
                      : 'border-transparent hover:scale-105')
                  }
                  style={{
                    backgroundColor:
                      c === 'gray'
                        ? '#94a3b8'
                        : c === 'red'
                          ? '#ef4444'
                          : c === 'orange'
                            ? '#f97316'
                            : c === 'amber'
                              ? '#f59e0b'
                              : c === 'green'
                                ? '#22c55e'
                                : c === 'teal'
                                  ? '#14b8a6'
                                  : c === 'blue'
                                    ? '#3b82f6'
                                    : c === 'violet'
                                      ? '#8b5cf6'
                                      : c === 'pink'
                                        ? '#ec4899'
                                        : '#94a3b8',
                  }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className={FIELD_LABEL + ' mb-1 block'} htmlFor="col-wip">
              WIP limit
            </label>
            <input
              id="col-wip"
              type="number"
              min={1}
              value={wip}
              onChange={(e) => setWip(e.target.value)}
              onBlur={saveWip}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  saveWip();
                  e.currentTarget.blur();
                }
              }}
              placeholder="No limit"
              className="input"
            />
            <p className="mt-1 text-[11px] text-ink-faint">Leave blank for no limit.</p>
          </div>

          <div className="border-t border-line-subtle pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteColumn.isPending}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete column
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColumnSettings;
