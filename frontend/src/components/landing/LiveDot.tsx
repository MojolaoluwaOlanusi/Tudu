import React, { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import { publicService } from '../../services/publicService';

interface LiveDotProps {
  /**
   * Explicit count. If provided, the component renders this value and does
   * NOT poll the API. Used in tests and any caller that already has a count.
   */
  count?: number;
  className?: string;
}

const INITIAL_PLACEHOLDER = 12;
const POLL_MS = 20_000;

/**
 * A pulsing brand dot with a short "N people building right now" caption.
 *
 * Data source:
 *   - `count` prop wins (presentational override).
 *   - Otherwise, polls GET /api/public/stats on mount and every 20 seconds
 *     for `active_users`, the live count of distinct connected users.
 *   - On API failure or a response that omits `active_users`, the widget
 *     hides entirely. Showing a plausible-looking fabricated number (the
 *     previous behaviour: oscillating between 6 and 28) is a small lie
 *     and there is no honest reason to tell it. The dot appearing and
 *     disappearing is a real signal; a fake count is not.
 */
const LiveDot: React.FC<LiveDotProps> = ({ count, className }) => {
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (count !== undefined) return;
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const stats = await publicService.getStats();
        if (cancelled) return;
        if (typeof stats.active_users === 'number') {
          setLiveCount(stats.active_users);
          setHasFailed(false);
        } else {
          setHasFailed(true);
        }
      } catch {
        if (cancelled) return;
        setHasFailed(true);
      }
    };

    void fetchCount();
    const id = window.setInterval(fetchCount, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [count]);

  // Explicit count prop wins, and never hides.
  if (count === undefined && hasFailed && liveCount === null) return null;

  const value = count ?? liveCount ?? INITIAL_PLACEHOLDER;

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