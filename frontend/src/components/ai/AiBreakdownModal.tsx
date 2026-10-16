import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAiBreakdown, useAiStatus } from '../../hooks/useAiBreakdown';
import { useCreateSubtask } from '../../hooks/useSubtasks';
import { aiService } from '../../services/aiService';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import CreditBadge from './CreditBadge';
import FeatureGate from '../common/FeatureGate';

interface AiBreakdownModalProps {
  taskTitle: string;
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
  const { token } = useAuthStore();
  const pushToast = useUiStore((s) => s.pushToast);

  const [items, setItems] = useState<Suggestion[]>([]);
  const [hdLoading, setHdLoading] = useState(false);
  const seeded = useRef(false);

  useEffect(() => {
    generate({ title: taskTitle });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskTitle]);

  useEffect(() => {
    if (!data?.subtasks || seeded.current) return;
    seeded.current = true;
    setItems(data.subtasks.map((text) => ({ text, selected: true })));
  }, [data]);

  // Close on Escape, matching every other modal in the app.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent the page underneath from scrolling while the modal is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const handleRetry = () => {
    reset();
    seeded.current = false;
    setItems([]);
    generate({ title: taskTitle });
  };

  const handleHdBreakdown = async () => {
    if (!token) return;
    setHdLoading(true);
    try {
      const result = await aiService.hdBreakdown(token, taskTitle);
      setItems(result.subtasks.map((text) => ({ text, selected: true })));
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      if (status === 402) {
        pushToast('You are out of AI credits', 'error');
      } else {
        pushToast(detail || 'Could not generate the HD breakdown', 'error');
      }
    } finally {
      setHdLoading(false);
    }
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

  /**
   * Rendered through a portal to document.body.
   *
   * The List view has ancestors with `transform` / `backdrop-filter` (the
   * scrim), each of which becomes a containing block for `position: fixed`.
   * Without the portal, "fixed inset-0" means "fill the transformed
   * ancestor", which is why the modal was trapped inside the task list and
   * scrolled with it. Escaping to the body makes the overlay cover the real
   * viewport regardless of what any ancestor is doing.
   */
  const content = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-label="AI task breakdown"
      onClick={onClose}
    >
      <div
        className="flex min-h-full items-start justify-center px-4 pb-8"
        style={{ paddingTop: 'max(4rem, env(safe-area-inset-top, 0px) + 4rem)' }}
      >
        <div
          className="animate-fade-in w-full max-w-lg rounded-2xl border border-hairline bg-surface p-5 shadow-xl sm:p-6"
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

          <div className="mb-4">
            <CreditBadge />
          </div>

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

              <FeatureGate
                feature="ai.breakdown.hd"
                compact
                title="Deeper breakdown (12 steps)"
              >
                <button
                  type="button"
                  onClick={handleHdBreakdown}
                  disabled={isSaving || hdLoading}
                  className="btn-ghost mt-2 !py-1 !text-xs"
                >
                  {hdLoading ? 'Thinking deeper…' : '✦ Regenerate with 12 steps'}
                </button>
              </FeatureGate>

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
    </div>
  );

  return createPortal(content, document.body);
};

export default AiBreakdownModal;