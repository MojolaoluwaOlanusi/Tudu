/**
 * Regression net for the List view after the Step 9 restyle.
 *
 * Everything TaskList *reaches for* is mocked; the components it *renders*
 * — TaskCard, EmptyState, BulkActionBar, FilterDropdown — are the real ones.
 * That is the point: this file proves the new EmptyState wiring and the
 * pre-existing bulk-select wiring both still function.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const MOCK_TASK = {
  id: 't1',
  user_id: 'u1',
  title: 'Ship the pricing page',
  description: null,
  status: 'todo' as const,
  priority: null,
  category: null,
  due_date: null,
  subtask_count: 0,
  subtasks_completed: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const { useTasksMock } = vi.hoisted(() => ({ useTasksMock: vi.fn() }));

vi.mock('../hooks/useTasks', () => ({
  useTasks: useTasksMock,
  useOverdueTasks: () => ({ data: [] }),
  useCreateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteTask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBatchDeleteTasks: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useBatchAssignTasks: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useSharing', () => ({
  useMyShares: () => ({ data: { pages: [] } }),
  flattenShares: () => [],
}));

vi.mock('../hooks/useUserPreferencesSync', () => ({
  useUserPreferencesSync: () => undefined,
}));

vi.mock('../hooks/useBoards', () => ({
  useActiveBoardId: () => 'b1',
}));

vi.mock('../hooks/usePomodoro', () => ({
  useCompletePomodoro: () => ({ mutate: vi.fn() }),
  useStartPomodoro: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => false,
}));

vi.mock('../hooks/useActivity', () => ({
  useTaskActivity: () => ({ data: [] }),
}));

vi.mock('../hooks/useSubtasks', () => ({
  useSubtasks: () => ({ data: [] }),
  useCreateSubtask: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateSubtask: () => ({ mutate: vi.fn() }),
  useDeleteSubtask: () => ({ mutate: vi.fn() }),
}));

import TaskList from '../components/tasks/TaskList';
import { useFilterStore } from '../store/filterStore';

const wrap = () =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <TaskList />
      </MemoryRouter>
    </QueryClientProvider>
  );

const resetFilters = () =>
  useFilterStore.setState({
    search: '',
    status: undefined,
    category: undefined,
    priority: undefined,
    sort: 'created_at',
    order: 'desc',
  });

describe('TaskList — Step 9 restyle regression net', () => {
  beforeEach(() => {
    resetFilters();
    useTasksMock.mockReturnValue({
      data: [MOCK_TASK],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('renders one TaskCard for each task from the query', () => {
    wrap();
    expect(screen.getByText('Ship the pricing page')).toBeInTheDocument();
  });

  it('renders the empty-state card when the query returns no tasks', () => {
    useTasksMock.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    wrap();
    expect(
      screen.getByRole('heading', { name: /no tasks yet/i })
    ).toBeInTheDocument();
  });

  it('renders the filtered variant when filters are active and no task matches', () => {
    useTasksMock.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    useFilterStore.setState({ search: 'nothing-matches-this' });
    wrap();
    expect(
      screen.getByRole('heading', { name: /nothing matches/i })
    ).toBeInTheDocument();
  });

  it('toggles select mode and shows the bulk action bar when a row is picked', async () => {
    wrap();
    fireEvent.click(screen.getByRole('button', { name: /^select$/i }));
    const row = screen.getByRole('checkbox');
    fireEvent.click(row);
    await waitFor(() => {
      expect(screen.getByText(/1 selected/i)).toBeInTheDocument();
    });
  });
});