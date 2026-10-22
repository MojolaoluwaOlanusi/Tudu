import React, { useEffect, useState } from 'react';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import ConflictResolutionModal from '../settings/ConflictResolutionModal';

const OfflineIndicator: React.FC = () => {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine,
  );
  const [showConflicts, setShowConflicts] = useState(false);
  const { pending, conflictTotal, flush, refreshCounts } = useOfflineSync();

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

  if (!offline && pending === 0 && conflictTotal === 0) return null;

  const parts: string[] = [];
  if (offline) parts.push('Offline');
  if (pending > 0) parts.push(`${pending} change${pending === 1 ? '' : 's'} queued`);
  if (conflictTotal > 0) parts.push(`${conflictTotal} conflict${conflictTotal === 1 ? '' : 's'}`);

  return (
    <>
      <div
        className="pointer-events-none fixed left-1/2 top-4 z-[85] -translate-x-1/2"
        role="status"
        aria-live="polite"
      >
        <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-hairline bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
          {parts.join(' · ')}
          {conflictTotal > 0 && (
            <button
              type="button"
              onClick={() => setShowConflicts(true)}
              className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold hover:bg-white/30"
            >
              Resolve
            </button>
          )}
          {conflictTotal === 0 && !offline && pending > 0 && (
            <button
              type="button"
              onClick={() => void flush()}
              className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold hover:bg-white/30"
            >
              Sync now
            </button>
          )}
        </div>
      </div>
      {showConflicts && (
        <ConflictResolutionModal
          onClose={() => setShowConflicts(false)}
          onResolved={() => {
            void refreshCounts();
            void flush();
            setShowConflicts(false);
          }}
        />
      )}
    </>
  );
};

export default OfflineIndicator;
