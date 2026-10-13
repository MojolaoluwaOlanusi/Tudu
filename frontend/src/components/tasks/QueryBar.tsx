import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import QueryHelp from './QueryHelp';

/**
 * The search-and-filter bar at the top of the List view.
 *
 * State lives in the URL (`?q=...`). Writes go to the URL immediately with
 * `replace: true`, so URL history does not fill up with one entry per
 * keystroke. Debouncing the *network* call is TaskList's job (300ms), so the
 * two effects do not stack.
 */
const QueryBar = () => {
  const [params, setParams] = useSearchParams();
  const urlQuery = params.get('q') ?? '';
  const [draft, setDraft] = useState(urlQuery);

  useEffect(() => {
    if (urlQuery !== draft) setDraft(urlQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlQuery]);

  useEffect(() => {
    if (draft === urlQuery) return;
    const next = new URLSearchParams(params);
    if (draft) next.set('q', draft);
    else next.delete('q');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div className="relative">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="6.5" cy="6.5" r="4.5" />
          <path d="M10 10l4 4" strokeLinecap="round" />
        </svg>
      </span>
      <input
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search tasks, or try @me #work due:week…"
        aria-label="Search and filter tasks"
        className="w-full rounded-full border border-hairline bg-surface px-10 py-2.5 pr-12 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2">
        <QueryHelp />
      </div>
    </div>
  );
};

export default QueryBar;
