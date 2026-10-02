import React from 'react';

/**
 * A green circle with a checkmark that draws itself in when `animate` is
 * true - used for task completion and other "done" moments.
 */
const CheckPop: React.FC<{
  size?: number;
  className?: string;
  /** Re-mount to replay the animation. */
  animate?: boolean;
  title?: string;
}> = ({ size = 20, className = '', animate = false, title }) => (
  <span
    className={`inline-flex shrink-0 items-center justify-center rounded-full bg-accent-soft ${className}`}
    style={{ width: size, height: size }}
  >
    <svg
      viewBox="0 0 24 24"
      width={size * 0.62}
      height={size * 0.62}
      fill="none"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path
        d="M5 13l4 4L19 7"
        stroke="var(--color-accent-strong)"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={animate ? 'check-pop' : undefined}
      />
    </svg>
  </span>
);

export default CheckPop;