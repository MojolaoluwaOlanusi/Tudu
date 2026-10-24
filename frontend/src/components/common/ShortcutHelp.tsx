import { X } from 'lucide-react';
import { useShortcutHelpStore } from '../../store/shortcutHelpStore';

const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: 'Navigation',
    items: [
      { keys: ['g', 'l'], label: 'Go to List' },
      { keys: ['g', 'b'], label: 'Go to Board' },
      { keys: ['g', 's'], label: 'Go to Stats' },
      { keys: ['g', 'a'], label: 'Go to Analytics' },
    ],
  },
  {
    title: 'Tasks',
    items: [
      { keys: ['n'], label: 'New task' },
      { keys: ['/'], label: 'Focus the search bar' },
      { keys: ['Esc'], label: 'Close modal / deselect' },
    ],
  },
  {
    title: 'Global',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Command palette' },
      { keys: ['Ctrl', 'Shift', 'D'], label: 'Toggle density' },
      { keys: ['Ctrl', 'Z'], label: 'Undo the last delete' },
      { keys: ['?'], label: 'Show this help' },
    ],
  },
];

/**
 * Step 8: now a centred dialog (matches mockup's ShortcutHelp) instead of
 * the previous bottom-sheet. Behaviour unchanged: same
 * useShortcutHelpStore selectors, same backdrop/Esc close.
 */
const ShortcutHelp = () => {
  const isOpen = useShortcutHelpStore((s) => s.isOpen);
  const close = useShortcutHelpStore((s) => s.close);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4"
      onClick={close}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="flex items-center justify-between border-b border-line-subtle px-4 py-3">
          <h2 className="font-handwritten text-2xl text-ink">Keyboard shortcuts</h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="flex h-7 w-7 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4 scroll-hidden">
          {GROUPS.map((group) => (
            <section key={group.title} className="mb-5 last:mb-0">
              <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                {group.title}
              </h3>
              <ul className="space-y-1.5">
                {group.items.map((item) => (
                  <li key={item.label} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="min-w-0 flex-1 text-ink">{item.label}</span>
                    <span className="flex shrink-0 items-center gap-1">
                      {item.keys.map((key, i) => (
                        <kbd
                          key={key + i}
                          className="rounded border border-line bg-raised px-1.5 py-0.5 font-mono text-[10px] text-ink"
                        >
                          {key}
                        </kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ShortcutHelp;
