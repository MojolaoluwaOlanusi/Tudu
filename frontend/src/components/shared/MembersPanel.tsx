import React from 'react';
import { TeamRole, TEAM_ROLES } from '../../types/board';
import { useAuthStore } from '../../store/authStore';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { useWorkspaces } from '../../hooks/useBoards';
import MemberBadge from './MemberBadge';

interface MembersPanelProps {
  workspaceId: string | null;
}

const MembersPanel: React.FC<MembersPanelProps> = ({ workspaceId }) => {
  const { token } = useAuthStore();
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspace);
  const activeBoardId = useWorkspaceStore((s) => s.activeBoard);

  // Use the selected workspace if provided, otherwise fall back to active workspace
  const targetWorkspaceId = workspaceId ?? activeWorkspaceId ?? null;

  const { data: workspaces } = useWorkspaces();
  const targetWorkspace = targetWorkspaceId
    ? workspaces?.find((ws: any) => ws.id === targetWorkspaceId)
    : null;

  // For now: show empty state with guidance (backend not wired to this component yet)
  // Future: fetch members from /api/workspaces/:id/members and render them here.

  if (targetWorkspaceId === null) {
    return (
      <div className="rounded-xl border border-hairline bg-surface-2 p-4 text-xs text-ink-muted">
        <p>No workspace selected.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-hairline bg-surface-2 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Members</h3>
        <span className="text-xs text-ink-muted">{targetWorkspace?.member_count ?? 0}</span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
          <div className="h-8 w-8 rounded-full bg-accent flex items-center justify-center text-white text-xs font-semibold">
            {targetWorkspace?.owner_id.slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink">Workspace owner</p>
            <MemberBadge name="You (admin)" role="admin" size="sm" />
          </div>
        </div>
        <div className="rounded-lg border border-dashed border-hairline p-3 text-center">
          <p className="text-xs text-ink-muted">
            Members list here. Invite members, set roles, and remove members.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MembersPanel;
