import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Users } from 'lucide-react';
import { useBoards } from '../../hooks/useBoards';
import { useBoardStore } from '../../store/boardStore';
import type { Board } from '../../types/board';

interface SidebarBoardListProps {
  collapsed: boolean;
}

/**
 * The user's boards, grouped Personal first then by workspace, with the
 * active board highlighted. Clicking a board sets it active and navigates
 * to /board. The collapsed list shows one icon per group (User for
 * Personal, Users for each workspace); clicking it navigates to that
 * group's first board.
 */
const SidebarBoardList: React.FC<SidebarBoardListProps> = ({ collapsed }) => {
  const { data: boards = [] } = useBoards();
  const activeId = useBoardStore((s) => s.activeBoardId);
  const setActive = useBoardStore((s) => s.setActiveBoard);
  const navigate = useNavigate();

  const groups = useMemo(() => {
    const personal: Board[] = [];
    const byWorkspace = new Map<string, { id: string; name: string; boards: Board[] }>();
    boards.forEach((board) => {
      if (!board.workspace_id) {
        personal.push(board);
        return;
      }
      const group = byWorkspace.get(board.workspace_id) ?? {
        id: board.workspace_id,
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
  // No navigate: List stays on `/` and filters to this board (see TaskList);
  // Board stays on `/board` and just switches the active column set.
};

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1 px-2 py-2">
        {groups.personal.length > 0 && (
          <button
            type="button"
            title="Personal"
            aria-label="Personal"
            onClick={() => pick(groups.personal[0].id)}
            className={
              'flex h-8 w-8 items-center justify-center rounded-md transition-colors ' +
              (groups.personal.some((b) => b.id === activeId)
                ? 'bg-brand text-ink-inverse'
                : 'text-ink-muted hover:bg-subtle hover:text-ink')
            }
          >
            <User className="h-4 w-4" />
          </button>
        )}
        {groups.workspaces.map((group) => (
          <button
            key={group.id}
            type="button"
            title={group.name}
            aria-label={group.name}
            onClick={() => pick(group.boards[0].id)}
            className={
              'flex h-8 w-8 items-center justify-center rounded-md transition-colors ' +
              (group.boards.some((b) => b.id === activeId)
                ? 'bg-brand text-ink-inverse'
                : 'text-ink-muted hover:bg-subtle hover:text-ink')
            }
          >
            <Users className="h-4 w-4" />
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
          <div className="mb-1 flex items-center gap-1.5 px-2 py-1">
            <User className="h-3 w-3 shrink-0 text-ink-faint" />
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              Personal
            </span>
          </div>
          <ul>{groups.personal.map(row)}</ul>
        </div>
      )}
      {groups.workspaces.map((group) => (
        <div key={group.id}>
          <div className="mb-1 flex items-center gap-1.5 px-2 py-1">
            <Users className="h-3 w-3 shrink-0 text-ink-faint" />
            <span className="truncate text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
              {group.name}
            </span>
          </div>
          <ul>{group.boards.map(row)}</ul>
        </div>
      ))}
    </div>
  );
};

export default SidebarBoardList;


