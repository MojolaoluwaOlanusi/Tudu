import { useState } from 'react';

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

const QueryHelp = () => {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Query syntax help"
        aria-expanded={open}
        className="flex h-7 w-7 items-center justify-center rounded-full border border-hairline bg-surface-2 text-xs font-semibold text-ink-muted transition-colors hover:border-accent hover:text-ink"
      >
        ?
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
            role="presentation"
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-hairline bg-surface p-4 shadow-xl">
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
              <code className="rounded bg-surface-2 px-1 py-0.5 font-mono">@me #work due:week</code>
            </p>
          </div>
        </>
      )}
    </div>
  );
};

export default QueryHelp;
