import React, { useEffect, useState } from 'react';
import {
  useCreateWorkspace,
  useInviteMember,
  useRemoveMember,
  useSetMemberRole,
  useWorkspaceMembers,
  useWorkspaces,
} from '../../hooks/useWorkspaces';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import type { BoardRole } from '../../types/board';

const ROLE_LABELS: Record<BoardRole, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

interface TeamModalProps {
  onClose: () => void;
}

/** Create a workspace, invite people to it, and manage their roles. */
const TeamModal: React.FC<TeamModalProps> = ({ onClose }) => {
  const myId = useAuthStore((s) => s.user?.id);
  const pushToast = useUiStore((s) => s.pushToast);
  const { data: workspaces = [] } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const inviteMember = useInviteMember();
  const setRole = useSetMemberRole();
  const removeMember = useRemoveMember();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<BoardRole>('member');

  useEffect(() => {
    if (workspaces.length === 0) return;
    if (!selectedId || !workspaces.some((w) => w.id === selectedId)) {
      setSelectedId(workspaces[0].id);
    }
  }, [workspaces, selectedId]);

  const workspace = workspaces.find((w) => w.id === selectedId) ?? null;
  const { data: members = [] } = useWorkspaceMembers(workspace?.id);
  const isAdmin = workspace?.role === 'admin';
  const busy =
    createWorkspace.isPending ||
    inviteMember.isPending ||
    setRole.isPending ||
    removeMember.isPending;

  const fail = (err: unknown, fallback: string) =>
    pushToast(
      (err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback,
      'error'
    );

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    createWorkspace.mutate(name, {
      onSuccess: (created) => {
        setNewName('');
        setSelectedId(created.id);
        pushToast(`Workspace "${created.name}" created`, 'success');
      },
      onError: (err) => fail(err, 'Could not create the workspace'),
    });
  };

  const handleInvite = (event: React.FormEvent) => {
    event.preventDefault();
    if (!workspace || !email.trim()) return;
    inviteMember.mutate(
      { workspaceId: workspace.id, email: email.trim(), role: inviteRole },
      {
        onSuccess: () => {
          setEmail('');
          pushToast('Invitation sent', 'success');
        },
        onError: (err) => fail(err, 'Could not send the invitation'),
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Team workspaces"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-handwritten text-2xl text-ink">Team</h2>
            <p className="text-xs text-ink-muted">
              A workspace holds shared boards. Everyone in it sees the same tasks.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleCreate} className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="New workspace name"
            maxLength={255}
            aria-label="New workspace name"
            className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newName.trim() || busy}
            className="btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Create workspace
          </button>
        </form>

        {workspaces.length === 0 ? (
          <p className="text-sm text-ink-muted">You are not in a workspace yet.</p>
        ) : (
          <>
            <label className="mb-3 flex items-center gap-2 text-xs text-ink-muted">
              Workspace
              <select
                value={selectedId ?? ''}
                onChange={(event) => setSelectedId(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2 py-1.5 text-sm text-ink"
              >
                {workspaces.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({ROLE_LABELS[w.role]})
                  </option>
                ))}
              </select>
            </label>

            <ul className="space-y-2">
              {members.map((member) => {
                const isMe = member.id === myId;
                return (
                  <li
                    key={member.id}
                    className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-ink">
                        {member.name || member.email}
                        {isMe ? ' (you)' : ''}
                      </p>
                      <p className="truncate text-[11px] text-ink-muted">
                        {member.email}
                        {member.status === 'pending' ? ' · invited' : ''}
                      </p>
                    </div>

                    {isAdmin && member.status === 'accepted' ? (
                      <select
                        value={member.role}
                        aria-label={`Role of ${member.name || member.email}`}
                        disabled={busy}
                        onChange={(event) =>
                          setRole.mutate(
                            {
                              workspaceId: workspace!.id,
                              userId: member.id,
                              role: event.target.value as BoardRole,
                            },
                            { onError: (err) => fail(err, 'Could not change the role') }
                          )
                        }
                        className="rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-ink"
                      >
                        {(Object.keys(ROLE_LABELS) as BoardRole[]).map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[11px] uppercase text-ink-muted">
                        {ROLE_LABELS[member.role]}
                      </span>
                    )}

                    {(isAdmin || isMe) && (
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          const text = isMe
                            ? 'Leave this workspace?'
                            : member.status === 'pending'
                              ? 'Cancel this invitation?'
                              : `Remove ${member.name || member.email}?`;
                          if (!window.confirm(text)) return;
                          removeMember.mutate(
                            { workspaceId: workspace!.id, userId: member.id },
                            {
                              onSuccess: () =>
                                pushToast(isMe ? 'You left the workspace' : 'Removed', 'success'),
                              onError: (err) => fail(err, 'Could not remove the member'),
                            }
                          );
                        }}
                        className="rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300 disabled:opacity-40"
                      >
                        {isMe ? 'Leave' : member.status === 'pending' ? 'Cancel' : 'Remove'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {isAdmin && (
              <form onSubmit={handleInvite} className="mt-4 flex flex-wrap items-center gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="teammate@email.com"
                  aria-label="Email to invite"
                  className="min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                />
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as BoardRole)}
                  aria-label="Role for the invitation"
                  className="rounded-lg border border-hairline bg-surface px-2 py-2 text-sm text-ink"
                >
                  {(Object.keys(ROLE_LABELS) as BoardRole[]).map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={!email.trim() || busy}
                  className="btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
                >
                  Invite
                </button>
              </form>
            )}
            {isAdmin && (
              <p className="mt-2 text-[11px] text-ink-muted">
                They need a Tudu account already. The invitation appears in their app and they
                accept it there.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TeamModal;
