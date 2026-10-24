import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Spinner from '../components/common/Spinner';

describe('Spinner', () => {
  it('renders with a 16px default size and the spin animation', () => {
    render(<Spinner />);
    const svg = document.querySelector('svg') as SVGSVGElement;
    expect(svg).toBeTruthy();
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
    expect(svg).toHaveClass('animate-spin');
  });

  it('respects the size prop', () => {
    render(<Spinner size={24} />);
    const svg = document.querySelector('svg') as SVGSVGElement;
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
  });

  it('is aria-hidden when no label is provided', () => {
    render(<Spinner />);
    expect(document.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('exposes a status role and label when a label is provided', () => {
    render(<Spinner label="Loading" />);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
  });
});