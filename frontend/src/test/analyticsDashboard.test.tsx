import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';


vi.mock('../hooks/useAnalytics', () => ({
  useAnalyticsOverview: () => ({
    data: {
      tasks: { total: 10, todo: 5, doing: 2, done: 3, overdue: 0 },
      completionRate: 30,
      byPriority: { high: 1, medium: 2, low: 3, none: 4 },
      byCategory: { work: 5, personal: 3, study: 2, none: 0 },
      focus: { minutes: 100, sessions: 4 },
    },
    isLoading: false,
    isError: false,
  }),
  useCompletedTasks: () => ({
    data: {
      range: 'week',
      granularity: 'day',
      total: 3,
      previousTotal: 2,
      changePercent: 50,
      buckets: [{ key: '2026-10-20', label: 'Mon', count: 3 }],
      bestBucket: { key: '2026-10-20', label: 'Mon', count: 3 },
    },
    isLoading: false,
    isError: false,
  }),
  useTimeSpent: () => ({
    data: {
      totalMinutes: 100,
      totalSessions: 4,
      byCategory: [],
      byTask: [],
    },
    isLoading: false,
    isError: false,
  }),
  useTeamAnalytics: () => ({
    data: null,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({
    data: [{ id: 'ws-1', name: 'Team A' }],
    isLoading: false,
  }),
}));

const mockUseFeatureFlag = vi.fn();

vi.mock('../hooks/useFeatureFlag', () => ({
  useFeatureFlag: (feature: string) => mockUseFeatureFlag(feature),
}));

// Isolate the gating test from TeamAnalyticsView's own dependencies.
vi.mock('../components/analytics/TeamAnalyticsView', () => ({
  default: () => <div data-testid="team-analytics-view" />,
}));

import AnalyticsDashboard from '../components/analytics/AnalyticsDashboard';

const wrap = () =>
  render(
    <MemoryRouter>
      <AnalyticsDashboard />
    </MemoryRouter>
  );

describe('AnalyticsDashboard — team analytics gate', () => {
  beforeEach(() => {
    mockUseFeatureFlag.mockReset();
  });

  it('hides TeamAnalyticsView for free tier and shows the upgrade prompt', () => {
    mockUseFeatureFlag.mockReturnValue(false);
    wrap();
    // Switch to the Team scope.
    fireEvent.click(screen.getByRole('button', { name: 'Team' }));
    // TeamAnalyticsView must not be mounted.
    expect(screen.queryByTestId('team-analytics-view')).toBeNull();
    // FeatureGate falls back to UpgradePrompt, which renders "See plans".
    expect(screen.getByRole('button', { name: /see plans/i })).toBeInTheDocument();
  });

  it('renders TeamAnalyticsView for pro tier', () => {
    mockUseFeatureFlag.mockReturnValue(true);
    wrap();
    fireEvent.click(screen.getByRole('button', { name: 'Team' }));
    expect(screen.getByTestId('team-analytics-view')).toBeInTheDocument();
  });
});
