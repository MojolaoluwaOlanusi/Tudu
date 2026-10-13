import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WizardRoot from '../components/onboarding/WizardRoot';

// The wizard reads useBoards and useAuthStore; both are stubbed so the
// component is exercised in isolation.
const mockBoards = vi.fn();
vi.mock('../hooks/useBoards', () => ({
  useBoards: () => mockBoards(),
}));
vi.mock('../store/authStore', () => ({
  useAuthStore: (selector: (s: { token: string | null }) => unknown) =>
    selector({ token: 'fake-token' }),
}));
vi.mock('../hooks/useOnboarding', () => ({
  useSeedBoard: () => ({ isPending: false, mutate: vi.fn() }),
}));
vi.mock('../store/uiStore', () => ({
  useUiStore: (selector: (s: { pushToast: () => void }) => unknown) =>
    selector({ pushToast: vi.fn() }),
}));

const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe('onboarding wizard', () => {
  beforeEach(() => {
    window.localStorage.clear();
    mockBoards.mockReset();
  });

  it('shows when the user has a single empty board', () => {
    mockBoards.mockReturnValue({ data: [{ id: 'b1', task_count: 0 }], isLoading: false });
    wrap(<WizardRoot />);
    expect(screen.getByText(/Welcome to Tudu/i)).toBeInTheDocument();
  });

  it('is hidden when the board has cards', () => {
    mockBoards.mockReturnValue({ data: [{ id: 'b1', task_count: 4 }], isLoading: false });
    wrap(<WizardRoot />);
    expect(screen.queryByText(/Welcome to Tudu/i)).toBeNull();
  });

  it('is hidden once the browser has flagged it as completed', () => {
    window.localStorage.setItem('tudu.onboarding.wizard.v1', 'true');
    mockBoards.mockReturnValue({ data: [{ id: 'b1', task_count: 0 }], isLoading: false });
    wrap(<WizardRoot />);
    expect(screen.queryByText(/Welcome to Tudu/i)).toBeNull();
  });

  it('"Set up later" flags the wizard as completed', async () => {
    mockBoards.mockReturnValue({ data: [{ id: 'b1', task_count: 0 }], isLoading: false });
    wrap(<WizardRoot />);
    fireEvent.click(screen.getByRole('button', { name: /Set up later/i }));
    await waitFor(() => {
      expect(window.localStorage.getItem('tudu.onboarding.wizard.v1')).toBe('true');
    });
  });
});
