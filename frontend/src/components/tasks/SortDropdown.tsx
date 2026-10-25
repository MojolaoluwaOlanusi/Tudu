import { useSearchParams } from 'react-router-dom';

const OPTIONS = [
  { value: 'created_at:desc', label: 'Newest first' },
  { value: 'created_at:asc', label: 'Oldest first' },
  { value: 'due_date:asc', label: 'Due soonest' },
  { value: 'due_date:desc', label: 'Due latest' },
  { value: 'priority:desc', label: 'High priority first' },
  { value: 'priority:asc', label: 'Low priority first' },
  { value: 'title:asc', label: 'Title A–Z' },
  { value: 'assignee:asc', label: 'Assignee A–Z' },
  { value: 'category:asc', label: 'Category A–Z' },
  { value: 'updated_at:desc', label: 'Recently updated' },
];

/**
 * Sort order for the List view. State lives in the URL next to \`?q=\`, so a
 * filtered *and* sorted view is shareable. The direction can also be flipped
 * with the SortDirectionToggle button beside this one.
 */
const SortDropdown = () => {
  const [params, setParams] = useSearchParams();
  const sort = params.get('sort') ?? 'created_at';
  const order = params.get('order') ?? 'desc';
  const value = sort + ':' + order;

  const onChange = (next: string) => {
    const [s, o] = next.split(':');
    const p = new URLSearchParams(params);
    p.set('sort', s);
    p.set('order', o);
    setParams(p, { replace: true });
  };

  return (
    <label className="flex shrink-0 items-center gap-1.5 text-xs text-ink-muted">
      <span className="sr-only">Sort by</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Sort by"
        className="rounded-xl border border-hairline bg-surface-2 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent focus:border-accent focus:outline-none"
      >
        {OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export default SortDropdown;

