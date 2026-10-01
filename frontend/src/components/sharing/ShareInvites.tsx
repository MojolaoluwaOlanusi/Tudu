import React from 'react';
import { useSharedWithMe, useRespondToShare } from '../../hooks/useSharing';
import { useUiStore } from '../../store/uiStore';
import { SharedUser } from '../../types/share';

const Avatar: React.FC<{ user?: SharedUser }> = ({ user }) =>
  user?.avatar_url ? (
    <img
      src={user.avatar_url}
      alt={user.name || user.email}
      className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-accent"
    />
  ) : (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white">
      {(user?.name || user?.email || '?').charAt(0).toUpperCase()}
    </span>
  );

/**
 * Pending invitations addressed to me, with Accept / Decline actions.
 * Rendered in the sidebar (desktop) and as a banner (mobile) so an
 * invitation can never be stranded somewhere the user cannot see it.
 */
const ShareInvites: React.FC = () => {
  const { data, isLoading } = useSharedWithMe();
  const respond = useRespondToShare();
  const pushToast = useUiStore((s) => s.pushToast);

  const pending = (data ?? []).filter((share) => share.status === 'pending');

  // Report the outcome so a failed request is never silent.
  const handleRespond = (id: string, status: 'accepted' | 'declined') => {
    respond.mutate(
      { sharedListId: id, status },
      {
        onSuccess: () =>
          pushToast(
            status === 'accepted' ? 'Invitation accepted' : 'Invitation declined',
            'success'
          ),
        onError: (err: any) =>
          pushToast(
            err?.response?.data?.error || 'Could not update the invitation',
            'error'
          ),
      }
    );
  };

  if (isLoading || pending.length === 0) return null;

  return (
    <section className="card border-accent p-4">
      <h3 className="mb-1 font-handwritten text-xl text-ink">
        Invitations ({pending.length})
      </h3>
      <p className="mb-3 text-[11px] text-ink-muted">
        Somebody shared a list with you.
      </p>

      <ul className="space-y-3">
        {pending.map((share) => (
          <li key={share.id} className="rounded-xl bg-surface-2 p-2.5">
            <div className="flex items-center gap-2">
              <Avatar user={share.owner} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink">
                  {share.owner?.name || share.owner?.email || 'Someone'}
                </p>
                <p className="text-[10px] uppercase text-ink-muted">
                  {share.task_count ?? 0} task{(share.task_count ?? 0) === 1 ? '' : 's'} ·{' '}
                  {share.permissions === 'read_write' ? 'can edit' : 'view only'}
                </p>
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => handleRespond(share.id, 'accepted')}
                disabled={respond.isPending}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#22c55e] px-2.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#16a34a] disabled:opacity-50"
              >
                <svg
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  viewBox="0 0 24 24"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
                Accept
              </button>
              <button
                type="button"
                onClick={() => handleRespond(share.id, 'declined')}
                disabled={respond.isPending}
                className="flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
};

export default ShareInvites;