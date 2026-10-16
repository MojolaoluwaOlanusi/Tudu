import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export interface PublicKeyResponse {
  configured: boolean;
  publicKey: string | null;
}

/**
 * Convert a base64url VAPID key into the buffer that
 * pushManager.subscribe expects.
 *
 * Returns an ArrayBuffer rather than a Uint8Array: as of TypeScript 5.7
 * `Uint8Array` is generic over its buffer type, and the widened
 * `Uint8Array<ArrayBufferLike>` no longer satisfies `BufferSource`.
 * The underlying ArrayBuffer is what the browser actually wants.
 */
const urlBase64ToUint8Array = (base64: string): ArrayBuffer => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const normalised = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(normalised);
  const buffer = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) buffer[i] = raw.charCodeAt(i);
  return buffer.buffer as ArrayBuffer;
};

export const pushService = {
  getPublicKey: async (): Promise<PublicKeyResponse> =>
    (await axios.get(API_URL + '/api/push/public-key')).data,

  subscribe: async (
    token: string,
    sub: PushSubscriptionJSON
  ): Promise<void> => {
    await axios.post(API_URL + '/api/push/subscribe', sub, { headers: auth(token) });
  },

  unsubscribe: async (token: string, endpoint: string): Promise<void> => {
    await axios.delete(API_URL + '/api/push/subscribe', {
      headers: auth(token),
      data: { endpoint },
    });
  },

  urlBase64ToUint8Array,
};
