import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBoards } from '../../hooks/useBoards';
import { useBoardStore } from '../../store/boardStore';
import type { Board } from '../../types/board';

interface SidebarBoardListProps {
  collapsed: boolean;
}

/**
 * The user's boards, grouped Personal first then by workspace, with the
 * active board highlighted. Clicking a board sets it active and navigates
 * to /board (which is the only view that filters by board today — the list
 * view shows all of the user's tasks).
 */
const SidebarBoardList: React.FC<SidebarBoardListProps> = ({ collapsed }) => {
  const { data: boards = [] } = useBoards();
  const activeId = useBoardStore((s) => s.activeBoardId);
  const setActive = useBoardStore((s) => s.setActiveBoard);
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const personal: Board[] = [];
    const byWorkspace = new Map<string, { name: string; boards: Board[] }>();
    boards.forEach((board) => {
      if (!board.workspace_id) {
        personal.push(board);
        return;
      }
      const group = byWorkspace.get(board.workspace_id) ?? {
        name: board.workspace_name ?? 'Team',
        boards: [],
      };
      group.boards.push(board);
      byWorkspace.set(board.workspace_id, group);
    });
    return { personal, workspaces: Array.from(byWorkspace.values()) };
  }, [boards]);

  const pick = (id: string) => {
    setActive(id);
    navigate('/board');
  };

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 px-2 py-2">
        {boards.slice(0, 6).map((b) => (
          <button
            key={b.id}
            type="button"
            title={b.name}
            aria-label={b.name}
            onClick={() => pick(b.id)}
            className={
              'flex h-8 w-8 items-center justify-center rounded-md text-[10px] font-semibold transition-colors ' +
              (b.id === activeId
                ? 'bg-brand text-ink-inverse'
                : 'text-ink-muted hover:bg-subtle hover:text-ink')
            }
          >
            {b.name.charAt(0).toUpperCase()}
          </button>
        ))}
      </div>
    );
  }

  const row = (b: Board) => {
    const active = b.id === activeId;
    return (
      <li key={b.id}>
        <button
          type="button"
          onClick={() => pick(b.id)}
          className={
            'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ' +
            (active
              ? 'bg-brand-subtle font-medium text-brand'
              : 'text-ink-muted hover:bg-subtle hover:text-ink')
          }
        >
          <span
            className={
              'h-1.5 w-1.5 shrink-0 rounded-full ' +
              (active ? 'bg-brand' : 'bg-ink-faint')
            }
          />
          <span className="truncate">{b.name}</span>
        </button>
      </li>
    );
  };

  return (
    <div className="space-y-3 px-2 pb-2 pt-1">
      {groups.personal.length > 0 && (
        <div>
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            Personal
          </p>
          <ul>{groups.personal.map(row)}</ul>
        </div>
      )}
      {groups.workspaces.map((group, i) => (
        <div key={i}>
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
            {group.name}
          </p>
          <ul>{group.boards.map(row)}</ul>
        </div>
      ))}
    </div>
  );
};

export default SidebarBoardList;
