import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BrushButton from '../components/ui/BrushButton';

describe('BrushButton', () => {
  it('renders a primary button with the brush stroke by default', () => {
    render(<BrushButton>Hello</BrushButton>);
    const btn = screen.getByRole('button', { name: 'Hello' });
    expect(btn).toHaveClass('bg-brand');
    expect(btn).toHaveClass('brush-stroke');
  });

  it('renders the ghost variant without the brush stroke', () => {
    render(<BrushButton variant="ghost">Ghost</BrushButton>);
    const btn = screen.getByRole('button', { name: 'Ghost' });
    expect(btn).not.toHaveClass('bg-brand');
    expect(btn).not.toHaveClass('brush-stroke');
  });

  it('uses text-xs for size="sm" and text-sm for size="md"', () => {
    const { rerender } = render(<BrushButton size="sm">Small</BrushButton>);
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('text-xs');

    rerender(<BrushButton size="md">Small</BrushButton>);
    expect(screen.getByRole('button', { name: 'Small' })).toHaveClass('text-sm');
  });

  it('defaults to type="button" so it cannot accidentally submit a form', () => {
    render(<BrushButton>Default</BrushButton>);
    expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute(
      'type',
      'button',
    );
  });

  it('forwards the click handler', async () => {
    const onClick = vi.fn();
    render(<BrushButton onClick={onClick}>Click</BrushButton>);
    await userEvent.click(screen.getByRole('button', { name: 'Click' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('lets className override the size padding', () => {
    render(<BrushButton className="px-10">Override</BrushButton>);
    const btn = screen.getByRole('button', { name: 'Override' });
    expect(btn).toHaveClass('px-10');
    expect(btn).not.toHaveClass('px-4');
  });

  it('allows type="submit" when the caller wants form submission', () => {
    render(<BrushButton type="submit">Submit</BrushButton>);
    expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute(
      'type',
      'submit',
    );
  });
});