import React, { useEffect } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useTasks } from '../../hooks/useTasks';
import { useActiveBoardId, useBoardColumns } from '../../hooks/useBoards';
import TaskDetail from './TaskDetail';
import ColumnSettings from './ColumnSettings';

/**
 * The right-hand detail panel (mockup's `DetailPanel`).
 *
 * Renders `<TaskDetail>` or `<ColumnSettings>` depending on what
 * `uiStore.detail` points at. On desktop it is a fixed-width side panel
 * that slides open; on mobile it is a full-width overlay from the right.
 */
const DetailPanel: React.FC = () => {
  const detail = useUiStore((s) => s.detail);
  const closeDetail = useUiStore((s) => s.closeDetail);

  const boardId = useActiveBoardId();
  const { data: columns = [] } = useBoardColumns(boardId);
  const { data: tasks = [] } = useTasks({});

  const task =
    detail && detail.type === 'task'
      ? (tasks ?? []).find((t) => t.id === detail.id) ?? null
      : null;
  const column =
    detail && detail.type === 'column'
      ? columns.find((c) => c.id === detail.id) ?? null
      : null;

  const open = detail !== null;
  const hasBody = Boolean(task || column);

  // If the item disappears (deleted, or cached away), auto-close.
  useEffect(() => {
    if (!open) return;
    if (detail?.type === 'task' && tasks.length > 0 && !task) closeDetail();
    if (detail?.type === 'column' && columns.length > 0 && !column) closeDetail();
  }, [open, detail, task, column, tasks.length, columns.length, closeDetail]);

  // Esc closes.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDetail();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closeDetail]);

  return (
    <>
      {/* Desktop: side panel that resizes to 384 when open. */}
      <aside
        className="relative hidden shrink-0 overflow-hidden rounded-xl border border-line-subtle bg-surface md:block"
        style={{
          width: open && hasBody ? 384 : 0,
          transition: 'width 220ms cubic-bezier(0.2, 0, 0, 1)',
        }}
      >
        <div className="flex h-full w-96 flex-col">
          {task && <TaskDetail task={task} onClose={closeDetail} />}
          {column && <ColumnSettings column={column} onClose={closeDetail} />}
        </div>
      </aside>

      {/* Mobile: overlay from the right. */}
      {open && hasBody && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="flex-1 bg-black/50" onClick={closeDetail} aria-hidden="true" />
          <aside className="w-full max-w-sm overflow-hidden rounded-l-2xl bg-surface shadow-2xl">
            <div className="flex h-full flex-col">
              {task && <TaskDetail task={task} onClose={closeDetail} />}
              {column && <ColumnSettings column={column} onClose={closeDetail} />}
            </div>
          </aside>
        </div>
      )}
    </>
  );
};

export default DetailPanel;
