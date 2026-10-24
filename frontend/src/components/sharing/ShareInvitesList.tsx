import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSharedWithMe, useRespondToShare, flattenShares } from '../../hooks/useSharing';
import { useUiStore } from '../../store/uiStore';
import Avatar from './Avatar';

/**
 * The bare list of pending share invitations with Accept/Decline actions.
 *
 * The Sidebar wraps this in its own CollapsibleSection, so this component
 * deliberately renders only the <ul> — no heading, no card. The old
 * `ShareInvites.tsx` (card wrapper + heading) is left in place for mobile
 * usage by other callers until cleanup.
 */
const ShareInvitesList: React.FC = () => {
  const { data, isLoading } = useSharedWithMe();
  const respond = useRespondToShare();
  const pushToast = useUiStore((s) => s.pushToast);
  const navigate = useNavigate();

  const pending = flattenShares(data).filter((share) => share.status === 'pending');
  if (isLoading || pending.length === 0) return null;

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

  return (
    <ul className="space-y-2 px-2">
      {pending.map((share) => (
        <li key={share.id} className="rounded-md bg-raised p-2">
          <div className="flex items-center gap-2">
            <Avatar user={share.owner} size="h-6 w-6" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-ink">
                {share.owner?.name || share.owner?.email || 'Someone'}
              </p>
              <p className="truncate text-[10px] uppercase text-ink-faint">
                {share.task_count ?? 0} task{(share.task_count ?? 0) === 1 ? '' : 's'} ·{' '}
                {share.permissions === 'read_write' ? 'edit' : 'view'}
              </p>
            </div>
          </div>
          <div className="mt-1.5 flex gap-1">
            <button
              type="button"
              onClick={() => handleRespond(share.id, 'accepted')}
              disabled={respond.isPending}
              className="flex-1 rounded-md bg-accent px-2 py-1 text-[11px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-50"
            >
              Accept
            </button>
            <button
              type="button"
              onClick={() => handleRespond(share.id, 'declined')}
              disabled={respond.isPending}
              className="flex-1 rounded-md border border-hairline bg-surface px-2 py-1 text-[11px] font-semibold text-ink transition-colors hover:border-red-300 hover:text-red-600 disabled:opacity-50"
            >
              Decline
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
};

export default ShareInvitesList;
