import React, { useEffect, useState } from 'react';
import {
  useCreateWorkspace,
  useInviteMember,
  useRemoveMember,
  useSetMemberRole,
  useWorkspaceMembers,
  useWorkspaces,
} from '../../../hooks/useWorkspaces';
import { useAuthStore } from '../../../store/authStore';
import { useUiStore } from '../../../store/uiStore';
import type { BoardRole } from '../../../types/board';
import { Avatar, PageHeader, Section } from './primitives';

const ROLE_LABELS: Record<BoardRole, string> = {
  admin: 'Admin',
  member: 'Member',
  viewer: 'Viewer',
};

const SettingsWorkspace: React.FC = () => {
  const myId = useAuthStore((s) => s.user?.id);
  const pushToast = useUiStore((s) => s.pushToast);
  const { data: workspaces = [] } = useWorkspaces();
  const createWorkspace = useCreateWorkspace();
  const invite = useInviteMember();
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

  const fail = (err: unknown, fallback: string) =>
    pushToast((err as { response?: { data?: { error?: string } } })?.response?.data?.error || fallback, 'error');

  return (
    <div>
      <PageHeader title="Workspace" description="Teams you share boards with." />

      <Section title="Create a workspace">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const name = newName.trim();
            if (!name) return;
            createWorkspace.mutate(name, {
              onSuccess: (w) => {
                setNewName('');
                setSelectedId(w.id);
                pushToast('Workspace created', 'success');
              },
              onError: (err) => fail(err, 'Could not create the workspace'),
            });
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New workspace name"
            maxLength={255}
            aria-label="New workspace name"
            className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newName.trim() || createWorkspace.isPending}
            className="btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50"
          >
            Create
          </button>
        </form>
      </Section>

      {workspaces.length === 0 ? null : (
        <Section title="Members">
          <label className="mb-3 flex items-center gap-2 text-xs text-ink-muted">
            Workspace
            <select
              value={selectedId ?? ''}
              onChange={(e) => setSelectedId(e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} ({ROLE_LABELS[w.role]})
                </option>
              ))}
            </select>
          </label>

          <ul className="space-y-2">
            {members.map((m) => {
              const isMe = m.id === myId;
              return (
                <li key={m.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-line-subtle bg-canvas p-3">
                  <Avatar name={m.name} email={m.email} url={m.avatar_url} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">
                      {m.name || m.email}
                      {isMe ? ' (you)' : ''}
                    </p>
                    <p className="truncate text-[11px] text-ink-muted">
                      {m.email}
                      {m.status === 'pending' ? ' · invited' : ''}
                    </p>
                  </div>
                  {isAdmin && m.status === 'accepted' ? (
                    <select
                      value={m.role}
                      aria-label={'Role of ' + (m.name || m.email)}
                      onChange={(e) =>
                        setRole.mutate(
                          { workspaceId: workspace!.id, userId: m.id, role: e.target.value as BoardRole },
                          { onError: (err) => fail(err, 'Could not change the role') },
                        )
                      }
                      className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink"
                    >
                      {(Object.keys(ROLE_LABELS) as BoardRole[]).map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-[11px] uppercase text-ink-muted">{ROLE_LABELS[m.role]}</span>
                  )}
                  {(isAdmin || isMe) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (!window.confirm(isMe ? 'Leave this workspace?' : 'Remove ' + (m.name || m.email) + '?')) return;
                        removeMember.mutate(
                          { workspaceId: workspace!.id, userId: m.id },
                          { onSuccess: () => pushToast(isMe ? 'You left' : 'Removed', 'success') },
                        );
                      }}
                      className="rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300"
                    >
                      {isMe ? 'Leave' : m.status === 'pending' ? 'Cancel' : 'Remove'}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>

          {isAdmin && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!workspace || !email.trim()) return;
                invite.mutate(
                  { workspaceId: workspace.id, email: email.trim(), role: inviteRole },
                  {
                    onSuccess: () => { setEmail(''); pushToast('Invitation sent', 'success'); },
                    onError: (err) => fail(err, 'Could not send the invitation'),
                  },
                );
              }}
              className="mt-4 flex flex-wrap items-center gap-2"
            >
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teammate@email.com"
                aria-label="Email to invite"
                className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-2.5 py-2 text-sm text-ink focus:border-brand focus:outline-none"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as BoardRole)}
                aria-label="Role for the invitation"
                className="rounded-lg border border-line bg-surface px-2 py-2 text-sm text-ink"
              >
                {(Object.keys(ROLE_LABELS) as BoardRole[]).map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
              <button type="submit" disabled={!email.trim()} className="btn-accent rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50">
                Invite
              </button>
            </form>
          )}
        </Section>
      )}
    </div>
  );
};

export default SettingsWorkspace;
