// frontend/src/test/headerControls.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
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

vi.mock('../components/time/Timer', () => ({ default: () => null }));

import Header from '../components/layout/Header';

const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
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

describe('Header — every existing control still renders', () => {
  beforeEach(() => {
    signIn();
  });

  it('renders the wordmark', () => {
    wrap(<Header />);
    expect(screen.getByRole('img', { name: /tudu/i })).toBeInTheDocument();
  });

  it('renders the four nav links', () => {
    wrap(<Header />);
    expect(screen.getByRole('link', { name: /^list$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^board$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^stats$/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^analytics$/i })).toBeInTheDocument();
  });

  it('renders the sync indicator slot', () => {
    wrap(<Header />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders the theme toggle', () => {
    wrap(<Header />);
    expect(
      screen.getByRole('button', { name: /switch to (dark|light) mode/i })
    ).toBeInTheDocument();
  });

  it('renders the notification settings, API tokens, integrations and logout buttons', () => {
    wrap(<Header />);
    expect(
      screen.getByRole('button', { name: /notification settings/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /api tokens/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /integrations/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /logout/i })
    ).toBeInTheDocument();
  });

  it('renders the tour button', () => {
    wrap(<Header />);
    expect(screen.getByTestId('tour-button')).toBeInTheDocument();
  });

  it('renders the user pill on desktop layout', () => {
    wrap(<Header />);
    // The Step 8 restyle shortened the label from "Signed in as" to "Signed in"
    // (matching the mockup's Topbar). Assert the actual rendered text, and pin
    // the container by testid so a future copy tweak does not silently make
    // this test vacuous.
    const pill = screen.getByTestId('header-user-pill');
    expect(pill).toHaveTextContent('Signed in');
    expect(pill).toHaveTextContent('Test User');
  });
});