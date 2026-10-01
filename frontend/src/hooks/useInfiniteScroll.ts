import { useEffect, useRef } from 'react';

/**
 * Attach the returned ref to a sentinel element; the next page is fetched when
 * that element scrolls into view (infinite scroll).
 */
export const useInfiniteScroll = (
  fetchNextPage: () => void,
  enabled: boolean
): React.RefObject<HTMLDivElement> => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { rootMargin: '200px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, enabled]);

  return ref;
};