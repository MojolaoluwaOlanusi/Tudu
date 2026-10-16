import { useCallback, useEffect, useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { pushService } from '../services/pushService';

export type PushSupport = 'unsupported' | 'denied' | 'subscribed' | 'available';

export interface PushState {
  support: PushSupport;
  loading: boolean;
  serverConfigured: boolean;
}

export const usePushNotifications = (): PushState & {
  enable: () => Promise<void>;
  disable: () => Promise<void>;
} => {
  const { token } = useAuthStore();
  const [support, setSupport] = useState<PushSupport>('unsupported');
  const [loading, setLoading] = useState(true);
  const [serverConfigured, setServerConfigured] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
        setSupport('unsupported');
        return;
      }

      const key = await pushService.getPublicKey();
      setServerConfigured(!!key.configured && !!key.publicKey);

      if (Notification.permission === 'denied') {
        setSupport('denied');
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSupport(sub ? 'subscribed' : 'available');
    } catch {
      setSupport('unsupported');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const enable = useCallback(async () => {
    if (!token) return;
    const key = await pushService.getPublicKey();
    if (!key.configured || !key.publicKey) throw new Error('Push is not configured on the server');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setSupport('denied');
      throw new Error('Notification permission was not granted');
    }

    const registration = await navigator.serviceWorker.ready;
    const existing = await registration.pushManager.getSubscription();
    const sub =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: pushService.urlBase64ToUint8Array(key.publicKey),
      }));

    await pushService.subscribe(token, sub.toJSON());
    setSupport('subscribed');
  }, [token]);

  const disable = useCallback(async () => {
    if (!token) return;
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) {
      setSupport('available');
      return;
    }
    await pushService.unsubscribe(token, sub.endpoint);
    await sub.unsubscribe();
    setSupport('available');
  }, [token]);

  return { support, loading, serverConfigured, enable, disable };
};
