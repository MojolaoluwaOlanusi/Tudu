import React from 'react';
import { twMerge } from 'tailwind-merge';

interface SpinnerProps {
  /** Pixel width/height. Defaults to 16, matching the inline spinners it replaces. */
  size?: number;
  className?: string;
  /**
   * If provided, the spinner is announced by assistive tech as a live
   * status region with this label. If omitted, the spinner is `aria-hidden`
   * — appropriate when a sibling text element already announces the state
   * (the two most common cases: SyncIndicator and AiBreakdownModal).
   */
  label?: string;
}

/**
 * Single-purpose loading indicator. Extracted from the inline SVG that
 * SyncIndicator, AiBreakdownModal, PomodoroTimerHeader and OfflineIndicator
 * each render today, so later restyle steps can converge them on one
 * implementation without touching their handler logic.
 */
const Spinner: React.FC<SpinnerProps> = ({ size = 16, className, label }) => (
  <svg
    className={twMerge('animate-spin', className)}
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
    role={label ? 'status' : undefined}
    aria-label={label}
    aria-hidden={label ? undefined : true}
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" />
    <path className="opacity-90" strokeLinecap="round" d="M22 12a10 10 0 00-10-10" />
  </svg>
);

export default Spinner;