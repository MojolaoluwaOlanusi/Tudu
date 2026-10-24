import React from 'react';
import { twMerge } from 'tailwind-merge';
import { useThemeStore } from '../../store/themeStore';

export type WordmarkSize = 'sm' | 'md' | 'lg' | 'xl';

interface WordmarkProps {
  /**
   * Explicit height token. When omitted, the caller's `className` sizes the
   * image — which is how every pre-existing call site works, so leaving
   * `size` off keeps its current appearance.
   */
  size?: WordmarkSize;
  /** Sizing / layout classes for the caller (win over `size` on conflict). */
  className?: string;
  alt?: string;
}

const SIZE_CLASSES: Record<WordmarkSize, string> = {
  sm: 'h-7',
  md: 'h-9',
  lg: 'h-12',
  // The footer wordmark sits half behind a glass panel; keep the height
  // responsive so it scales across breakpoints like the mockup's xl.
  xl: 'h-[56px] sm:h-[80px] md:h-[120px] lg:h-[140px]',
};

/**
 * The Tudu wordmark.
 *
 * The artwork is a raster PNG with black brush lettering and a green
 * checkstroke, so it needs a genuine dark-theme variant: the lettering has to
 * become light while the checkstroke stays brand green. A CSS `invert` filter
 * cannot do that, because `invert(1)` flips every channel and turns the green
 * into magenta. `wordmark-dark.png` is the same artwork pre-recoloured, so we
 * simply swap the source when the theme changes.
 *
 * Sizing rules:
 *   - `size` is optional. When omitted, no size class is applied and the
 *     caller's `className` is the only sizer (backward compatible with the
 *     three pre-existing call sites: Login, Landing, Header).
 *   - When `size` is provided AND `className` also sets height, the caller's
 *     class wins (tailwind-merge resolves the conflict in favour of the
 *     later argument).
 */
const Wordmark: React.FC<WordmarkProps> = ({ size, className = '', alt = 'Tudu' }) => {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const sizeClass = size ? SIZE_CLASSES[size] : '';
  const merged = twMerge('w-auto select-none', sizeClass, className);

  return (
    <img
      src={isDark ? '/wordmark-dark.png' : '/wordmark.png'}
      alt={alt}
      draggable={false}
      className={merged}
    />
  );
};

export default Wordmark;