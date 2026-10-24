import React, { useEffect, useState } from 'react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

const ProgressRing: React.FC<{ done: number; total: number }> = ({ done, total }) => {
  const pct = total === 0 ? 0 : Math.min(100, Math.round((done / total) * 100));
  const radius = 7;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - pct / 100);
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4 -rotate-90" aria-label={`Syncing ${pct}%`} role="img">
      <circle cx="10" cy="10" r={radius} fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2.5" />
      <circle cx="10" cy="10" r={radius} fill="none" stroke="#ffffff" strokeWidth="2.5"
        strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
        className="transition-[stroke-dashoffset] duration-300 ease-out" />
    </svg>
  );
};

/**
 * Step 8: tighter pill (rounded-md, smaller text). Behaviour unchanged:
 * same navigator.onLine listener, same useOfflineSync selectors, same
 * "Sync now" handler.
 */
const OfflineIndicator: React.FC = () => {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine,
  );
  const { pending, conflictTotal, progress, flush } = useOfflineSync();
  const syncing = progress.total > 0;

  useEffect(() => {
    const goOffline = () => setOffline(true);
    const goOnline = () => setOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  if (!offline && pending === 0 && conflictTotal === 0 && !syncing) return null;

  let label: string;
  if (syncing) label = `Syncing ${progress.done} of ${progress.total}…`;
  else if (conflictTotal > 0) label = `${conflictTotal} conflict${conflictTotal === 1 ? '' : 's'} to resolve`;
  else if (offline && pending > 0) label = `Offline — ${pending} change${pending === 1 ? '' : 's'} queued`;
  else if (offline) label = 'Offline — viewing cached data';
  else label = `${pending} change${pending === 1 ? '' : 's'} waiting to sync`;

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-[85] -translate-x-1/2" role="status" aria-live="polite">
      <div className="pointer-events-auto flex items-center gap-2 rounded-md border border-amber-400/40 bg-amber-500/95 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg">
        {syncing ? (
          <ProgressRing done={progress.done} total={progress.total} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
        )}
        <span>{label}</span>
        {!offline && !syncing && pending > 0 && conflictTotal === 0 && (
          <button type="button" onClick={() => void flush()}
            className="ml-1 rounded-sm bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold hover:bg-white/30">
            Sync now
          </button>
        )}
      </div>
    </div>
  );
};

export default OfflineIndicator;