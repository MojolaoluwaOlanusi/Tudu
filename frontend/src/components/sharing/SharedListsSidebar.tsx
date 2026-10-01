import React from 'react';
import { Link } from 'react-router-dom';
import { useMyShares, useSharedWithMe, useRemoveShare } from '../../hooks/useSharing';
import { SharedUser } from '../../types/share';

const Avatar: React.FC<{ user?: SharedUser; size?: string }> = ({ user, size = 'h-8 w-8' }) =>
  user?.avatar_url ? (
    <img
      src={user.avatar_url}
      alt={user.name || user.email}
      className={`${size} rounded-full object-cover ring-2 ring-accent`}
    />
  ) : (
    <span
      className={`${size} flex shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white`}
    >
      {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
    </span>
  );

const ProgressBar: React.FC<{ done: number; total: number }> = ({ done, total }) => {
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-surface-2">
        <span
          className="block h-full rounded-full bg-accent transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="shrink-0 text-[10px] font-medium text-ink-muted">
        {done}/{total}
      </span>
    </div>
  );
};

/** Sidebar with "Shared with me" and "Shared by me" lists. */
const SharedListsSidebar: React.FC = () => {
  const { data: withMe, isLoading } = useSharedWithMe();
  const { data: mine } = useMyShares();
  const removeShare = useRemoveShare();

  const pending = (mine ?? []).filter((share) => share.status === 'pending');

  return (
    <div className="space-y-5">
      {/* ---------------- Shared with me ---------------- */}
      <section className="card p-4">
        <h3 className="mb-3 font-handwritten text-xl text-ink">Shared with me</h3>

        {isLoading ? (
          <p className="text-xs text-ink-muted">Loading…</p>
        ) : (withMe ?? []).length === 0 ? (
          <p className="text-xs text-ink-muted">
            Nothing shared with you yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {(withMe ?? []).map((share) => (
              <li key={share.id} className="rounded-xl bg-surface-2 p-2.5">
                <div className="flex items-center gap-2">
                  <Avatar user={share.owner} />
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/shared/${share.id}`}
                      className="block truncate text-xs font-semibold text-ink hover:text-accent-strong"
                    >
                      {share.owner?.name || share.owner?.email || 'Unknown'}
                    </Link>
                    <span className="text-[10px] uppercase text-ink-muted">
                      {share.permissions === 'read_write' ? 'can edit' : 'view only'}
                    </span>
                  </div>
                </div>
                <div className="mt-2">
                  <ProgressBar
                    done={share.tasks_completed ?? 0}
                    total={share.task_count ?? 0}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---------------- Shared by me ---------------- */}
      <section className="card p-4">
        <h3 className="mb-3 font-handwritten text-xl text-ink">Shared by me</h3>

        {(mine ?? []).length === 0 ? (
          <p className="text-xs text-ink-muted">You have not shared anything yet.</p>
        ) : (
          <ul className="space-y-2">
            {(mine ?? []).map((share) => (
              <li key={share.id} className="rounded-xl bg-surface-2 p-2.5">
                <div className="flex items-center gap-2">
                  <Avatar user={share.shared_with} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-ink">
                      {share.shared_with?.name || share.shared_with?.email}
                    </p>
                    <p className="text-[10px] uppercase text-ink-muted">
                      {share.status === 'pending'
                        ? 'awaiting response'
                        : share.status === 'accepted'
                          ? 'accepted'
                          : 'declined'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeShare.mutate(share.id)}
                    aria-label="Stop sharing"
                    className="shrink-0 rounded p-1 text-ink-muted hover:text-red-500"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        {pending.length > 0 && (
          <p className="mt-2 text-[10px] text-ink-muted">
            {pending.length} invitation{pending.length === 1 ? '' : 's'} waiting for a
            response.
          </p>
        )}
      </section>
    </div>
  );
};

export default SharedListsSidebar;