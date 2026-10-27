import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BarChart } from '../components/app/charts/Charts';

const bars = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ label: `D${i}`, value: i }));

describe('BarChart mobile scroll behaviour', () => {
  it('renders without a horizontal scroller for a small number of bars', () => {
    render(<BarChart data={bars(7)} />);
    expect(screen.getByTestId('bar-chart').className).not.toMatch(
      /overflow-x-auto/
    );
  });

  it('wraps in a horizontal scroller for many bars', () => {
    render(<BarChart data={bars(30)} />);
    expect(screen.getByTestId('bar-chart').className).toMatch(
      /overflow-x-auto/
    );
  });
});