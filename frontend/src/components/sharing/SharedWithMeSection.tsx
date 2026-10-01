import React from 'react';
import { Link } from 'react-router-dom';
import { useSharedWithMe } from '../../hooks/useSharing';
import Avatar from './Avatar';

/**
 * "Shared with me" - reachable from the main page on every screen size.
 * The sidebar is desktop-only, so without this a shared list would be
 * unreachable on a phone.
 */
const SharedWithMeSection: React.FC = () => {
  const { data, isLoading } = useSharedWithMe();

  const accepted = (data ?? []).filter((share) => share.status === 'accepted');
  const pending = (data ?? []).filter((share) => share.status === 'pending');

  if (isLoading || (accepted.length === 0 && pending.length === 0)) return null;

  return (
    <section className="card mb-6 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-handwritten text-xl text-ink">Shared with me</h3>
        {pending.length > 0 && (
          <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent-strong">
            {pending.length} awaiting you
          </span>
        )}
      </div>

      {accepted.length === 0 ? (
        <p className="text-xs text-ink-muted">
          Accept an invitation above to see the list.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {accepted.map((share) => (
            <Link
              key={share.id}
              to={`/shared/${share.id}`}
              className="group flex items-center gap-3 rounded-xl bg-surface-2 p-3 transition-colors hover:bg-accent-soft"
            >
              <Avatar user={share.owner} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink group-hover:text-accent-strong">
                  {share.owner?.name || share.owner?.email || 'Someone'}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {share.task_count ?? 0} task{(share.task_count ?? 0) === 1 ? '' : 's'} ·{' '}
                  <span className="uppercase">
                    {share.permissions === 'read_write' ? 'you can edit' : 'view only'}
                  </span>
                </p>
              </div>
              <svg
                className="h-4 w-4 shrink-0 text-ink-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent-strong"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
};

export default SharedWithMeSection;