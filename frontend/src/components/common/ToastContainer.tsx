import React from 'react';
import { useUiStore, type ToastVariant } from '../../store/uiStore';

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-accent bg-surface-2 text-ink',
  error:
    'border-red-300 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/30 dark:text-red-200',
  info: 'border-hairline bg-surface text-ink',
};

/** Renders transient notifications from the UI store. */
const ToastContainer: React.FC = () => {
  const toasts = useUiStore((state) => state.toasts);
  const dismissToast = useUiStore((state) => state.dismissToast);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:bottom-6">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          aria-live="polite"
          className={`animate-fade-in pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${variantStyles[toast.variant]}`}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dismiss notification"
            className="shrink-0 rounded-md px-1 opacity-60 transition-opacity hover:opacity-100"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
