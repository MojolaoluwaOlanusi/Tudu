import React from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { useUiStore } from '../../store/uiStore';

/**
 * Small install banner that appears at the bottom of the app once the
 * browser has signalled the app is installable (Chromium only).
 *
 * Not shown on iOS — Safari has no `beforeinstallprompt` equivalent — and
 * not shown for 30 days after a Dismiss, so nobody gets nagged. The
 * installation itself is free-standing once it happens: the app runs from
 * the home screen, offline-capable, no browser chrome.
 */
const InstallPrompt: React.FC = () => {
  const { canInstall, install, dismiss } = useInstallPrompt();
  const pushToast = useUiStore((s) => s.pushToast);

  if (!canInstall) return null;

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === 'accepted') pushToast('Tudu added to your home screen', 'success');
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[75] w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 px-2"
      role="dialog"
      aria-label="Install Tudu"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface-2 p-3 shadow-lg">
        <img src="/icon.svg" alt="" width="36" height="36" className="shrink-0 rounded-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">Install Tudu</p>
          <p className="truncate text-[11px] text-ink-muted">
            Runs offline, opens like an app.
          </p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="rounded-full bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-all hover:brightness-110"
        >
          Install
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Not now"
          className="rounded-full px-2 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
        >
          Later
        </button>
      </div>
    </div>
  );
};

export default InstallPrompt;
