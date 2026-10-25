import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../hooks/useNotifications', () => ({
  useNotificationPreferences: () => ({ data: { reminders: false, celebrations: true, push: false, last_sent_at: null }, isLoading: false }),
  useUpdateNotifications: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../hooks/usePushNotifications', () => ({
  usePushNotifications: () => ({ support: 'unsupported', loading: false, serverConfigured: false, enable: vi.fn(), disable: vi.fn() }),
}));

vi.mock('../hooks/useApiTokens', () => ({
  useApiTokens: () => ({ data: [], isLoading: false }),
  useCreateApiToken: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokeApiToken: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../store/uiStore', () => ({
  useUiStore: (selector: (s: Record<string, unknown>) => unknown) => selector({ pushToast: vi.fn() }),
}));

import SettingsAccount from '../pages/app/settings/SettingsAccount';
import SettingsNotifications from '../pages/app/settings/SettingsNotifications';
import SettingsAppearance from '../pages/app/settings/SettingsAppearance';
import { useAuthStore } from '../store/authStore';

const wrap = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

describe('settings pages — smoke', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', email: 'test@example.com', name: 'Test User', provider: 'email', created_at: '2026-01-01T00:00:00Z' },
      token: 'tok',
      isAuthenticated: true,
    });
  });

  it('SettingsAccount renders profile and sign out', () => {
    wrap(<SettingsAccount />);
    expect(screen.getByRole('heading', { name: /account/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
  });

  it('SettingsNotifications renders the toggles', () => {
    wrap(<SettingsNotifications />);
    expect(screen.getByRole('heading', { name: /notifications/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/daily due-date reminders/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/celebrations/i)).toBeInTheDocument();
  });

  it('SettingsAppearance renders theme and density controls', () => {
    wrap(<SettingsAppearance />);
    expect(screen.getByRole('heading', { name: /appearance/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^light$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^dark$/i })).toBeInTheDocument();
  });
});
