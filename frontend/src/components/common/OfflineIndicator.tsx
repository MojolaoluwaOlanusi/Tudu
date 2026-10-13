import React, { useEffect, useState } from 'react';

/**
 * A tiny pill that appears at the top of the viewport when the browser goes
 * offline. The app itself keeps working from the service-worker cache — the
 * pill exists so a user understands why nothing they do is reaching the
 * server.
 */
const OfflineIndicator: React.FC = () => {
  const [offline, setOffline] = useState(
    typeof navigator !== 'undefined' && !navigator.onLine
  );

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

  if (!offline) return null;

  return (
    <div
      className="pointer-events-none fixed left-1/2 top-4 z-[85] -translate-x-1/2"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 rounded-full border border-hairline bg-amber-500/90 px-3 py-1.5 text-xs font-semibold text-white shadow-lg">
        <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />
        Offline — changes will sync when you reconnect
      </div>
    </div>
  );
};

export default OfflineIndicator;
