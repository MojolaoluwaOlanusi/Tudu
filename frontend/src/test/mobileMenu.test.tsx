import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MobileMenu from '../components/landing/MobileMenu';

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('MobileMenu', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders nothing while closed', () => {
    wrap(<MobileMenu open={false} onClose={() => {}} />);
    expect(screen.queryByRole('button', { name: /close menu/i })).toBeNull();
  });

  it('renders the top-level list when open', () => {
    wrap(<MobileMenu open onClose={() => {}} />);
    expect(screen.getByText('Product')).toBeInTheDocument();
    expect(screen.getByText('Solutions')).toBeInTheDocument();
    expect(screen.getByText('Developers')).toBeInTheDocument();
    expect(screen.getByText('Resources')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
  });

  it('expands and collapses a section on click', () => {
    wrap(<MobileMenu open onClose={() => {}} />);
    expect(screen.queryByText('Boards & Kanban')).toBeNull();
    fireEvent.click(screen.getByText('Product'));
    expect(screen.getByText('Boards & Kanban')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Product'));
    expect(screen.queryByText('Boards & Kanban')).toBeNull();
  });

  it('calls onClose when the close button is clicked', () => {
    let closed = 0;
    wrap(<MobileMenu open onClose={() => { closed += 1; }} />);
    fireEvent.click(screen.getByRole('button', { name: /close menu/i }));
    expect(closed).toBe(1);
  });

  it('locks body overflow while open and restores on close', () => {
    document.body.style.overflow = 'visible';
    const { rerender } = render(
      <MemoryRouter>
        <MobileMenu open onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <MemoryRouter>
        <MobileMenu open={false} onClose={() => {}} />
      </MemoryRouter>,
    );
    expect(document.body.style.overflow).toBe('visible');
  });
});