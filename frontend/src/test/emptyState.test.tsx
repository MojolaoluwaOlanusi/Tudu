import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import EmptyState from '../components/tasks/EmptyState';

describe('EmptyState', () => {
  it('renders the empty variant and fires onNew', () => {
    const onNew = vi.fn();
    render(<EmptyState variant="empty" onNew={onNew} />);
    expect(
      screen.getByRole('heading', { name: /no tasks yet/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /new task/i }));
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('renders the filtered variant and fires onClearFilters', () => {
    const onClearFilters = vi.fn();
    render(<EmptyState variant="filtered" onClearFilters={onClearFilters} />);
    expect(
      screen.getByRole('heading', { name: /nothing matches/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /clear filters/i }));
    expect(onClearFilters).toHaveBeenCalledTimes(1);
  });
});