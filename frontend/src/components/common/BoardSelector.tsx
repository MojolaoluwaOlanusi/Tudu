import React, { useState } from 'react';
import { useActiveBoardId, useBoards } from '../../hooks/useBoards';
import { useBoardStore } from '../../store/boardStore';
import BoardsModal from '../kanban/BoardsModal';

/**
 * Pick which board the Kanban shows, and open the board manager.
 *
 * Always visible when the user is signed in: hiding it for single-board
 * accounts meant nobody ever discovered the control.
 */
const BoardSelector: React.FC = () => {
  const { data: boards } = useBoards();
  const activeBoardId = useActiveBoardId();
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const [managing, setManaging] = useState(false);

  if (!boards || boards.length === 0) return null;

  return (
    <>
      <label className="flex min-w-0 items-center gap-1.5">
        <span className="sr-only">Board</span>
        <select
          data-tour="board-selector"
          value={activeBoardId ?? ''}
          onChange={(event) => setActiveBoard(event.target.value)}
          className="max-w-[9rem] truncate rounded-full border border-hairline bg-surface-2 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent focus:border-accent focus:outline-none"
        >
          {boards.map((board) => (
            <option key={board.id} value={board.id}>
              {board.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => setManaging(true)}
        aria-label="Manage boards"
        title="New, rename or delete boards"
        className="rounded-full border border-hairline bg-surface-2 px-3 py-2 text-xs font-semibold text-ink-muted transition-colors hover:border-accent hover:text-ink"
      >
        + Boards
      </button>
      {managing && <BoardsModal onClose={() => setManaging(false)} />}
    </>
  );
};

export default BoardSelector;
