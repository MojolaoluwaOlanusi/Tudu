import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockIssueMutate = vi.fn();

vi.mock('../hooks/useLicense', () => ({
  useLicenseStatus: () => ({
    data: {
      mode: 'cloud',
      issuerConfigured: true,
      current: null,
      licenses: [],
    },
    isLoading: false,
  }),
  useIssueLicense: () => ({ mutate: mockIssueMutate, isPending: false }),
  useRevokeLicense: () => ({ mutate: vi.fn(), isPending: false }),
  useActivateLicense: () => ({ mutate: vi.fn(), isPending: false }),
  useDeactivateLicense: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('../store/uiStore', () => ({
  useUiStore: (selector: (s: { pushToast: () => void }) => unknown) =>
    selector({ pushToast: vi.fn() }),
}));

// FeatureGate would hide the issuer form for free-tier users. For this
// test we want to prove the issuer form calls issue.mutate; the gate itself
// is exercised by the existing useAnalytics / team analytics tests.
vi.mock('../components/common/FeatureGate', () => ({
  default: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

import LicenseSettings from '../routes/LicenseSettings';

describe('LicenseSettings — issuer view (cloud mode)', () => {
  beforeEach(() => {
    mockIssueMutate.mockReset();
  });

  it('renders the Self-hosting heading and the issuer form on cloud mode', () => {
    render(<LicenseSettings />);
    expect(
      screen.getByRole('heading', { name: /self-hosting/i, level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/server fingerprint/i)).toBeInTheDocument();
  });

  it('calls issue.mutate with the fingerprint when Generate license is clicked', async () => {
    render(<LicenseSettings />);
    const fp = 'a'.repeat(64);
    fireEvent.change(screen.getByLabelText(/server fingerprint/i), {
      target: { value: fp },
    });
    fireEvent.click(screen.getByRole('button', { name: /generate license/i }));

    await waitFor(() => {
      expect(mockIssueMutate).toHaveBeenCalledTimes(1);
    });
    const [vars] = mockIssueMutate.mock.calls[0];
    expect(vars).toEqual({ fingerprint: fp, note: undefined });
  });
});