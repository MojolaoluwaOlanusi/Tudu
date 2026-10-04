import React from 'react';
import { useThemeStore } from '../../store/themeStore';

interface WordmarkProps {
  /** Sizing classes for the caller, e.g. `h-9 w-auto`. */
  className?: string;
  alt?: string;
}

/**
 * The Tudu wordmark.
 *
 * The artwork is a raster PNG with black brush lettering and a green
 * checkstroke, so it needs a genuine dark-theme variant: the lettering has to
 * become light while the checkstroke stays brand green. A CSS `invert` filter
 * cannot do that, because `invert(1)` flips every channel and turns the green
 * into magenta. `wordmark-dark.png` is the same artwork pre-recoloured, so we
 * simply swap the source when the theme changes.
 */
const Wordmark: React.FC<WordmarkProps> = ({ className = '', alt = 'Tudu' }) => {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  return (
    <img
      src={isDark ? '/wordmark-dark.png' : '/wordmark.png'}
      alt={alt}
      className={className}
    />
  );
};

export default Wordmark;
