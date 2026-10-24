import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MegaMenu from '../components/landing/MegaMenu';
import { MENUS } from '../components/landing/menu-data';

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('MegaMenu', () => {
  it('renders nothing while closed', () => {
    wrap(<MegaMenu menu={MENUS.product} isOpen={false} onClose={() => {}} />);
    expect(screen.queryByText(/Boards & Kanban/)).toBeNull();
  });

  it('renders all column headings and items when open', () => {
    wrap(<MegaMenu menu={MENUS.product} isOpen onClose={() => {}} />);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Focus')).toBeInTheDocument();
    expect(screen.getByText('AI magic')).toBeInTheDocument();
    expect(screen.getByText('Boards & Kanban')).toBeInTheDocument();
    expect(screen.getByText('AI breakdown')).toBeInTheDocument();
  });

  it('renders the footer link when defined', () => {
    wrap(<MegaMenu menu={MENUS.product} isOpen onClose={() => {}} />);
    expect(screen.getByText('Try the live demo')).toBeInTheDocument();
  });

  it('marks coming-soon items', () => {
    wrap(<MegaMenu menu={MENUS.solutions} isOpen onClose={() => {}} />);
    expect(screen.getByText('Soon')).toBeInTheDocument();
  });

  it('calls onClose when a link is clicked', () => {
    const onClose = vi.fn();
    wrap(<MegaMenu menu={MENUS.product} isOpen onClose={onClose} />);
    fireEvent.click(screen.getByText('Boards & Kanban'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render a footer when the menu does not define one', () => {
    wrap(<MegaMenu menu={MENUS.solutions} isOpen onClose={() => {}} />);
    expect(screen.queryByText('Try the live demo')).toBeNull();
  });
});