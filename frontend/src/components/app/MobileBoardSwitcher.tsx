import React from 'react';
import { useActiveBoardId, useBoards } from '../../hooks/useBoards';
import { useBoardStore } from '../../store/boardStore';

/**
 * Compact board switcher for the mobile topbar.
 *
 * The full Sidebar (which contains SidebarBoardList) is `hidden … lg:flex`,
 * so on a phone there was no way to switch between boards at all. This
 * renders a small <select> in the mobile topbar row, only when the user
 * has more than one board — a single-board user does not need it.
 */
const MobileBoardSwitcher: React.FC = () => {
  const { data: boards = [] } = useBoards();
  const activeBoardId = useActiveBoardId();
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);

  if (boards.length <= 1) return null;

  return (
    <select
      value={activeBoardId ?? ''}
      onChange={(e) => setActiveBoard(e.target.value || null)}
      aria-label="Switch board"
      className="min-w-0 max-w-[10rem] shrink truncate rounded-md border border-line bg-surface px-2 py-1 text-[12px] font-medium text-ink focus:outline-none focus-visible:border-brand"
    >
      {boards.map((b) => (
        <option key={b.id} value={b.id}>
          {b.workspace_name ? `${b.workspace_name} · ` : ''}
          {b.name}
        </option>
      ))}
    </select>
  );
};

export default MobileBoardSwitcher;