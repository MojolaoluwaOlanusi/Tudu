import React from 'react';
import { useSocketStore } from '../../store/socketStore';

const TITLES: Record<'live' | 'connecting' | 'offline', string> = {
  live: 'Connected',
  connecting: 'Connecting',
  offline: 'Offline',
};

const COLORS: Record<'live' | 'connecting' | 'offline', string> = {
  live: 'bg-brand',
  connecting: 'bg-brand',
  offline: 'bg-red-500',
};

/**
 * A single dot reflecting the live socket connection.
 *
 * Pulses whenever the socket is `connected` OR `connecting` (so the dot
 * always looks alive, like the mockup's), and `isSyncing` adds a second,
 * offset ripple on top. `offline` stops the ripple and turns the dot red.
 */
const SyncDot: React.FC = () => {
  const status = useSocketStore((s) => s.status);
  const isSyncing = useSocketStore((s) => s.isSyncing);

  const display: 'live' | 'connecting' | 'offline' =
    status === 'connected'
      ? 'live'
      : status === 'connecting'
        ? 'connecting'
        : 'offline';

  return (
    <div
      title={TITLES[display]}
      aria-label={TITLES[display]}
      role="status"
      data-tour="sync"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md"
    >
      <span className="relative flex h-2 w-2">
        {display !== 'offline' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
        )}
        {display === 'live' && isSyncing && (
          <span
            className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-40"
            style={{ animationDelay: '0.3s' }}
          />
        )}
        <span
          className={
            'relative inline-flex h-2 w-2 rounded-full ' +
            COLORS[display] +
            (display === 'connecting' ? ' animate-pulse' : '')
          }
        />
      </span>
    </div>
  );
};

export default SyncDot;
