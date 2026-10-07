import { QueryClient, keepPreviousData } from '@tanstack/react-query';
import type { TaskFilters } from '../types/task';

/**
 * Centralised React Query cache keys.
 * Keeping them in one factory guarantees that invalidation and optimistic
 * updates always target the exact same keys as the queries that populate them.
 */
export const queryKeys = {
  auth: {
    me: (token: string) => ['auth', 'me', token] as const,
  },
  tasks: {
    all: ['tasks'] as const,
    list: (filters?: TaskFilters) => ['tasks', 'list', filters ?? {}] as const,
    detail: (id: string) => ['tasks', 'detail', id] as const,
    overdue: ['tasks', 'overdue'] as const,
    kanban: ['tasks', 'kanban'] as const,
  },
  ai: {
    status: ['ai', 'status'] as const,
  },
  activity: {
    all: ['activity'] as const,
  },
  pomodoro: {
    all: ['pomodoro'] as const,
    stats: (days: number) => ['pomodoro', 'stats', days] as const,
    active: ['pomodoro', 'active'] as const,
  },
  analytics: {
    all: ['analytics'] as const,
    overview: ['analytics', 'overview'] as const,
    completed: (range: string) => ['analytics', 'completed', range] as const,
    timeSpent: (range: string) => ['analytics', 'time-spent', range] as const,
  },
  subtasks: {
    all: ['subtasks'] as const,
    list: (taskId: string) => ['subtasks', 'list', taskId] as const,
  },
  boards: {
    all: ['boards'] as const,
    detail: (id: string) => ['boards', 'detail', id] as const,
    columns: (boardId: string) => ['boards', 'columns', boardId] as const,
  },
  shares: {
    all: ['shares'] as const,
    mine: ['shares', 'mine'] as const,
    withMe: ['shares', 'with-me'] as const,
    detail: (id: string) => ['shares', 'detail', id] as const,
  },
};

type HttpishError = { response?: { status?: number } };

/** Retry transient/server failures, but never retry client (4xx) errors. */
const shouldRetry = (failureCount: number, error: unknown): boolean => {
  const status = (error as HttpishError)?.response?.status;
  if (typeof status === 'number' && status >= 400 && status < 500) return false;
  return failureCount < 2;
};

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered fresh for 30s, which avoids a refetch storm when
      // the user switches between filters or navigates back and forth.
      staleTime: 30_000,
      // Keep unused queries in the cache for 5 minutes before garbage collecting.
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: shouldRetry,
      // Show the previous list while a new filter is loading (no spinner flash).
      placeholderData: keepPreviousData,
    },
    mutations: {
      retry: 0,
    },
  },
});
