import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom'
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import UpgradePrompt from '../components/common/UpgradePrompt';

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('UpgradePrompt', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  it('renders the title, description and CTA', () => {
    wrap(
      <UpgradePrompt
        title="Deeper AI breakdown"
        description="12 sub-tasks instead of 6."
      />
    );
    expect(screen.getByText(/deeper ai breakdown/i)).toBeInTheDocument();
    expect(screen.getByText(/12 sub-tasks instead of 6/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /see plans/i })
    ).toBeInTheDocument();
  });

  it('navigates to /pricing by default on CTA click', () => {
    wrap(<UpgradePrompt title="Team analytics" />);
    fireEvent.click(screen.getByRole('button', { name: /see plans/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/pricing');
  });

  it('honours the upgradePath prop', () => {
    wrap(
      <UpgradePrompt
        title="License"
        upgradePath="/settings/license"
        ctaLabel="Install license"
      />
    );
    fireEvent.click(screen.getByRole('button', { name: /install license/i }));
    expect(mockNavigate).toHaveBeenCalledWith('/settings/license');
  });
});