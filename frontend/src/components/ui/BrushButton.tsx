import React from 'react';
import { twMerge } from 'tailwind-merge';

export type BrushButtonVariant = 'primary' | 'ghost';
export type BrushButtonSize = 'sm' | 'md';

export interface BrushButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BrushButtonVariant;
  size?: BrushButtonSize;
}

const BASE_CLASSES =
  'relative inline-flex items-center justify-center font-semibold transition-colors duration-200';

const SIZE_CLASSES: Record<BrushButtonSize, string> = {
  sm: 'rounded-md px-3 py-1.5 text-xs',
  md: 'rounded-md px-4 py-2 text-sm',
};

const VARIANT_CLASSES: Record<BrushButtonVariant, string> = {
  primary: 'bg-brand text-ink-inverse shadow-sm hover:bg-brand-hover',
  ghost: 'text-ink-muted hover:bg-subtle hover:text-ink',
};

/**
 * The mockup's primary CTA. Used on the landing page (and anywhere a
 * green brush stroke is the right affordance); the app shell keeps its
 * `.btn-accent` class in `index.css` untouched until Step 8.
 *
 * Notes on rendering (as opposed to the `.btn-accent` in index.css):
 *   - Text uses `text-ink-inverse`, so it flips to a dark `#0E0E10` on the
 *     brand green in dark mode (the mockup's exact look) and white in light
 *     mode. This is a visual difference from `.btn-accent`'s hard-coded
 *     `color: #ffffff`; it will feel deliberate once the app shell's buttons
 *     are migrated in Step 8.
 *   - `brush-stroke` comes from `styles/brand.css` (Step 1). It renders the
 *     underline on primary only, exactly as in the mockup.
 *   - `className` wins over the default size/variant classes (tailwind-merge),
 *     so a caller can request a wider or taller button without fighting
 *     Tailwind's cascade.
 */
const BrushButton = React.forwardRef<HTMLButtonElement, BrushButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      className = '',
      children,
      type = 'button',
      ...rest
    },
    ref,
  ) => {
    const classes = twMerge(
      BASE_CLASSES,
      SIZE_CLASSES[size],
      VARIANT_CLASSES[variant],
      variant === 'primary' && 'brush-stroke',
      className,
    );

    return (
      <button ref={ref} type={type} className={classes} {...rest}>
        {children}
      </button>
    );
  },
);

BrushButton.displayName = 'BrushButton';

export default BrushButton;