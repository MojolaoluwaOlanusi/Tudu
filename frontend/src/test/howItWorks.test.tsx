import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import HowItWorks from '../components/landing/HowItWorks';

/**
 * jsdom's default `matchMedia` stub returns `matches: false`, so `useIsDesktop`
 * stays `false` and `HowItWorks` renders the mobile fallback. That is the
 * path these tests exercise; the desktop sticky-scroll path is driven by
 * framer-motion's `useScroll` and is exercised only in a real browser.
 *
 * The IntersectionObserver stub in `src/test/setup.ts` prevents the
 * `whileInView` on each demo from crashing; demos render their initial
 * state without running the loop.
 */
describe('HowItWorks', () => {
  it('renders the mobile heading and all four step titles', () => {
    render(<HowItWorks />);
    expect(
      screen.getByRole('heading', { name: /Four steps from idea to shipped/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Capture in seconds/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Organize with flow/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Stay in focus/i })).toBeInTheDocument();
    // "Ship & measure" appears both as the short label and the heading.
    expect(screen.getAllByText('Ship & measure').length).toBeGreaterThanOrEqual(1);
  });

  it('renders all four demo cards', () => {
    render(<HowItWorks />);
    expect(screen.getByText('Quick add')).toBeInTheDocument();      // CaptureDemo
    expect(screen.getByText('Board')).toBeInTheDocument();          // OrganizeDemo
    expect(screen.getByText('Focus session')).toBeInTheDocument();  // FocusDemo
    expect(screen.getByText('Analytics')).toBeInTheDocument();      // ShipDemo
  });
});