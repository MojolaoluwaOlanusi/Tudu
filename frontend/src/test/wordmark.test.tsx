import { describe, it, expect, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Wordmark from '../components/common/Wordmark';
import { useThemeStore } from '../store/themeStore';

describe('Wordmark', () => {
  afterEach(() => {
    useThemeStore.setState({ theme: 'light' });
  });

  it('renders the light PNG when the theme is light', () => {
    useThemeStore.setState({ theme: 'light' });
    render(<Wordmark />);
    expect(screen.getByRole('img', { name: 'Tudu' })).toHaveAttribute(
      'src',
      '/wordmark.png',
    );
  });

  it('renders the dark PNG when the theme is dark', () => {
    useThemeStore.setState({ theme: 'dark' });
    render(<Wordmark />);
    expect(screen.getByRole('img', { name: 'Tudu' })).toHaveAttribute(
      'src',
      '/wordmark-dark.png',
    );
  });

  it('applies the size class when the size prop is provided', () => {
    const { rerender } = render(<Wordmark size="sm" />);
    expect(screen.getByRole('img')).toHaveClass('h-7');

    rerender(<Wordmark size="md" />);
    expect(screen.getByRole('img')).toHaveClass('h-9');

    rerender(<Wordmark size="lg" />);
    expect(screen.getByRole('img')).toHaveClass('h-12');
  });

  it('lets className override the size class on conflict', () => {
    render(<Wordmark size="md" className="h-20 w-32" />);
    const img = screen.getByRole('img');
    // tailwind-merge keeps the caller's height and width.
    expect(img).toHaveClass('h-20');
    expect(img).toHaveClass('w-32');
    expect(img).not.toHaveClass('h-9');
  });

  it('omits any size class when size is not provided (backward compatible)', () => {
    // The three pre-existing call sites (Login, Landing, Header) size the
    // logo entirely via className.
    render(<Wordmark className="h-20 w-auto" />);
    const img = screen.getByRole('img');
    expect(img).toHaveClass('h-20');
    expect(img).not.toHaveClass('h-9');
    expect(img).not.toHaveClass('h-12');
  });
});