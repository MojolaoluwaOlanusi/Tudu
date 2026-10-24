import React, { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface LiveDotProps {
  /**
   * If provided, the component shows this fixed count. If omitted it
   * oscillates around 12 (between 6 and 28) every 4.2s, matching the
   * mockup. Kept optional so a future step can wire it to a real
   * "recently active" query without changing this component.
   */
  count?: number;
  className?: string;
}

const MIN = 6;
const MAX = 28;
const INITIAL = 12;

/**
 * A pulsing brand dot with a short "N people building right now" caption.
 * Used on the landing page navbar and the mobile menu (added in Step 3).
 * Presentational only — no network call, no analytics, no storage.
 */
const LiveDot: React.FC<LiveDotProps> = ({ count, className }) => {
  const [oscillating, setOscillating] = useState(INITIAL);

  useEffect(() => {
    if (count !== undefined) return;
    const id = window.setInterval(() => {
      setOscillating((c) => {
        const next = c + (Math.random() > 0.5 ? 1 : -1);
        return Math.max(MIN, Math.min(MAX, next));
      });
    }, 4200);
    return () => window.clearInterval(id);
  }, [count]);

  const value = count ?? oscillating;

  return (
    <div
      className={twMerge(
        'flex items-center gap-2 whitespace-nowrap text-xs text-ink-muted',
        className,
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
      </span>
      <span>
        <span className="font-semibold text-ink">{value}</span>{' '}
        people building right now
      </span>
    </div>
  );
};

export default LiveDot;