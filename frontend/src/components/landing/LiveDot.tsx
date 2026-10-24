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

const MIN = 6;
const MAX = 28;
const INITIAL = 12;
const POLL_MS = 20_000;

/**
 * A pulsing brand dot with a short "N people building right now" caption.
 *
 * Data source:
 *   - `count` prop wins (presentational override).
 *   - Otherwise, polls `GET /api/public/stats` on mount and every 20 s and
 *     uses its `active_users` field (the socket server's live count of
 *     distinct connected users).
 *   - If the fetch fails or the field is missing, the count oscillates
 *     around 12 (the mockup's original behaviour). That makes the landing
 *     page resilient: it never shows a blank dot when the backend is down.
 *
 * Not tied to authentication: landing-page visitors are anonymous, so
 * polling the public endpoint is the only way to surface a real count
 * without giving every visitor a socket connection.
 */
const LiveDot: React.FC<LiveDotProps> = ({ count, className }) => {
  const [oscillating, setOscillating] = useState(INITIAL);
  const [liveCount, setLiveCount] = useState<number | null>(null);

  // Oscillating fallback (only when no explicit count).
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

  // Poll the public stats endpoint for the real number.
  useEffect(() => {
    if (count !== undefined) return;
    let cancelled = false;

    const fetchCount = async () => {
      try {
        const stats = await publicService.getStats();
        if (!cancelled && typeof stats.active_users === 'number') {
          setLiveCount(stats.active_users);
        }
      } catch {
        // Silent fail — keep the oscillating fallback.
      }
    };

    void fetchCount();
    const id = window.setInterval(fetchCount, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [count]);

  const value = count ?? liveCount ?? oscillating;

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