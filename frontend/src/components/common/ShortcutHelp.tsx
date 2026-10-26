import { X } from 'lucide-react';
import { useShortcutHelpStore } from '../../store/shortcutHelpStore';

/**
 * Shortcut reference.
 *
 * Grouping and copy follow the mockup (`Global`, `Navigation (press G,
 * then key)`, `Tasks`). The list is kept in sync with
 * `useKeyboardShortcuts` — every key that hook handles is documented
 * here, and every key documented here is actually wired.
 */
const GROUPS: { title: string; items: { keys: string[]; label: string }[] }[] = [
  {
    title: 'Global',
    items: [
      { keys: ['Ctrl', 'K'], label: 'Command palette' },
      { keys: ['Ctrl', 'Shift', 'D'], label: 'Toggle density' },
      { keys: ['Ctrl', 'Z'], label: 'Undo the last delete' },
      { keys: ['T'], label: 'Toggle theme' },
      { keys: ['?'], label: 'Show this help' },
      { keys: ['Esc'], label: 'Close panel / dismiss' },
    ],
  },
  {
    title: 'Navigation (press G, then key)',
    items: [
      { keys: ['G', 'L'], label: 'Go to List' },
      { keys: ['G', 'B'], label: 'Go to Board' },
      { keys: ['G', 'S'], label: 'Go to Stats' },
      { keys: ['G', 'A'], label: 'Go to Analytics' },
      { keys: ['G', ','], label: 'Go to Settings' },
      { keys: ['G', 'T'], label: 'Go to Templates' },
      { keys: ['G', 'I'], label: 'Go to Integrations' },
      { keys: ['G', 'P'], label: 'Go to Pricing' },
    ],
  },
  {
    title: 'Tasks',
    items: [
      { keys: ['N'], label: 'New task' },
      { keys: ['/'], label: 'Focus the search bar' },
      { keys: ['F'], label: 'Toggle filters' },
    ],
  },
];

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
          <h2 className="font-handwritten text-2xl text-ink">
            Keyboard shortcuts
          </h2>
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
                  <li
                    key={item.label}
                    className="flex items-center justify-between gap-3 text-[13px]"
                  >
                    <span className="min-w-0 flex-1 text-ink">
                      {item.label}
                    </span>
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