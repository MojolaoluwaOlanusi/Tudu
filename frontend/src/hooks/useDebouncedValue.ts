import { useEffect, useState } from 'react';

/**
 * Debounce a rapidly changing value (e.g. a search box) so that we do not fire
 * a new query on every keystroke.
 */
export const useDebouncedValue = <T,>(value: T, delay = 300): T => {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
};
