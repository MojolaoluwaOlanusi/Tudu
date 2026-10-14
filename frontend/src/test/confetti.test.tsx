import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock canvas-confetti before anything imports it. jsdom has no canvas
// implementation, so the real library throws on getContext and its
// animation loop then crashes on a null 2d context. Mocking lets the
// tests assert what our provider does - how many times it calls the
// library, with which options - rather than trying to observe pixels
// in an environment that cannot draw them.
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

import confetti from 'canvas-confetti';
import { ConfettiProvider, useConfetti } from '../components/common/ConfettiProvider';

const mockedConfetti = vi.mocked(confetti);

// A fresh QueryClient per render. A shared one would leak cached query
// state between tests and turn an unrelated failure into a flaky one.
const wrap = (ui: React.ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => {
  mockedConfetti.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

const Consumer = () => {
  const { burst, celebrate } = useConfetti();
  return (
    <div>
      <button onClick={burst}>burst</button>
      <button onClick={() => celebrate('task-complete')}>routine</button>
      <button onClick={() => celebrate('ten-tasks')}>mid</button>
      <button onClick={() => celebrate('hundred-tasks')}>big</button>
    </div>
  );
};

describe('ConfettiProvider', () => {
  it('hands a working burst to consumers', () => {
    wrap(
      <ConfettiProvider>
        <Consumer />
      </ConfettiProvider>
    );

    expect(screen.getByRole('button', { name: /^burst$/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^burst$/i }));
    expect(mockedConfetti).toHaveBeenCalledTimes(1);
  });

  it('fires a burst every time without leaking state between calls', () => {
    // The equivalent of the "does not grow without bound" check, expressed
    // against the mock: three clicks, three calls. No deduplication, no
    // throttling, no accumulator the provider forgets to reset.
    wrap(
      <ConfettiProvider>
        <Consumer />
      </ConfettiProvider>
    );

    const button = screen.getByRole('button', { name: /^burst$/i });
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    expect(mockedConfetti).toHaveBeenCalledTimes(3);
  });

  it('routine celebration matches the plain burst', () => {
    wrap(
      <ConfettiProvider>
        <Consumer />
      </ConfettiProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /^routine$/i }));
    expect(mockedConfetti).toHaveBeenCalledTimes(1);
  });

  it('mid-tier celebration fires once', () => {
    wrap(
      <ConfettiProvider>
        <Consumer />
      </ConfettiProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /^mid$/i }));
    expect(mockedConfetti).toHaveBeenCalledTimes(1);
  });

  it('big celebration fires once now and twice after a beat', () => {
    vi.useFakeTimers();
    wrap(
      <ConfettiProvider>
        <Consumer />
      </ConfettiProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /^big$/i }));
    // First burst fires synchronously.
    expect(mockedConfetti).toHaveBeenCalledTimes(1);

    // The two side bursts fire after a 200ms delay in the provider.
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(mockedConfetti).toHaveBeenCalledTimes(3);
  });

  it('does not crash for a consumer rendered outside the provider', () => {
    // A missing provider is a no-op, not a thrown error. The tree renders;
    // confetti is never called because the no-op fallback does nothing.
    const Orphan = () => {
      const { burst } = useConfetti();
      burst();
      return <p>orphan ok</p>;
    };

    wrap(<Orphan />);

    expect(screen.getByText(/orphan ok/i)).toBeInTheDocument();
    expect(mockedConfetti).not.toHaveBeenCalled();
  });

  it('respects prefers-reduced-motion', () => {
    const original = window.matchMedia;
    // Force the reduced-motion query to report true, and everything else
    // to report false. The provider asks specifically for
    // "(prefers-reduced-motion: reduce)".
    window.matchMedia = ((query: string) =>
      ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      }) as unknown as MediaQueryList) as unknown as typeof window.matchMedia;

    try {
      wrap(
        <ConfettiProvider>
          <Consumer />
        </ConfettiProvider>
      );

      fireEvent.click(screen.getByRole('button', { name: /^burst$/i }));
      fireEvent.click(screen.getByRole('button', { name: /^big$/i }));
      // Reduced motion means every path must be a no-op.
      expect(mockedConfetti).not.toHaveBeenCalled();
    } finally {
      window.matchMedia = original;
    }
  });
});