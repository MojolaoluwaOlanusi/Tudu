import React, { useMemo, useState } from 'react';
import { useActiveBoardId, useBoards } from '../../hooks/useBoards';
import { useBoardStore } from '../../store/boardStore';
import BoardsModal from '../kanban/BoardsModal';
import TeamModal from '../workspace/TeamModal';
import type { Board } from '../../types/board';

/**
 * The board bar: pick which board you are working on, create / rename / delete
 * boards, and manage your team.
 *
 * It sits at the top of the List and Board pages rather than in the header. The
 * header already holds the logo, the four tabs and the account controls, and
 * three more controls there made it overflow on desktop and wrap on phones.
 *
 * Personal boards come first; each workspace's boards are grouped under its name.
 */
const BoardSelector: React.FC = () => {
  const { data: boards } = useBoards();
  const activeBoardId = useActiveBoardId();
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const [managing, setManaging] = useState(false);
  const [teamOpen, setTeamOpen] = useState(false);

  const groups = useMemo(() => {
    const personal: Board[] = [];
    const byWorkspace = new Map<string, { name: string; boards: Board[] }>();
    (boards ?? []).forEach((board) => {
      if (!board.workspace_id) {
        personal.push(board);
        return;
      }
      const group: { name: string; boards: Board[] } = byWorkspace.get(board.workspace_id) ?? {
        name: board.workspace_name ?? 'Team',
        boards: [],
      };
      group.boards.push(board);
      byWorkspace.set(board.workspace_id, group);
    });
    return { personal, workspaces: Array.from(byWorkspace.entries()) };
  }, [boards]);

  if (!boards || boards.length === 0) return null;

  const buttonClass =
    'h-10 shrink-0 whitespace-nowrap rounded-full border border-hairline bg-surface-2 px-4 text-xs font-semibold text-ink-muted transition-colors hover:border-accent hover:text-ink focus:outline-none focus-visible:border-accent';

  return (
    <div data-tour="board-selector" className="mb-4 flex flex-wrap items-center gap-2">
      <label
        htmlFor="board-select"
        className="hidden text-xs font-semibold uppercase tracking-wide text-ink-muted sm:block"
      >
        Board
      </label>
      <select
        id="board-select"
        value={activeBoardId ?? ''}
        onChange={(event) => setActiveBoard(event.target.value)}
        className="h-10 min-w-[8rem] max-w-full flex-1 truncate rounded-full border border-hairline bg-surface-2 px-4 text-sm font-semibold text-ink transition-colors hover:border-accent focus:border-accent focus:outline-none sm:w-64 sm:flex-none"
      >
        {groups.personal.length > 0 && (
          <optgroup label="Personal">
            {groups.personal.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </optgroup>
        )}
        {groups.workspaces.map(([workspaceId, group]) => (
          <optgroup key={workspaceId} label={group.name}>
            {group.boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setManaging(true)}
        aria-label="Manage boards"
        title="New, rename or delete boards"
        className={buttonClass}
      >
        + Boards
      </button>
      <button
        type="button"
        onClick={() => setTeamOpen(true)}
        aria-label="Team workspaces"
        title="Workspaces and members"
        className={buttonClass}
      >
        Team
      </button>
      {managing && <BoardsModal onClose={() => setManaging(false)} />}
      {teamOpen && <TeamModal onClose={() => setTeamOpen(false)} />}
    </div>
  );
};

export default BoardSelector;
