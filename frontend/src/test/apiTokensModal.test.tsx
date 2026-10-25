import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockTokens = [
  {
    id: 't1',
    label: 'Home Assistant',
    token_prefix: 'tudu_pat_abc',
    last_used_at: null,
    created_at: '2026-01-01T00:00:00Z',
  },
];

const mockCreateMutate = vi.fn();
const mockRevokeMutate = vi.fn();

vi.mock('../hooks/useApiTokens', () => ({
  useApiTokens: () => ({ data: mockTokens, isLoading: false }),
  useCreateApiToken: () => ({ mutate: mockCreateMutate, isPending: false }),
  useRevokeApiToken: () => ({ mutate: mockRevokeMutate, isPending: false }),
}));

vi.mock('../store/uiStore', () => ({
  useUiStore: (selector: (s: { pushToast: () => void }) => unknown) =>
    selector({ pushToast: vi.fn() }),
}));

import SettingsApi from '../pages/app/settings/SettingsApi';

describe('ApiTokensModal', () => {
  const originalConfirm = window.confirm;

  beforeEach(() => {
    mockCreateMutate.mockReset();
    mockRevokeMutate.mockReset();
    window.confirm = () => true;
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it('renders the existing tokens', () => {
    render(<SettingsApi />);
    expect(screen.getByText('Home Assistant')).toBeInTheDocument();
  });

  it('shows the plaintext exactly once on create and hides it after Done', async () => {
    mockCreateMutate.mockImplementation(
      (
        label: string,
        opts: { onSuccess: (created: unknown) => void }
      ) => {
        opts.onSuccess({
          id: 't2',
          label,
          token_prefix: 'tudu_pat_new',
          plaintext: 'tudu_pat_new_plaintext_shown_once',
          last_used_at: null,
          created_at: '2026-01-01T00:00:00Z',
        });
      }
    );
    render(<SettingsApi />);
    fireEvent.change(screen.getByLabelText(/token label/i), {
      target: { value: 'My new token' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create token/i }));

    await waitFor(() => {
      expect(
        screen.getByText('tudu_pat_new_plaintext_shown_once')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(
      screen.queryByText('tudu_pat_new_plaintext_shown_once')
    ).not.toBeInTheDocument();
  });

  it('calls revoke.mutate for the token after the confirm prompt is accepted', () => {
    render(<SettingsApi />);
    fireEvent.click(
      screen.getByRole('button', { name: /revoke home assistant/i })
    );
    expect(mockRevokeMutate).toHaveBeenCalledTimes(1);
    expect(mockRevokeMutate).toHaveBeenCalledWith('t1', expect.any(Object));
  });
});