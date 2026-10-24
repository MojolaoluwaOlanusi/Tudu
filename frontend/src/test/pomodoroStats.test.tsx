import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import PomodoroStats from '../components/pomodoro/PomodoroStats';

vi.mock('../hooks/usePomodoro', () => ({
  usePomodoroStats: () => ({
    data: {
      totals: { minutes: 500, sessions: 20, startedSessions: 25, abandoned: 5 },
      today: { minutes: 50, sessions: 2 },
      week: { minutes: 200, sessions: 8 },
      daily: [
        { date: '2026-10-20', minutes: 25, sessions: 1 },
        { date: '2026-10-21', minutes: 50, sessions: 2 },
        { date: '2026-10-22', minutes: 0, sessions: 0 },
        { date: '2026-10-23', minutes: 25, sessions: 1 },
        { date: '2026-10-24', minutes: 100, sessions: 4 },
        { date: '2026-10-25', minutes: 0, sessions: 0 },
        { date: '2026-10-26', minutes: 0, sessions: 0 },
      ],
      byTask: [],
      recent: [],
    },
    isLoading: false,
    isError: false,
  }),
}));

describe('PomodoroStats', () => {
  it('renders the four metric cards', () => {
    render(<PomodoroStats />);
    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('This week')).toBeInTheDocument();
    expect(screen.getByText('All time')).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
  });

  it('formats each metric value', () => {
    render(<PomodoroStats />);
    expect(screen.getByText('50m')).toBeInTheDocument();   // today: 50 minutes
    expect(screen.getByText('3h 20m')).toBeInTheDocument(); // week: 200 minutes
    expect(screen.getByText('8h 20m')).toBeInTheDocument(); // all time: 500 minutes
    expect(screen.getByText('25')).toBeInTheDocument();     // started: 25 sessions
  });

  it('renders the "Last 7 days" section heading', () => {
  render(<PomodoroStats />);
  expect(
    screen.getByRole('heading', { name: /last 7 days/i })
  ).toBeInTheDocument();
});
});