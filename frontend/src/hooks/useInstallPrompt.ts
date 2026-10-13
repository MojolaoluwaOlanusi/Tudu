import { useCallback, useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'tudu.pwa.install.dismissed';
const DISMISS_TTL_MS = 30 * 24 * 3600 * 1000; // 30 days

/**
 * Track whether the browser is offering to install the app.
 *
 * `beforeinstallprompt` fires on Chromium once the app satisfies the
 * installability criteria. We suppress the browser's default mini-infobar so
 * the banner (InstallPrompt) can call `prompt()` at the moment the user
 * clicks — the browser requires the call to come from a user gesture.
 *
 * Safari has no equivalent event; iOS users get the "Share → Add to Home
 * Screen" path instead, and the banner is simply never shown there.
 */
export const useInstallPrompt = () => {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    try {
      const raw = window.localStorage.getItem(DISMISS_KEY);
      if (!raw) return false;
      const at = Number(raw);
      return Number.isFinite(at) && Date.now() - at < DISMISS_TTL_MS;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    if (!event) return 'unavailable';
    await event.prompt();
    const { outcome } = await event.userChoice;
    setEvent(null);
    if (outcome === 'accepted') {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    return outcome;
  }, [event]);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // localStorage may be unavailable (private mode); fall back to state only.
    }
    setDismissed(true);
    setEvent(null);
  }, []);

  return {
    canInstall: !!event && !dismissed,
    install,
    dismiss,
  };
};
