import React from 'react';
import { useActiveWorkspaceId, useWorkspaces } from '../../hooks/useBoards';
import { useWorkspaceStore } from '../../store/workspaceStore';

const WorkspaceSwitcher: React.FC = () => {
  const { data: workspaces, isLoading } = useWorkspaces();
  const activeWorkspaceId = useActiveWorkspaceId();
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace);

  if (isLoading || !workspaces || workspaces.length < 2) return null;

  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className="sr-only">Workspace</span>
      <select
        data-tour="workspace-selector"
        value={activeWorkspaceId ?? ''}
        onChange={(event) => setActiveWorkspace(event.target.value)}
        className="max-w-[9rem] truncate rounded-full border border-hairline bg-surface-2 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent focus:border-accent focus:outline-none sm:max-w-[11rem] sm:text-sm"
      >
        {workspaces.map((ws) => (
          <option key={ws.id} value={ws.id}>
            {ws.name}
            {ws.member_count ? ` · ${ws.member_count} member${ws.member_count > 1 ? 's' : ''}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
};

export default WorkspaceSwitcher;
