import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

// In tests we want `useInView` to always report `true` (so the effect fires)
// and `useReducedMotion` to always report `true` (so the panel jumps
// straight to the full code rather than animating). Both hooks come from
// framer-motion; spreading `actual` keeps `motion.*` and other exports
// working.
vi.mock('framer-motion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('framer-motion')>();
  return {
    ...actual,
    useInView: vi.fn(() => true),
    useReducedMotion: vi.fn(() => true),
  };
});

import { useInView, useReducedMotion } from 'framer-motion';
import CodePanel from '../components/landing/underhood/CodePanel';

const mockedUseInView = vi.mocked(useInView);
const mockedUseReducedMotion = vi.mocked(useReducedMotion);

describe('CodePanel', () => {
  afterEach(() => {
    mockedUseInView.mockReturnValue(true);
    mockedUseReducedMotion.mockReturnValue(true);
  });

  it('renders the full code immediately when prefers-reduced-motion is set', async () => {
    const { container } = render(
      <CodePanel
        title="server.ts"
        language="typescript"
        code={['const x = 1;', 'const y = 2;']}
        delay={0}
        status="ok"
      />,
    );
    await waitFor(() => {
      expect(container.textContent).toContain('const x = 1;');
      expect(container.textContent).toContain('const y = 2;');
    });
  });

  it('renders the panel title, language, and status footer', () => {
    render(
      <CodePanel
        title="tasks.ts"
        language="typescript"
        code={['const x = 1;']}
        delay={0}
        status="listening on :5000"
      />,
    );
    expect(screen.getByText('tasks.ts')).toBeInTheDocument();
    expect(screen.getByText('typescript')).toBeInTheDocument();
    expect(screen.getByText('listening on :5000')).toBeInTheDocument();
  });

  it('renders nothing typed before the panel is in view (mocked useInView=false)', async () => {
    mockedUseInView.mockReturnValue(false);
    const { container } = render(
      <CodePanel
        title="server.ts"
        language="typescript"
        code={['const x = 1;']}
        delay={0}
        status="ok"
      />,
    );
    // Give the effect one tick to run setTyped(0).
    await waitFor(() => {
      expect(container.textContent ?? '').not.toContain('const x = 1;');
    });
  });
});