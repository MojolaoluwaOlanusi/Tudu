import React, { useEffect, useRef, useState } from 'react';
import { useAiBreakdown, useAiStatus } from '../../hooks/useAiBreakdown';
import { useCreateSubtask } from '../../hooks/useSubtasks';

interface AiBreakdownModalProps {
  taskTitle: string;
  /** Omit to just preview without saving anywhere. */
  taskId?: string;
  onClose: () => void;
  onAdded?: (count: number) => void;
}

interface Suggestion {
  text: string;
  selected: boolean;
}

const Spinner: React.FC = () => (
  <svg
    className="h-4 w-4 animate-spin"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" />
    <path className="opacity-90" strokeLinecap="round" d="M22 12a10 10 0 00-10-10" />
  </svg>
);

/**
 * Suggests sub-tasks for a task and lets the user curate them before saving.
 *
 * Nothing is persisted until "Add ... to task" is pressed, and every suggestion
 * can be edited, unticked or deleted first.
 */
const AiBreakdownModal: React.FC<AiBreakdownModalProps> = ({
  taskTitle,
  taskId,
  onClose,
  onAdded,
}) => {
  const {
    mutate: generate,
    isPending,
    isSuccess,
    data,
    errorMessage,
    reset,
  } = useAiBreakdown();
  const { mutate: createSubtask, isPending: isSaving } = useCreateSubtask();
  const { data: status } = useAiStatus();

  const [items, setItems] = useState<Suggestion[]>([]);
  const seeded = useRef(false);

  useEffect(() => {
    generate({ title: taskTitle });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskTitle]);

  // Seed the editable list once per generation, so edits are never clobbered.
  useEffect(() => {
    if (!data?.subtasks || seeded.current) return;
    seeded.current = true;
    setItems(data.subtasks.map((text) => ({ text, selected: true })));
  }, [data]);

  const handleRetry = () => {
    reset();
    seeded.current = false;
    setItems([]);
    generate({ title: taskTitle });
  };

  const updateItem = (index: number, patch: Partial<Suggestion>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const selectedCount = items.filter((item) => item.selected).length;
  const isLoading = isPending || (isSuccess && items.length === 0 && !errorMessage);

  const handleSave = () => {
    const chosen = items
      .filter((item) => item.selected)
      .map((item) => item.text.trim())
      .filter(Boolean);

    if (!taskId || chosen.length === 0) {
      onAdded?.(chosen.length);
      onClose();
      return;
    }

    // Added one at a time so a mid-way failure still reports what landed.
    let added = 0;
    const addNext = (index: number) => {
      if (index >= chosen.length) {
        onAdded?.(added);
        onClose();
        return;
      }
      createSubtask(
        { taskId, title: chosen[index] },
        {
          onSuccess: () => {
            added += 1;
            addNext(index + 1);
          },
          onError: () => addNext(index + 1),
        }
      );
    };
    addNext(0);
  };
return (
    <div
      className="scrim fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="AI task breakdown"
      onClick={onClose}
    >
      <div
        className="animate-fade-in max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-start justify-between gap-4">
          <h2 className="font-handwritten text-2xl text-ink">Break it down</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <p className="mb-4 text-sm text-ink-muted">
          Suggested steps for <span className="font-medium text-ink">{taskTitle}</span>
        </p>

        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <span className="text-accent-strong">
              <Spinner />
            </span>
            <p className="text-sm text-ink-muted">
              Thinking it through<span className="animate-pulse">...</span>
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-700/50 dark:bg-red-950/40">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Could not generate a breakdown
            </p>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
            <button type="button" onClick={handleRetry} className="btn-ghost mt-3 !py-1 !text-xs">
              Try again
            </button>
          </div>
        )}

        {!isLoading && !errorMessage && items.length > 0 && (
          <>
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li key={index} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={(e) => updateItem(index, { selected: e.target.checked })}
                    className="h-4 w-4 shrink-0 rounded border-hairline accent-[var(--color-accent)]"
                    aria-label={`Include: ${item.text}`}
                  />
                  <input
                    type="text"
                    value={item.text}
                    onChange={(e) => updateItem(index, { text: e.target.value })}
                    className="input min-w-0 flex-1 !py-1.5 text-sm"
                    disabled={isSaving}
                  />
                  <button
                    type="button"
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))}
                    disabled={isSaving}
                    aria-label={`Remove: ${item.text}`}
                    className="shrink-0 rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-red-500"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => setItems((prev) => [...prev, { text: '', selected: true }])}
              disabled={isSaving}
              className="btn-ghost mt-3 !py-1 !text-xs"
            >
              + Add a step
            </button>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
              <p className="text-xs text-ink-muted">
                {selectedCount} of {items.length} selected
                {status?.provider ? ` · ${status.provider}` : ''}
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={onClose} className="btn-ghost" disabled={isSaving}>
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || selectedCount === 0}
                  className="btn-accent brush-stroke"
                >
                  {isSaving ? 'Adding...' : `Add ${selectedCount || ''} to task`.trim()}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AiBreakdownModal;