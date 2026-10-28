import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import LiveDot from '../components/landing/LiveDot';

describe('LiveDot', () => {
  it('renders the fixed count when one is provided', () => {
    const { container } = render(<LiveDot count={15} />);
    expect(container.textContent).toContain('15');
    expect(container.textContent).toContain('people building right now');
  });

  it('renders the pulsing dot', () => {
    const { container } = render(<LiveDot count={12} />);
    expect(container.querySelector('.animate-ping')).not.toBeNull();
  });

  it('renders the initial placeholder before the fetch resolves', () => {
    const { container } = render(<LiveDot />);
    // Synchronously after render the placeholder is visible. Once the
    // first fetch fails, the widget hides (see liveDotLive.test.tsx).
    expect(container.textContent).toContain('12');
  });
});