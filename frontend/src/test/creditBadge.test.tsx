import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockUseEntitlements = vi.fn();

vi.mock('../hooks/useBilling', () => ({
  useEntitlements: () => mockUseEntitlements(),
}));

import CreditBadge from '../components/ai/CreditBadge';

const wrap = () => render(<MemoryRouter><CreditBadge /></MemoryRouter>);

describe('CreditBadge', () => {
  beforeEach(() => {
    mockUseEntitlements.mockReset();
  });

  it('renders nothing for a free-tier user', () => {
    mockUseEntitlements.mockReturnValue({
      data: { tier: 'free', aiCreditsRemaining: 0, features: {} },
      isLoading: false,
    });
    wrap();
    expect(screen.queryByText(/credit/i)).toBeNull();
  });

  it('shows the remaining credits for a pro user', () => {
    mockUseEntitlements.mockReturnValue({
      data: { tier: 'pro', aiCreditsRemaining: 42, features: {} },
      isLoading: false,
    });
    wrap();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText(/credits remaining/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /buy more/i })).toBeInTheDocument();
  });
});