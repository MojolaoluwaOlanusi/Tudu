import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const OPERATORS: { syntax: string; meaning: string }[] = [
  { syntax: '@me', meaning: 'Assigned to you' },
  { syntax: '@email', meaning: 'Assigned to someone' },
  { syntax: '#work', meaning: 'Category — #work, #personal, #study' },
  { syntax: 'priority:high', meaning: 'Priority — high, medium, low' },
  { syntax: 'due:overdue', meaning: 'Overdue and not done' },
  { syntax: 'due:today', meaning: 'Due today' },
  { syntax: 'due:week', meaning: 'Due in the next 7 days' },
  { syntax: 'is:open', meaning: 'Not done yet' },
  { syntax: 'is:completed', meaning: 'Done' },
  { syntax: 'column:Doing', meaning: 'Sitting in a named column' },
];

const POPOVER_WIDTH = 288; // matches w-72

/**
 * Small "?" popover that lists the query language.
 *
 * Rendered into a portal so it can never be trapped behind a sibling card
 * (the List view's filter panel is a card that creates its own stacking
 * context). Positioned with `fixed` coordinates read from the trigger, so
 * it lines up regardless of scroll.
 */
const QueryHelp = () => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  // Compute the popover's coordinates whenever it opens, and keep them in
  // sync if the user scrolls or the window resizes while it is open.
  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const update = () => {
      const r = buttonRef.current!.getBoundingClientRect();
      // Right-align the popover to the button. Clamp to the viewport so a
      // narrow phone does not push it off-screen.
      const left = Math.max(8, Math.min(r.right - POPOVER_WIDTH, window.innerWidth - POPOVER_WIDTH - 8));
      setPosition({ top: r.bottom + 8, left });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  // Esc closes it, matching every other popover in the app.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Query syntax help"
        aria-expanded={open}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-surface-2 text-xs font-semibold text-ink-muted transition-colors hover:border-accent hover:text-ink"
      >
        ?
      </button>

      {open &&
        position &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[9998]"
              onClick={() => setOpen(false)}
              role="presentation"
            />
            <div
              role="dialog"
              aria-label="Filter syntax"
              style={{ top: position.top, left: position.left, width: POPOVER_WIDTH }}
              className="fixed z-[9999] rounded-xl border border-hairline bg-surface p-4 shadow-xl"
            >
              <p className="mb-3 font-handwritten text-lg text-ink">Filter syntax</p>
              <ul className="space-y-1.5">
                {OPERATORS.map((op) => (
                  <li key={op.syntax} className="flex items-baseline gap-2 text-xs">
                    <code className="shrink-0 rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] text-ink">
                      {op.syntax}
                    </code>
                    <span className="text-ink-muted">{op.meaning}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] text-ink-muted">
                Combine freely:{' '}
                <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">
                  @me #work due:week
                </code>
              </p>
            </div>
          </>,
          document.body
        )}
    </>
  );
};

export default QueryHelp;