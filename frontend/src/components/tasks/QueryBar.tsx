import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QueryHelp from './QueryHelp';

/**
 * Suggestion groups. When the current word the user is typing starts with a
 * prefix, these are the candidates. Extend by adding an entry — the rest of
 * the component (chip extraction, URL sync) is generic.
 */
const SUGGESTION_GROUPS: { prefix: string; values: string[] }[] = [
  { prefix: '#', values: ['#work', '#personal', '#study'] },
  { prefix: '@', values: ['@me'] },
  { prefix: 'due:', values: ['due:overdue', 'due:today', 'due:week'] },
  { prefix: 'priority:', values: ['priority:high', 'priority:medium', 'priority:low'] },
  { prefix: 'is:', values: ['is:open', 'is:completed'] },
];

/**
 * A "complete" operator. Only tokens that match one of these become chips;
 * anything else (including an unknown "#urgent") stays as free text, which
 * is exactly what the backend's parser falls back to as well.
 */
const OPERATOR_RES = [
  /^@me$/,
  /^@[^\s@]+@[^\s@]+$/,
  /^#(work|personal|study)$/i,
  /^due:(overdue|today|week)$/i,
  /^priority:(high|medium|low)$/i,
  /^is:(open|completed)$/i,
  /^column:.+$/,
];

const isOperator = (token: string): boolean => OPERATOR_RES.some((re) => re.test(token));

const getSuggestions = (input: string): string[] => {
  if (!input) return [];
  const lastWord = input.split(/\s+/).pop() ?? '';
  if (!lastWord) return [];
  const lower = lastWord.toLowerCase();
  for (const group of SUGGESTION_GROUPS) {
    if (lower.startsWith(group.prefix)) {
      return group.values.filter(
        (v) => v.toLowerCase().startsWith(lower) && v.toLowerCase() !== lower
      );
    }
  }
  return [];
};

const parseUrlQuery = (q: string): { chips: string[]; input: string } => {
  const tokens = q.split(/\s+/).filter(Boolean);
  const chips: string[] = [];
  const free: string[] = [];
  for (const t of tokens) {
    if (isOperator(t)) chips.push(t);
    else free.push(t);
  }
  return { chips, input: free.join(' ') };
};

/**
 * GitHub-style search bar.
 *
 * As the user types, a recognised operator prefix (# @ due: priority: is:)
 * opens a suggestion list. Arrow keys navigate, Enter / Tab applies, Esc
 * dismisses. When a complete operator is finished (space, Enter on a
 * suggestion, or clicking the suggestion) it becomes a green chip inside the
 * field. Free text stays in the input. Chips are removed by clicking the ×
 * or by pressing Backspace on an empty input.
 *
 * The URL (?q=) is the source of truth, so a shared link restores the exact
 * chips-and-text state, and the List view's filter store is fed unchanged.
 */
const QueryBar = () => {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') ?? '';

  const [chips, setChips] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const initializedRef = useRef(false);

  // Read the URL once on mount.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    const parsed = parseUrlQuery(urlQuery);
    setChips(parsed.chips);
    setInput(parsed.input);
  }, [urlQuery]);

  // Write the URL whenever the query changes.
  useEffect(() => {
    if (!initializedRef.current) return;
    const parts = [...chips, input].filter(Boolean);
    const q = parts.join(' ').trim();
    if (q === urlQuery) return;
    const next = new URLSearchParams(window.location.search);
    if (q) next.set('q', q);
    else next.delete('q');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chips, input]);

  const suggestions = useMemo(() => getSuggestions(input), [input]);

  // Reset the highlight whenever the candidate list changes.
  useEffect(() => {
    setActiveSuggestion(0);
  }, [input]);

  const applySuggestion = (value: string) => {
    // Remove the word the user is currently typing from the input; the chip
    // replaces it. Anything before that word stays as free text.
    const withoutCurrent = input.replace(/\s*\S+\s*$/, '').replace(/\s+$/, '');
    setChips((c) => [...c, value]);
    setInput(withoutCurrent);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const removeChip = (index: number) => {
    setChips((c) => c.filter((_, i) => i !== index));
    inputRef.current?.focus();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // A space finishes the current word. If that word is a complete operator,
    // promote it to a chip; otherwise it stays as free text.
    if (value.endsWith(' ') && !input.endsWith(' ')) {
      const trimmed = value.trimEnd();
      const lastSpace = trimmed.lastIndexOf(' ');
      const word = lastSpace === -1 ? trimmed : trimmed.slice(lastSpace + 1);
      if (isOperator(word)) {
        const rest = lastSpace === -1 ? '' : trimmed.slice(0, lastSpace + 1);
        setChips((c) => [...c, word]);
        setInput(rest);
        return;
      }
    }

    // Strip leading whitespace; trailing whitespace is meaningful.
    setInput(value.replace(/^\s+/, ''));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showSuggestions && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveSuggestion((i) => (i + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveSuggestion((i) => (i - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[activeSuggestion]);
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // Backspace on an empty input removes the last chip.
    if (e.key === 'Backspace' && input === '' && chips.length > 0) {
      setChips((c) => c.slice(0, -1));
      return;
    }
  };

  return (
    <div className="relative">
      <div
        className="flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-full border border-hairline bg-surface py-1.5 pl-10 pr-12 transition-colors focus-within:border-accent"
        onClick={() => inputRef.current?.focus()}
      >
        {chips.map((chip, i) => (
          <span
            key={`${chip}-${i}`}
            className="flex items-center gap-1 rounded-full border border-accent/30 bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent-strong"
          >
            <span className="font-mono">{chip}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeChip(i);
              }}
              aria-label={`Remove filter ${chip}`}
              className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-accent-strong/70 transition-colors hover:bg-accent/20 hover:text-accent-strong"
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 10 10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M2 2l6 6M8 2l-6 6" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => window.setTimeout(() => setShowSuggestions(false), 120)}
          placeholder={
            chips.length === 0 && !input ? 'Search tasks, or try @me #work due:week…' : ''
          }
          data-shortcut-search=""
          aria-label="Search and filter tasks"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="min-w-[60px] flex-1 bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
        />
      </div>

      {/* Search icon — stays aligned with the first row of chips. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-[13px] text-ink-muted"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="6.5" cy="6.5" r="4.5" />
          <path d="M10 10l4 4" strokeLinecap="round" />
        </svg>
      </span>

      <div className="absolute right-2 top-[9px]">
        <QueryHelp />
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-hairline bg-surface shadow-xl">
          <p className="px-3 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Filters
          </p>
          <ul className="pb-1">
            {suggestions.map((s, i) => (
              <li key={s}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applySuggestion(s)}
                  onMouseEnter={() => setActiveSuggestion(i)}
                  className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors ${
                    i === activeSuggestion
                      ? 'bg-accent/10 text-ink'
                      : 'text-ink-muted hover:bg-surface-2'
                  }`}
                >
                  <code className="font-mono text-xs">{s}</code>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default QueryBar;