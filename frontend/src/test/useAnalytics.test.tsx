import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  useAnalyticsOverview,
  useCompletedTasks,
  useTimeSpent,
} from '../hooks/useAnalytics';
import { useAuthStore } from '../store/authStore';
import * as service from '../services/analyticsService';

vi.mock('../services/analyticsService', () => ({
  analyticsService: {
    overview: vi.fn(),
    completedTasks: vi.fn(),
    timeSpent: vi.fn(),
  },
}));

const mocked = service.analyticsService as unknown as Record<string, ReturnType<typeof vi.fn>>;

/** Fresh cache per test so one test's data can never satisfy the next. */
const wrapper = ({ children }: { children: React.ReactNode }) => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const overview = {
  tasks: { total: 5, todo: 2, doing: 1, done: 2, overdue: 1 },
  completionRate: 40,
  byPriority: { high: 1, medium: 1, low: 1, none: 2 },
  byCategory: { work: 2, personal: 1, study: 1, none: 1 },
  focus: { minutes: 125, sessions: 4 },
};

const completed = {
  range: 'week' as const,
  granularity: 'day' as const,
  total: 2,
  previousTotal: 1,
  changePercent: 100,
  buckets: [
    { key: '2026-10-01', label: 'Thu 1', count: 2 },
  ],
  bestBucket: { key: '2026-10-01', label: 'Thu 1', count: 2 },
};

const timeSpent = {
  totalMinutes: 125,
  totalSessions: 4,
  byCategory: [
    { category: 'work', label: 'Work', minutes: 75, sessions: 3, share: 60 },
    { category: 'personal', label: 'Personal', minutes: 50, sessions: 1, share: 40 },
  ],
  byTask: [],
};

beforeEach(() => {
  useAuthStore.setState({ token: 'test-token', user: null, isAuthenticated: true });
  mocked.overview.mockResolvedValue(overview);
  mocked.completedTasks.mockResolvedValue(completed);
  mocked.timeSpent.mockResolvedValue(timeSpent);
});

describe('useAnalyticsOverview', () => {
  it('fetches the overview once a token exists', async () => {
    const { result } = renderHook(() => useAnalyticsOverview(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(overview);
    expect(mocked.overview).toHaveBeenCalledTimes(1);
  });

  it('stays idle when there is no token', async () => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    const { result } = renderHook(() => useAnalyticsOverview(), { wrapper });

    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mocked.overview).not.toHaveBeenCalled();
  });

  it('surfaces an error rather than throwing', async () => {
    mocked.overview.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useAnalyticsOverview(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useCompletedTasks', () => {
  it.each(['week', 'month', 'quarter'] as const)('passes %s through', async (range) => {
    const { result } = renderHook(() => useCompletedTasks(range), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocked.completedTasks).toHaveBeenCalledWith('test-token', range);
  });

  it('keys the cache by range so switching filters refetches', async () => {
    const { result, rerender } = renderHook(
      ({ range }) => useCompletedTasks(range),
      { wrapper, initialProps: { range: 'week' as const } }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    rerender({ range: 'month' as never });

    await waitFor(() =>
      expect(mocked.completedTasks).toHaveBeenCalledWith('test-token', 'month')
    );
  });
});

describe('useTimeSpent', () => {
  it('returns category slices from the service', async () => {
    const { result } = renderHook(() => useTimeSpent('month'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.byCategory).toHaveLength(2);
    expect(mocked.timeSpent).toHaveBeenCalledWith('test-token', 'month');
  });

  it('does not call the service while signed out', async () => {
    useAuthStore.setState({ token: null, user: null, isAuthenticated: false });
    renderHook(() => useTimeSpent('month'), { wrapper });

    await waitFor(() => expect(mocked.timeSpent).not.toHaveBeenCalled());
  });
});