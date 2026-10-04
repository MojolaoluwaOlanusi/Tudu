// Regression guard for "drag-and-drop fails after the first move".
//
// `['tasks', ...]` holds both list caches (arrays of Task) and per-task detail
// entries (a single Task). The optimistic move path rebuilds the overdue list
// from every task cache, and it must skip the non-array entries - otherwise the
// second drag in a session throws and the task snaps back with an error toast.
// The detail entry exists by then because the server echoes the first move back
// over the socket, which seeds it.
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { vi, describe, it, expect, afterEach } from 'vitest';
import { queryKeys } from '../lib/queryClient';
import { applyTaskUpsert } from '../lib/taskCache';
import { useMoveTasks } from '../hooks/useKanban';
import { useAuthStore } from '../store/authStore';
import { taskService } from '../services/taskService';
import type { Task } from '../types/task';

const task = (id: string, status: string): Task => ({
  id,
  user_id: 'u1',
  title: `Task ${id}`,
  status: status as Task['status'],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
});

describe('two consecutive Kanban moves', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('applies both moves instead of throwing on the second', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData<Task[]>(queryKeys.tasks.kanban, [
      task('a', 'todo'),
      task('b', 'todo'),
      task('c', 'todo'),
    ]);

    // The server echoes each move back over the socket, which seeds the
    // ['tasks','detail',id] entry holding a single Task object.
    applyTaskUpsert(qc, task('a', 'doing'));

    useAuthStore.setState({ token: 'test-token' } as never);

    const calls: Array<[string, string]> = [];
    vi.spyOn(taskService, 'updateTaskStatus').mockImplementation(
      async (_t: string, id: string, status: string) => {
        calls.push([id, status]);
        return task(id, status);
      }
    );

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children);

    const { result } = renderHook(() => useMoveTasks(), { wrapper });

    // First move.
    await act(async () => {
      result.current.mutate([{ id: 'b', status: 'doing' }]);
    });
    await waitFor(() =>
      expect(qc.getQueryData<Task[]>(queryKeys.tasks.kanban)?.find((t) => t.id === 'b')?.status)
        .toBe('doing')
    );

    // Second move, with the detail entry now present.
    await act(async () => {
      result.current.mutate([{ id: 'c', status: 'done' }]);
    });
    await waitFor(() =>
      expect(qc.getQueryData<Task[]>(queryKeys.tasks.kanban)?.find((t) => t.id === 'c')?.status)
        .toBe('done')
    );

    expect(calls).toEqual([
      ['b', 'doing'],
      ['c', 'done'],
    ]);
  });
});