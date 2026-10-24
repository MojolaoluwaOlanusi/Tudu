import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Hero from '../components/landing/Hero';

describe('Hero', () => {
  it('renders the mockup headline, sub-copy, and both CTAs', () => {
    render(<Hero onTryDemo={vi.fn()} onStartFree={vi.fn()} />);
    expect(
      screen.getByRole('heading', {
        name: /Where simple boards become\s+serious work/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Start for free/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /See live demo/i })).toBeInTheDocument();
  });

  it('fires onStartFree when the primary CTA is clicked', () => {
    const onStartFree = vi.fn();
    render(<Hero onTryDemo={vi.fn()} onStartFree={onStartFree} />);
    fireEvent.click(screen.getByRole('button', { name: /Start for free/i }));
    expect(onStartFree).toHaveBeenCalledTimes(1);
  });

  it('fires onTryDemo when the demo CTA is clicked', () => {
    const onTryDemo = vi.fn();
    render(<Hero onTryDemo={onTryDemo} onStartFree={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /See live demo/i }));
    expect(onTryDemo).toHaveBeenCalledTimes(1);
  });

  it('disables the demo CTA while starting and shows the loading label', () => {
    render(<Hero onTryDemo={vi.fn()} onStartFree={vi.fn()} starting />);
    const btn = screen.getByRole('button', { name: /Setting up your board/i });
    expect(btn).toBeDisabled();
  });
});