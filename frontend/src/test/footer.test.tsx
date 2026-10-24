import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from '../components/landing/Footer';
import { useThemeStore } from '../store/themeStore';

const wrap = (ui: React.ReactNode) => render(<MemoryRouter>{ui}</MemoryRouter>);

/**
 * The giant wordmark in the footer is inside a `pointer-events-none
 * aria-hidden="true"` wrapper (matching the mockup: it's a decorative
 * flourish, not an element assistive tech should announce). Testing
 * Library's `getByRole` excludes aria-hidden subtrees by default, so the
 * two wordmark-source tests must query with `hidden: true`. This is not a
 * bug workaround — it's the correct way to assert on a decorative
 * image whose wrapper is deliberately out of the a11y tree.
 */
describe('Footer', () => {
  afterEach(() => {
    useThemeStore.setState({ theme: 'light' });
  });

  it('renders the Wordmark PNG (light variant) by default', () => {
    useThemeStore.setState({ theme: 'light' });
    wrap(<Footer />);
    const img = screen.getByRole('img', { name: 'Tudu', hidden: true });
    expect(img).toHaveAttribute('src', '/wordmark.png');
  });

  it('switches the Wordmark to the dark PNG when the theme is dark', () => {
    useThemeStore.setState({ theme: 'dark' });
    wrap(<Footer />);
    const img = screen.getByRole('img', { name: 'Tudu', hidden: true });
    expect(img).toHaveAttribute('src', '/wordmark-dark.png');
  });

  it('renders the glass panel with backdrop blur', () => {
    wrap(<Footer />);
    const panel = screen.getByTestId('footer-glass-panel');
    expect(panel).toHaveClass('backdrop-blur-2xl');
    expect(panel).toHaveClass('backdrop-saturate-150');
  });

  it('renders the radial green glow behind the checkstroke', () => {
    wrap(<Footer />);
    const glow = screen.getByTestId('footer-wordmark-glow');
    // The glow uses an inline style with a radial-gradient.
    expect(glow.getAttribute('style')).toMatch(/radial-gradient/);
    expect(glow.getAttribute('style')).toMatch(/rgba\(34,\s*197,\s*94/);
  });

  it('positions the Wordmark half outside the footer with -translate-y-1/2', () => {
    wrap(<Footer />);
    const wrapper = screen.getByTestId('footer-wordmark-wrapper');
    expect(wrapper).toHaveClass('-translate-y-1/2');
  });

  it('renders all five section headings', () => {
    wrap(<Footer />);
    // Each heading appears twice (mobile + desktop grids), so use getAll.
    for (const h of ['Product', 'Solutions', 'Developers', 'Resources', 'Legal']) {
      expect(screen.getAllByText(h).length).toBeGreaterThanOrEqual(1);
    }
  });
});