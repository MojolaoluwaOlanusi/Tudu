import React from 'react';

interface BulkActionBarProps {
  count: number;
  busy: boolean;
  onMarkDone: () => void;
  onMarkTodo: () => void;
  onDelete: () => void;
  onClear: () => void;
}

/**
 * Floating action bar shown while the List view is in select mode and at
 * least one card is selected. Same visual language as the undo toast — a
 * pill anchored to the bottom of the viewport — so the two never feel like
 * they came from different apps.
 */
const BulkActionBar: React.FC<BulkActionBarProps> = ({
  count,
  busy,
  onMarkDone,
  onMarkTodo,
  onDelete,
  onClear,
}) => {
  if (count === 0) return null;

  const btn =
    'rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink-muted transition-colors hover:border-accent hover:text-ink disabled:opacity-50';

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[70] -translate-x-1/2 px-4"
      role="region"
      aria-label="Bulk actions"
    >
      <div className="flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-3 py-2 shadow-lg">
        <span className="px-2 text-sm font-semibold text-ink">
          {count} selected
        </span>
        <button type="button" onClick={onMarkDone} disabled={busy} className={btn}>
          Mark done
        </button>
        <button type="button" onClick={onMarkTodo} disabled={busy} className={btn}>
          Mark to-do
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          className="rounded-full border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-red-500 transition-colors hover:border-red-300 disabled:opacity-50"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onClear}
          disabled={busy}
          aria-label="Clear selection"
          className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
        >
          ×
        </button>
      </div>
    </div>
  );
};

export default BulkActionBar;
