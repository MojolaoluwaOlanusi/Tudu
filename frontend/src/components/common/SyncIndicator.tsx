import React from 'react';
import { useSocketStore } from '../../store/socketStore';

const dotClass = 'h-2 w-2 rounded-full';

const Spinner: React.FC = () => (
  <svg
    className="h-3 w-3 animate-spin"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" />
    <path className="opacity-90" strokeLinecap="round" d="M22 12a10 10 0 00-10-10" />
  </svg>
);

/**
 * Connection status for the real-time layer.
 *
 * Silent when everything is healthy - the "Live" state is just a dot, so the
 * header stays calm - and only takes up real estate when something is wrong
 * or a change has just landed.
 */
const SyncIndicator: React.FC = () => {
  const status = useSocketStore((state) => state.status);
  const isSyncing = useSocketStore((state) => state.isSyncing);

  if (isSyncing) {
    return (
      <span
        role="status"
        aria-live="polite"
        className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-xs font-medium text-ink-muted"
      >
        <Spinner />
        Syncing
      </span>
    );
  }

  if (status === 'connecting') {
    return (
      <span
        role="status"
        aria-live="polite"
        title="Reconnecting to the real-time server"
        className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-700/50 dark:bg-amber-950/40 dark:text-amber-300"
      >
        <Spinner />
        Connecting
      </span>
    );
  }

  if (status === 'disconnected') {
    return (
      <span
        role="status"
        aria-live="polite"
        title="Changes will appear once the connection is restored"
        className="inline-flex items-center gap-1.5 rounded-full border border-red-300 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 dark:border-red-700/50 dark:bg-red-950/40 dark:text-red-300"
      >
        <span className={`${dotClass} bg-red-500`} />
        Offline
      </span>
    );
  }

  return (
    <span
      title="Connected - changes appear instantly"
      aria-label="Live updates connected"
      className="inline-flex items-center gap-1.5 px-1 py-1"
    >
      <span className={`${dotClass} bg-accent`} />
    </span>
  );
};

export default SyncIndicator;