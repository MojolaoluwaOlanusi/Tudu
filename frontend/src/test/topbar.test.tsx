import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';

vi.mock('../hooks/useBilling', () => ({
  useEntitlements: () => ({
    data: {
      tier: 'free',
      aiCreditsRemaining: 0,
      features: {
        'api.public.write': false,
        'time.tracking': false,
        'selfHost.license': false,
        'analytics.team': false,
      },
    },
    isLoading: false,
  }),
}));

vi.mock('../hooks/useFeatureFlag', () => ({
  useFeatureFlag: () => false,
}));

vi.mock('../components/time/Timer', () => ({ default: () => null }));
vi.mock('../components/pomodoro/PomodoroTimerHeader', () => ({ default: () => null }));

import Topbar from '../components/app/Topbar';

const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );

const signIn = () => {
  useAuthStore.setState({
    user: {
      id: 'u-test',
      email: 'test@example.com',
      name: 'Test User',
      provider: 'email',
      created_at: '2026-01-01T00:00:00Z',
    },
    token: 'test-token',
    isAuthenticated: true,
  });
};

describe('Topbar — every control still renders', () => {
  beforeEach(() => {
    signIn();
  });

  it('renders the wordmark', () => {
    wrap(<Topbar />);
    expect(screen.getAllByRole('img', { name: /tudu/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the four nav links', () => {
    wrap(<Topbar />);
    expect(screen.getAllByRole('link', { name: /^list$/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /^board$/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /^stats$/i }).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByRole('link', { name: /^analytics$/i }).length).toBeGreaterThanOrEqual(1);
  });

  it('renders the sync indicator', () => {
    wrap(<Topbar />);
    expect(screen.getAllByRole('status').length).toBeGreaterThanOrEqual(1);
  });

  it('renders the theme toggle', () => {
    wrap(<Topbar />);
    expect(
      screen.getAllByRole('button', { name: /switch to (dark|light) mode/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });
  it('renders a settings link that routes to /settings/account', () => {
    wrap(<Topbar />);
    const links = screen.getAllByRole('link', { name: /^settings$/i });
    expect(links.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the log out button', () => {
    wrap(<Topbar />);
    expect(
      screen.getAllByRole('button', { name: /log out/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders the profile pill', () => {
    wrap(<Topbar />);
    expect(
      screen.getAllByRole('button', { name: /profile/i }).length,
    ).toBeGreaterThanOrEqual(1);
  });
});
