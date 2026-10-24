import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LogoStrip from '../components/landing/LogoStrip';

describe('LogoStrip', () => {
  it('renders the top eyebrow copy', () => {
    const { container } = render(<LogoStrip />);
    expect(container.textContent).toMatch(/Trusted by builders/i);
    expect(container.textContent).toMatch(/outgrew Trello/i);
  });

  it('renders every startup logo twice (the second for the seamless loop)', () => {
    const { container } = render(<LogoStrip />);
    const names = ['Paystack', 'Flutterwave', 'Kuda', 'Piggyvest', 'Andela', 'Mono', 'Termii', 'Cowrywise'];
    for (const name of names) {
      const count = (container.textContent?.match(new RegExp(name, 'g')) ?? []).length;
      expect(count, `expected 2x ${name}`).toBe(2);
    }
  });
});