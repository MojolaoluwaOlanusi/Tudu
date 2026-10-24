import React from 'react';
import { useUiStore, type ToastVariant } from '../../store/uiStore';

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-brand/40 text-ink',
  error: 'border-red-400/40 text-ink',
  info: 'border-line text-ink',
};

const variantIcon: Record<ToastVariant, React.ReactNode> = {
  success: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-brand" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-red-400" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
  info: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-muted" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  ),
};

/**
 * Step 8: moved from bottom-center to top-center (matching the mockup's
 * ToastStack placement) and added per-variant icons. Behaviour unchanged:
 * same useUiStore selectors, same dismissToast handler, same role="status"
 * / aria-live="polite".
 */
const ToastContainer: React.FC = () => {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-20 z-40 flex flex-col items-center gap-2 px-4"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`glass animate-fade-in pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-lg border px-3 py-2 text-[12px] shadow-surface ${variantStyles[toast.variant]}`}
        >
          <span className="mt-0.5 flex shrink-0 items-center">{variantIcon[toast.variant]}</span>
          <span className="min-w-0 flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-md px-1 text-[11px] text-ink-muted opacity-70 transition-opacity hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;