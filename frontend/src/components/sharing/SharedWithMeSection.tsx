import React from 'react';
import { Link } from 'react-router-dom';
import { useSharedWithMe, flattenShares } from '../../hooks/useSharing';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import Avatar from './Avatar';

/**
 * "Shared with me" - reachable from the main page on every screen size.
 * The sidebar is desktop-only, so without this a shared list would be
 * unreachable on a phone.
 *
 * Step 11 polish: single card with a subtler outer border, and shared-list
 * rows show a small brand-tinted icon instead of a bare chevron. Behaviour
 * unchanged: same infinite query, same sentinel for the next page.
 */
const SharedWithMeSection: React.FC = () => {
  const { data, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useSharedWithMe();

  const all = flattenShares(data);
  const accepted = all.filter((share) => share.status === 'accepted');
  const pending = all.filter((share) => share.status === 'pending');

  const sentinelRef = useInfiniteScroll(
    fetchNextPage,
    Boolean(hasNextPage) && !isFetchingNextPage,
  );

  if (isLoading || (accepted.length === 0 && pending.length === 0)) return null;

  return (
    <section className="mb-6 rounded-xl border border-line-subtle bg-surface p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-handwritten text-xl text-ink">Shared with me</h3>
        {pending.length > 0 && (
          <span className="rounded-sm bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
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
              className="group flex items-center gap-3 rounded-lg border border-line-subtle bg-canvas p-3 transition-colors hover:border-brand/40 hover:bg-brand-subtle/10"
            >
              <Avatar user={share.owner} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink group-hover:text-brand">
                  {share.owner?.name || share.owner?.email || 'Someone'}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {share.task_count ?? 0} task
                  {(share.task_count ?? 0) === 1 ? '' : 's'} ·{' '}
                  <span className="uppercase">
                    {share.permissions === 'read_write' ? 'you can edit' : 'view only'}
                  </span>
                </p>
              </div>
              <svg
                className="h-4 w-4 shrink-0 text-ink-faint transition-all group-hover:translate-x-0.5 group-hover:text-brand"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      )}

      {hasNextPage && (
        <div
          ref={sentinelRef}
          className="mt-2 h-4 text-center text-[10px] text-ink-muted"
        >
          {isFetchingNextPage ? 'Loading more…' : ''}
        </div>
      )}
    </section>
  );
};

export default SharedWithMeSection;