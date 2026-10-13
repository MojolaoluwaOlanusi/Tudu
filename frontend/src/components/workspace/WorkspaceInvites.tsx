import React from 'react';
import { useRespondToWorkspaceInvite, useWorkspaceInvites } from '../../hooks/useWorkspaces';
import { useUiStore } from '../../store/uiStore';

/**
 * Pending workspace invitations, with Accept / Decline.
 * Same idea as ShareInvites: an invitation can never be stranded where the
 * user cannot see it.
 */
const WorkspaceInvites: React.FC = () => {
  const { data: invites = [] } = useWorkspaceInvites();
  const respond = useRespondToWorkspaceInvite();
  const pushToast = useUiStore((s) => s.pushToast);

  if (invites.length === 0) return null;

  const answer = (workspaceId: string, status: 'accepted' | 'declined') =>
    respond.mutate(
      { workspaceId, status },
      {
        onSuccess: () =>
          pushToast(
            status === 'accepted' ? 'You joined the workspace' : 'Invitation declined',
            'success'
          ),
        onError: (err) =>
          pushToast(
            (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
              'Could not answer the invitation',
            'error'
          ),
      }
    );

  return (
    <section className="card mb-4 border-accent p-4" aria-label="Workspace invitations">
      <h3 className="mb-1 font-handwritten text-xl text-ink">
        Team invitations ({invites.length})
      </h3>
      <ul className="space-y-2">
        {invites.map((invite) => (
          <li key={invite.workspace_id} className="rounded-xl bg-surface-2 p-3">
            <p className="text-sm font-semibold text-ink">{invite.workspace_name}</p>
            <p className="text-[11px] text-ink-muted">
              {invite.inviter_name || invite.inviter_email || 'Someone'} invited you as{' '}
              {invite.role}
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={respond.isPending}
                onClick={() => answer(invite.workspace_id, 'accepted')}
                className="flex-1 rounded-lg bg-[#22c55e] px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-[#16a34a] disabled:opacity-50"
              >
                Accept
              </button>
              <button
                type="button"
                disabled={respond.isPending}
                onClick={() => answer(invite.workspace_id, 'declined')}
                className="flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-50"
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

export default WorkspaceInvites;
