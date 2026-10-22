import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamAnalyticsView from '../components/analytics/TeamAnalyticsView';

vi.mock('../hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({ data: [{ id: 'ws-1', name: 'Team A' }], isLoading: false }),
}));

vi.mock('../hooks/useAnalytics', () => ({
  useTeamAnalytics: () => ({
    data: {
      workspace: { id: 'ws-1', name: 'Team A', role: 'admin' },
      range: 'week',
      overview: {
        tasks: { total: 3, todo: 1, doing: 0, done: 2, overdue: 0 },
        completionRate: 67,
        boards: [{ id: 'b1', name: 'General', total: 3, done: 2 }],
      },
      byMember: [{ userId: 'u1', name: 'Alice', email: 'a@x.com', avatarUrl: null, role: 'admin', completed: 2, inProgress: 0, assigned: 0 }],
      burndown: [{ date: '2026-10-20', remaining: 3, completed: 0 }],
    },
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('react-chartjs-2', () => ({
  Bar: () => <div data-testid='bar-chart' />,
  Line: () => <div data-testid='line-chart' />,
}));

describe('TeamAnalyticsView', () => {
  it('renders the overview cards, leaderboard and charts', () => {
    render(<TeamAnalyticsView />);
    expect(screen.getByText('Total tasks')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
  });
});
