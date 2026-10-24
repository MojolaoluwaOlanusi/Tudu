import React from 'react';
import { useSocketStore } from '../../store/socketStore';

const TITLES: Record<'live' | 'connecting' | 'offline', string> = {
  live: 'Connected',
  connecting: 'Connecting',
  offline: 'Offline',
};

const COLORS: Record<'live' | 'connecting' | 'offline', string> = {
  live: 'bg-brand',
  connecting: 'bg-white',
  offline: 'bg-red-500',
};

/**
 * A single pulsing dot reflecting the live socket connection.
 *
 * The mockup renders a pill with a "N people building" caption — that live
 * number is landing-page only. Inside the app shell it is the caller's own
 * connection status, so this component reads the socket store directly and
 * renders a bare dot (matching the mockup's `SyncDot`).
 */
const SyncDot: React.FC = () => {
  const status = useSocketStore((s) => s.status);
  const isSyncing = useSocketStore((s) => s.isSyncing);

  const display: 'live' | 'connecting' | 'offline' = isSyncing
    ? 'connecting'
    : status === 'connected'
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
        {display === 'live' && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-50" />
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
