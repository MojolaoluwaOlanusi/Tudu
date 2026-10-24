import React from 'react';
import { useSocketStore } from '../../store/socketStore';

const dotClass = 'h-2 w-2 rounded-full';

const Spinner: React.FC = () => (
  <svg className="h-3 w-3 animate-spin" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" />
    <path className="opacity-90" strokeLinecap="round" d="M22 12a10 10 0 00-10-10" />
  </svg>
);

const pillBase =
  'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium';

/**
 * Step 8: tightens pill radius/padding/text to match the mockup's SyncDot.
 * Behaviour unchanged: same useSocketStore selectors, same role="status" /
 * aria-live for assistive tech.
 */
const SyncIndicator: React.FC = () => {
  const status = useSocketStore((state) => state.status);
  const isSyncing = useSocketStore((state) => state.isSyncing);

  if (isSyncing) {
    return (
      <span role="status" aria-live="polite" className={`${pillBase} border-line bg-raised text-ink-muted`}>
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
        className={`${pillBase} border-amber-400/50 bg-amber-400/10 text-amber-600 dark:text-amber-300`}
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
        className={`${pillBase} border-red-400/50 bg-red-400/10 text-red-600 dark:text-red-300`}
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
      data-tour="sync"
      className="inline-flex items-center gap-1.5 px-1 py-1"
    >
      <span className={`${dotClass} bg-brand`} />
    </span>
  );
};

export default SyncIndicator;