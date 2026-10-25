import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useActiveBoardId, useBoards } from '../../hooks/useBoards';
import { useBoardStore } from '../../store/boardStore';
import BoardsModal from '../kanban/BoardsModal';
import type { Board } from '../../types/board';

/**
 * The board bar: pick which board you are working on, create / rename /
 * delete boards, and manage your team.
 *
 * Step 8 restyles the flat <select> into a grouped list that mirrors the
 * mockup's board-list look: a compact pill showing the active board, plus
 * a dropdown grouped by Personal / workspace, with a brand-green active
 * indicator. The underlying mechanics are unchanged:
 *   - `useBoards()` fetches the list
 *   - `useActiveBoardId()` reads the current selection
 *   - `setActiveBoard(id)` switches boards
 *   - BoardsModal / TeamModal open on the two buttons
 *
 * Behaviour preserved: same query, same store, same modals, same grouping
 * rules (personal first, workspaces grouped by `workspace_id`).
 */
const BoardSelector: React.FC = () => {
  const { data: boards } = useBoards();
  const activeBoardId = useActiveBoardId();
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const [managing, setManaging] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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

  const activeBoard = useMemo(
    () => (boards ?? []).find((b) => b.id === activeBoardId) ?? null,
    [boards, activeBoardId],
  );

  if (!boards || boards.length === 0) return null;

  const buttonClass =
    'h-9 shrink-0 whitespace-nowrap rounded-md border border-line bg-surface px-3 text-[12px] font-semibold text-ink-muted transition-colors hover:bg-raised hover:text-ink focus:outline-none focus-visible:border-brand';

  const pickBoard = (id: string) => {
    setActiveBoard(id);
    setMenuOpen(false);
  };

  return (
    <div data-tour="board-selector" className="relative mb-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={menuOpen}
        data-testid="board-selector-trigger"
        className="inline-flex h-9 min-w-[10rem] max-w-full items-center gap-2 truncate rounded-md border border-line bg-surface px-3 text-[13px] font-semibold text-ink transition-colors hover:border-line-strong focus:outline-none focus-visible:border-brand"
      >
        <span className="flex h-2 w-2 shrink-0 items-center justify-center rounded-full bg-brand" />
        <span className="min-w-0 flex-1 truncate text-left">
          {activeBoard?.name ?? 'Select board'}
        </span>
        <svg className="h-3 w-3 shrink-0 text-ink-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={() => setManaging(true)}
        aria-label="Manage boards"
        title="New, rename or delete boards"
        className={buttonClass}
      >
        + Boards
      </button>
      <Link
        to="/settings/workspace"
        aria-label="Team workspaces"
        title="Workspaces and members"
        className={buttonClass}
      >
        Team
      </Link>

      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="listbox"
            aria-label="Choose a board"
            className="absolute left-0 top-full z-40 mt-2 w-72 overflow-hidden rounded-lg border border-line bg-surface shadow-2xl"
          >
            {groups.personal.length > 0 && (
              <div className="p-2">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  Personal
                </p>
                <ul>
                  {groups.personal.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={b.id === activeBoardId}
                        onClick={() => pickBoard(b.id)}
                        className={
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ' +
                          (b.id === activeBoardId
                            ? 'bg-brand-subtle font-medium text-brand'
                            : 'text-ink-muted hover:bg-subtle hover:text-ink')
                        }
                      >
                        <span className={'h-1.5 w-1.5 shrink-0 rounded-full ' + (b.id === activeBoardId ? 'bg-brand' : 'bg-ink-faint')} />
                        <span className="truncate">{b.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {groups.workspaces.map(([workspaceId, group]) => (
              <div key={workspaceId} className="border-t border-line-subtle p-2">
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
                  {group.name}
                </p>
                <ul>
                  {group.boards.map((b) => (
                    <li key={b.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={b.id === activeBoardId}
                        onClick={() => pickBoard(b.id)}
                        className={
                          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ' +
                          (b.id === activeBoardId
                            ? 'bg-brand-subtle font-medium text-brand'
                            : 'text-ink-muted hover:bg-subtle hover:text-ink')
                        }
                      >
                        <span className={'h-1.5 w-1.5 shrink-0 rounded-full ' + (b.id === activeBoardId ? 'bg-brand' : 'bg-ink-faint')} />
                        <span className="truncate">{b.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      {managing && <BoardsModal onClose={() => setManaging(false)} />}
    </div>
  );
};

export default BoardSelector;