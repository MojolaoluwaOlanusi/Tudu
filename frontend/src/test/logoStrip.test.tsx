import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LogoStrip from '../components/landing/LogoStrip';

describe('LogoStrip', () => {
  it('renders the "built with" eyebrow copy', () => {
    const { container } = render(<LogoStrip />);
    expect(container.textContent).toMatch(/Built with the same tools/i);
  });

  it('renders every stack tool twice (the second for the seamless loop)', () => {
    const { container } = render(<LogoStrip />);
    const names = [
      'PostgreSQL',
      'React',
      'TypeScript',
      'Vite',
      'Tailwind',
      'Socket\\.IO',
      'Express',
      'Chart\\.js',
    ];
    for (const name of names) {
      const count = (container.textContent?.match(new RegExp(name, 'g')) ?? []).length;
      expect(count, `expected 2x ${name}`).toBe(2);
    }
  });
});