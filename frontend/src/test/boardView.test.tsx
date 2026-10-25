// src/test/boardView.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { BoardColumn as BoardColumnType } from '../types/board';
import type { Task } from '../types/task';

const MOCK_COLUMNS: BoardColumnType[] = [
  {
    id: 'c1', board_id: 'b1', name: 'To-do', stage: 'todo', color: 'gray',
    wip_limit: null, position: 0,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 'c2', board_id: 'b1', name: 'Doing', stage: 'doing', color: 'blue',
    wip_limit: 3, position: 1,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  },
];

const MOCK_TASKS: Task[] = [
  { id: 't1', user_id: 'u1', title: 'First card', status: 'todo', column_id: 'c1',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 't2', user_id: 'u1', title: 'Second card', status: 'doing', column_id: 'c2',
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
];

vi.mock('../hooks/useKanban', () => ({
  useKanbanTasks: () => ({
    data: MOCK_TASKS, isLoading: false, isError: false, error: null, refetch: vi.fn(),
  }),
  useMoveTasks: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useBoards', () => ({
  // AssigneeChip calls useBoards() directly; return an empty list so its
  // `board?.find(...)` short-circuits and it renders nothing.
  useBoards: () => ({ data: [] }),
  useActiveBoardId: () => 'b1',
  useBoardColumns: () => ({ data: MOCK_COLUMNS }),
  useCreateColumn: () => ({ mutate: vi.fn(), isPending: false }),
  useReorderColumns: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useWorkspaces', () => ({
  useWorkspaceMembers: () => ({ data: [] }),
  useAssignTask: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../store/uiStore', () => {
  const noop = vi.fn();
  return {
    useUiStore: (selector: (s: Record<string, unknown>) => unknown) =>
      selector({ openTaskForm: noop, openDetail: noop, pushToast: noop }),
  };
});

vi.mock('../components/common/ConfettiProvider', () => ({
  useConfetti: () => ({ burst: vi.fn(), celebrate: vi.fn() }),
}));

vi.mock('../lib/offlineQueue', () => ({
  isNetworkError: () => false,
  shouldShowQueuedToast: () => false,
}));

import BoardView from '../components/kanban/BoardView';

describe('BoardView — smoke', () => {
  it('renders the board heading and one card per task', () => {
    render(<BoardView />);
    expect(screen.getByRole('heading', { name: /^board$/i })).toBeInTheDocument();
    expect(screen.getByText('First card')).toBeInTheDocument();
    expect(screen.getByText('Second card')).toBeInTheDocument();
  });

  it('renders one column per board column with the WIP hint', () => {
    render(<BoardView />);
    expect(screen.getByText(/to-do/i)).toBeInTheDocument();
    expect(screen.getByText(/^doing$/i)).toBeInTheDocument();
    // c2 has wip_limit 3, one card → "1/3"
    expect(screen.getByText('1/3')).toBeInTheDocument();
  });
});