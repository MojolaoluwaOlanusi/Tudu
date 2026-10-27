import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useConfirmStore } from '../../store/confirmStore';

/**
 * The single confirm dialog for the whole app.
 *
 * Replaces `window.confirm`, which is unthemed, blocks the JS thread,
 * and cannot be dismissed by swipe on mobile Safari. Use it via
 *
 *   const ok = await useConfirmStore.getState().confirm({ title, ... });
 *   if (!ok) return;
 *
 * or via the hook form:
 *
 *   const confirm = useConfirmStore((s) => s.confirm);
 *   const ok = await confirm({ title, ... });
 */
const ConfirmDialog: React.FC = () => {
  const current = useConfirmStore((s) => s.current);
  const resolve = useConfirmStore((s) => s.resolve);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!current) return;
    confirmRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        resolve(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, resolve]);

  if (!current) return null;

  const {
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    destructive = false,
  } = current;

  const content = (
    <div
      className="scrim fixed inset-0 z-[110] overflow-y-auto p-4"
      role="presentation"
      onClick={() => resolve(false)}
    >
      <div className="flex min-h-full items-center justify-center">
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby={message ? 'confirm-message' : undefined}
          className="animate-pop-in w-full max-w-sm rounded-2xl border border-hairline bg-surface p-5 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 id="confirm-title" className="font-handwritten text-2xl text-ink">
            {title}
          </h2>
          {message && (
            <p
              id="confirm-message"
              className="mt-2 text-sm leading-relaxed text-ink-muted"
            >
              {message}
            </p>
          )}
          <div className="mt-5 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => resolve(false)} className="btn-ghost">
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              type="button"
              onClick={() => resolve(true)}
              className={
                destructive
                  ? 'rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-600'
                  : 'btn-accent'
              }
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default ConfirmDialog;