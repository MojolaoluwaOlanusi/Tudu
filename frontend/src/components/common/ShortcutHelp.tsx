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
      { keys: ['Ctrl', 'Z'], label: 'Undo the last delete' },
      { keys: ['?'], label: 'Show this help' },
    ],
  },
];

/**
 * Modal listing every keyboard shortcut. Opened by pressing "?" and closed
 * with Esc, clicking outside, or the Close button.
 */
const ShortcutHelp = () => {
  const isOpen = useShortcutHelpStore((s) => s.isOpen);
  const close = useShortcutHelpStore((s) => s.close);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={close}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Keyboard shortcuts"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-handwritten text-2xl text-ink">Keyboard shortcuts</h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Press <kbd className="rounded border border-hairline bg-surface-2 px-1 font-mono text-[10px]">?</kbd>{' '}
              any time to see this list.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-full border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            Close
          </button>
        </div>

        {GROUPS.map((group) => (
          <section key={group.title} className="mb-5 last:mb-0">
            <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {group.title}
            </h3>
            <ul className="space-y-1.5">
              {group.items.map((item) => (
                <li key={item.label} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-ink">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key, i) => (
                      <kbd
                        key={key + i}
                        className="rounded border border-hairline bg-surface-2 px-2 py-0.5 font-mono text-[11px] text-ink"
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
  );
};

export default ShortcutHelp;
