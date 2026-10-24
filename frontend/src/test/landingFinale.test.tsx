import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Landing from '../components/landing/Landing';

/**
 * Guards the e2e-compatible contract on `/` without duplicating Playwright.
 * landing.spec.ts asserts (on the real page):
 *   - a heading whose name matches /Kanban that\s+just works/i
 *   - a button whose name matches /Try the demo/i
 *   - a button whose name matches /Start free/i
 *   - three headings "Free", "Pro", "Enterprise"
 *
 * Rendering <Landing /> here catches regressions in that contract faster
 * than waiting for e2e. Landing internally composes the entire marketing
 * page, so this is a full-render smoke test.
 */
describe('Landing (composition + e2e contract)', () => {
  it('renders the e2e-compat heading "Kanban that just works"', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', { name: /Kanban that\s+just works/i }),
    ).toBeInTheDocument();
  });

  it('renders a "Try the demo" button (from PricingSection)', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    const demoButtons = screen.getAllByRole('button', { name: /Try the demo/i });
    expect(demoButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('renders a "Start free" button (from the Navbar)', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    const startFree = screen.getAllByRole('button', { name: /Start free/i });
    expect(startFree.length).toBeGreaterThanOrEqual(1);
  });

  it('renders the three pricing card headings Free / Pro / Enterprise', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /^Free$/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Pro$/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Enterprise$/ })).toBeInTheDocument();
  });
});