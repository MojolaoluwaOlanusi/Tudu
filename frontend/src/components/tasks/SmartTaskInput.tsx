import React, { useState } from 'react';
import { format } from 'date-fns';
import { useParseTaskText } from '../../hooks/useParseTaskText';
import { ParsedTaskText } from '../../types/nlp';

interface SmartTaskInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Called when the user confirms the preview and wants the fields filled in. */
  onApply: (parsed: ParsedTaskText) => void;
  disabled?: boolean;
}

const SYNTAX_HELP: { example: string; result: string }[] = [
  { example: 'Buy milk tomorrow at 9am #personal', result: 'due tomorrow 9am · personal' },
  { example: 'Finish report urgent #work', result: 'high priority · work' },
  { example: 'Study for exam next week #study', result: 'due next week · study' },
  { example: 'Pay rent friday low priority', result: 'due friday · low priority' },
];

const chipClass =
  'inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink';

/**
 * Title input that understands plain language.
 *
 * Shows a live preview of what will be understood, and leaves the fields
 * untouched until the user confirms - nothing is applied behind their back.
 */
const SmartTaskInput: React.FC<SmartTaskInputProps> = ({
  value,
  onChange,
  onApply,
  disabled,
}) => {
  const { result, isParsing } = useParseTaskText(value);
  const [showHelp, setShowHelp] = useState(false);

  const chips: { label: string; value: string }[] = [];
  if (result?.dueDate) {
    chips.push({
      label: 'Due',
      value: format(new Date(result.dueDate), 'EEE d MMM, HH:mm'),
    });
  }
  if (result?.category) chips.push({ label: 'Category', value: result.category });
  if (result?.priority) chips.push({ label: 'Priority', value: result.priority });

  const hasChips = chips.length > 0;

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label className="label mb-0" htmlFor="task-title">
          Title *
        </label>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowHelp((open) => !open)}
            aria-expanded={showHelp}
            title="Show supported syntax"
            className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-hairline bg-surface-2 text-[11px] font-bold text-ink-muted transition-colors hover:border-accent hover:text-accent-strong"
          >
            ?
          </button>

          {showHelp && (
            <div className="absolute right-0 top-7 z-30 w-72 rounded-xl border border-hairline bg-surface p-3 shadow-lg">
              <p className="mb-2 text-xs font-semibold text-ink">Write it how you'd say it</p>
              <ul className="space-y-2">
                {SYNTAX_HELP.map((item) => (
                  <li key={item.example} className="text-xs">
                    <span className="block font-medium text-ink">&ldquo;{item.example}&rdquo;</span>
                    <span className="text-ink-muted">&rarr; {item.result}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 border-t border-hairline pt-2 text-[11px] text-ink-muted">
                Categories: <code>#work</code> <code>#personal</code> <code>#study</code>
              </p>
              <p className="mt-1 text-[11px] text-ink-muted">
                Priority: urgent, asap, low priority, no rush
              </p>
            </div>
          )}
        </div>
      </div>

      <textarea
        id="task-title"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input resize-none"
        rows={2}
        placeholder="What needs doing? Try: Buy milk tomorrow at 9am #personal"
        disabled={disabled}
      />

      {(hasChips || isParsing) && (
        <div className="animate-fade-in mt-2 rounded-xl border border-hairline bg-surface-2 p-3">
          {isParsing && !hasChips ? (
            <p className="text-xs text-ink-muted">Reading that&hellip;</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span key={chip.label} className={chipClass}>
                    <span className="text-ink-muted">{chip.label}</span>
                    <span className="capitalize text-ink">{chip.value}</span>
                  </span>
                ))}
              </div>

              {result?.title && result.title !== value.trim() && (
                <p className="mt-2 text-xs text-ink-muted">
                  Title becomes <span className="font-medium text-ink">{result.title}</span>
                </p>
              )}

              <button
                type="button"
                onClick={() => result && onApply(result)}
                className="btn-ghost mt-2 !py-1 !text-xs"
              >
                Use these details
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default SmartTaskInput;