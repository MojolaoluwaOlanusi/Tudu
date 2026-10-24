import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BentoGrid from '../components/landing/BentoGrid';

/**
 * `src/test/setup.ts` now stubs IntersectionObserver globally, so this
 * file no longer needs a per-file stub.
 *
 * Each tile header is an `<h3>` (from TileHeader). Query by heading role
 * instead of by text so labels that appear both as a title and as a
 * section label inside the same tile (e.g. "Templates" in TemplatesTile)
 * do not collide.
 */
describe('BentoGrid', () => {
  it('renders all 16 tile headers', () => {
    render(<BentoGrid />);
    const titles = [
      'AI that actually helps',
      'Command everything',
      'Focus Mode, built-in',
      'Never lose work',
      'Boards that fit you',
      'Keyboard-first',
      'Workspaces & roles',
      'PWA install',
      'Templates',
      'Self-hosting',
      'Notifications',
      'Public API',
      'Webhooks',
      'Sell templates',
      'Integrations',
      'Analytics that ship',
    ];
    for (const t of titles) {
      expect(
        screen.getByRole('heading', { name: t }),
        `missing tile heading: ${t}`,
      ).toBeInTheDocument();
    }
  });

  it('renders the section heading', () => {
    render(<BentoGrid />);
    expect(
      screen.getByRole('heading', { name: /Everything you wish your boards had/i }),
    ).toBeInTheDocument();
  });
});