import { describe, it, expect, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePageMeta } from '../hooks/usePageMeta';

describe('usePageMeta', () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
    document
      .querySelectorAll('meta[name="description"][data-testid="page-meta"]')
      .forEach((m) => m.remove());
  });

  it('sets document.title', () => {
    renderHook(() => usePageMeta({ title: 'Privacy policy - Tudu' }));
    expect(document.title).toBe('Privacy policy - Tudu');
  });

  it('restores the previous title on unmount', () => {
    document.title = 'Previous Title';
    const { unmount } = renderHook(() =>
      usePageMeta({ title: 'Terms - Tudu' })
    );
    expect(document.title).toBe('Terms - Tudu');
    unmount();
    expect(document.title).toBe('Previous Title');
  });

  it('updates an existing meta description and restores it', () => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'description';
      document.head.appendChild(meta);
    }
    const previous = meta.getAttribute('content');
    meta.setAttribute('content', 'Original description');

    const { unmount } = renderHook(() =>
      usePageMeta({
        title: 'T',
        description: 'How Tudu handles your data',
      })
    );
    expect(meta.getAttribute('content')).toBe('How Tudu handles your data');

    unmount();
    expect(meta.getAttribute('content')).toBe('Original description');
    if (previous === null) meta.remove();
    else meta.setAttribute('content', previous);
  });
});