import { useSearchParams } from 'react-router-dom';

/**
 * One-click flip of the sort direction.
 *
 * The sort key is unchanged; only `?order=` is toggled. The natural direction
 * for a key (e.g. due_date asc = soonest first) is baked into the dropdown
 * options; this button just gives a fast way to reverse whatever is active.
 */
const SortDirectionToggle = () => {
  const [params, setParams] = useSearchParams();
  const order = params.get('order') === 'asc' ? 'asc' : 'desc';
  const next = order === 'asc' ? 'desc' : 'asc';

  const toggle = () => {
    const p = new URLSearchParams(params);
    p.set('order', next);
    setParams(p, { replace: true });
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={order === 'asc' ? 'Sort descending' : 'Sort ascending'}
      title={order === 'asc' ? 'Switch to descending' : 'Switch to ascending'}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-hairline bg-surface-2 text-ink-muted transition-colors hover:border-accent hover:text-ink focus:border-accent focus:outline-none"
    >
      {order === 'asc' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v10M4 9l4 4 4-4" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 13V3M4 7l4-4 4 4" />
        </svg>
      )}
    </button>
  );
};

export default SortDirectionToggle;

