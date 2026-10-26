import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSharedWithMe, useRespondToShare, flattenShares } from '../../hooks/useSharing';
import { useUiStore } from '../../store/uiStore';
import Avatar from './Avatar';

/**
 * Pending invitations addressed to me.
 *
 * Step 11 restyle: the card uses the brand-subtle tint (not `border-accent`)
 * so it reads as informative rather than a primary action, and the Accept
 * button inherits the brand fill directly. Behaviour unchanged: same
 * queries, same accept/decline mutation, same redirect to the shared list.
 */
const ShareInvites: React.FC = () => {
  const { data, isLoading } = useSharedWithMe();
  const respond = useRespondToShare();
  const pushToast = useUiStore((s) => s.pushToast);
  const navigate = useNavigate();

  const pending = flattenShares(data).filter((share) => share.status === 'pending');

  const handleRespond = (id: string, status: 'accepted' | 'declined') => {
    respond.mutate(
      { sharedListId: id, status },
      {
        onSuccess: () => {
          pushToast(
            status === 'accepted' ? 'Invitation accepted' : 'Invitation declined',
            'success',
          );
          if (status === 'accepted') navigate(`/shared/${id}`);
        },
        onError: (err: any) =>
          pushToast(
            err?.response?.data?.error || 'Could not update the invitation',
            'error',
          ),
      },
    );
  };

  if (isLoading || pending.length === 0) return null;

  return (
    <section className="rounded-xl border border-brand/40 bg-brand-subtle/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-handwritten text-xl text-ink">
          Invitations
        </h3>
        <span className="rounded-sm bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
          {pending.length}
        </span>
      </div>
      <p className="mb-3 text-[11px] text-ink-muted">
        Somebody shared a list with you.
      </p>

      <ul className="space-y-3">
        {pending.map((share) => (
          <li key={share.id} className="rounded-lg border border-line-subtle bg-surface p-2.5">
            <div className="flex items-center gap-2">
              <Avatar user={share.owner} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink">
                  {share.owner?.name || share.owner?.email || 'Someone'}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-ink-faint">
                  {share.task_count ?? 0} task
                  {(share.task_count ?? 0) === 1 ? '' : 's'} ·{' '}
                  {share.permissions === 'read_write' ? 'can edit' : 'view only'}
                </p>
              </div>
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => handleRespond(share.id, 'accepted')}
                disabled={respond.isPending}
                className="flex-1 rounded-lg bg-brand px-2.5 py-1.5 text-xs font-semibold text-ink-inverse shadow-sm transition-colors hover:bg-brand-hover disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => handleRespond(share.id, 'declined')}
                disabled={respond.isPending}
                className="flex-1 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-red-300 hover:text-red-500 disabled:opacity-50"
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