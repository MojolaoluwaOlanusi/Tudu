import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ConfettiProvider, useConfetti } from '../components/common/ConfettiProvider';

/**
 * Regression coverage for the phase-17 confetti bug.
 *
 * The provider used to pass `handle.current` straight into the context value.
 * React renders a parent before its children assign refs, so that value was
 * always null and every consumer silently received the no-op fallback - no
 * burst could ever play, anywhere in the app.
 */
const Probe: React.FC = () => {
  const { burst } = useConfetti();
  return (
    <button onClick={() => burst()}>fire</button>
  );
};

const renderProbe = () =>
  render(
    <ConfettiProvider>
      <Probe />
    </ConfettiProvider>
  );

describe('ConfettiProvider', () => {
  it('hands a working burst to consumers', () => {
    renderProbe();
    const button = screen.getByRole('button', { name: 'fire' });

    // The failure mode was a silent no-op, so assert pieces actually appear.
    act(() => {
      button.click();
    });

    expect(document.querySelectorAll('.confetti-piece').length).toBeGreaterThan(0);
  });

  it('cleans pieces up so the DOM does not grow without bound', () => {
    vi.useFakeTimers();
    try {
      renderProbe();
      const button = screen.getByRole('button', { name: 'fire' });

      act(() => {
        button.click();
      });
      expect(document.querySelectorAll('.confetti-piece').length).toBeGreaterThan(0);

      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(document.querySelectorAll('.confetti-piece')).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not crash for a consumer rendered outside the provider', () => {
    const spy = vi.fn();
    const Orphan: React.FC = () => {
      const { burst } = useConfetti();
      return <button onClick={() => { burst(); spy(); }}>orphan</button>;
    };

    render(<Orphan />);
    const button = screen.getByRole('button', { name: 'orphan' });

    expect(() => button.click()).not.toThrow();
    expect(spy).toHaveBeenCalled();
  });
});