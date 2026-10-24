import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

// framer-motion's useReducedMotion caches the matchMedia result in a
// module-level ref during the first call, so a per-test window.matchMedia
// override does not reach the hook afterwards. Mocking the hook is the
// only reliable way to drive it in tests.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useReducedMotion: vi.fn(() => false),
  };
});

import { useReducedMotion } from 'framer-motion';
import LiveBoardHero from '../components/landing/LiveBoardHero';

const mockedUseReducedMotion = vi.mocked(useReducedMotion);

describe('LiveBoardHero', () => {
  afterEach(() => {
    mockedUseReducedMotion.mockReturnValue(false);
  });

  it('renders the initial five cards across three columns', () => {
    const { container } = render(<LiveBoardHero autoPlay={false} />);
    expect(screen.getByText('Design new dashboard')).toBeInTheDocument();
    expect(screen.getByText('Review API spec')).toBeInTheDocument();
    expect(screen.getByText('Write launch notes')).toBeInTheDocument();
    expect(screen.getByText('Ship pricing page')).toBeInTheDocument();
    expect(screen.getByText('Set up staging')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-column]')).toHaveLength(3);
  });

  it('shows the "Auto-playing demo" label when autoPlay is on and motion is not reduced', () => {
    mockedUseReducedMotion.mockReturnValue(false);
    render(<LiveBoardHero autoPlay />);
    expect(screen.getByText(/Auto-playing demo/)).toBeInTheDocument();
  });

  it('shows the "Interactive" label when autoPlay is false', () => {
    render(<LiveBoardHero autoPlay={false} />);
    expect(screen.getByText(/Interactive/)).toBeInTheDocument();
  });

  it('respects prefers-reduced-motion by starting in Interactive mode', () => {
    mockedUseReducedMotion.mockReturnValue(true);
    render(<LiveBoardHero autoPlay />);
    expect(screen.getByText(/Interactive/)).toBeInTheDocument();
    expect(screen.queryByText(/Auto-playing demo/)).toBeNull();
  });

  it('adds a new card via the composer', () => {
    render(<LiveBoardHero autoPlay={false} />);
    const input = screen.getByPlaceholderText(/Add a task/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Ship v2' } });
    fireEvent.submit(input.closest('form')!);
    expect(screen.getByText('Ship v2')).toBeInTheDocument();
  });
});