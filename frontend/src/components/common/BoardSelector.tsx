import React from 'react';
import { useActiveBoardId, useBoards } from '../../hooks/useBoards';
import { useBoardStore } from '../../store/boardStore';

/**
 * Pick which board the Kanban shows.
 *
 * Deliberately hidden while the user only has one board: the header has just
 * been tuned to stop it wrapping on small screens, and a control that can only
 * ever show one option is pure noise. It appears the moment a second board
 * exists, and the column manager is where new boards are made.
 */
const BoardSelector: React.FC = () => {
  const { data: boards } = useBoards();
  const activeBoardId = useActiveBoardId();
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);

  if (!boards || boards.length < 2) return null;

  return (
    <label className="flex min-w-0 items-center gap-1.5">
      <span className="sr-only">Board</span>
      <select
        data-tour="board-selector"
        value={activeBoardId ?? ''}
        onChange={(event) => setActiveBoard(event.target.value)}
        className="max-w-[9rem] truncate rounded-full border border-hairline bg-surface-2 px-3 py-2 text-xs font-semibold text-ink transition-colors hover:border-accent focus:border-accent focus:outline-none sm:max-w-[11rem] sm:text-sm"
      >
        {boards.map((board) => (
          <option key={board.id} value={board.id}>
            {board.name}
          </option>
        ))}
      </select>
    </label>
  );
};

export default BoardSelector;
