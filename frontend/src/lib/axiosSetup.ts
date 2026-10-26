import axios from 'axios';
import { useAuthStore } from '../store/authStore';

/**
 * Global axios configuration.
 *
 * Two interceptors:
 *  - request: fail fast when the browser says we are offline, so the offline
 *    queue captures the mutation instead of waiting on an OS TCP timeout.
 *  - response: when a JWT-authenticated call returns 401, the token has
 *    expired (or been revoked). Log out and redirect to /login so the user
 *    gets a re-auth screen instead of an SPA that silently stops working.
 *
 * The 401 paths below are deliberately NOT treated as session expiry:
 *   /auth/login, /auth/register  - 401 means bad credentials, not expired.
 *   /api/v1/*                    - personal access token, not the user's JWT.
 *   /api/public/*                - unauthenticated endpoints.
 *   *webhook*                    - HMAC-gated routes (Paystack, GitHub).
 *   /api/reminders/run           - cron secret, no user session.
 */

axios.defaults.timeout = 10_000;

axios.interceptors.request.use((config) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.reject(new TypeError('Network Error'));
  }
  return config;
});

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status !== 401) return Promise.reject(error);

    const url = String(error.config?.url ?? '');
    const pathname =
      typeof window !== 'undefined' ? window.location.pathname : '';

    if (
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/api/v1/') ||
      url.includes('/api/public/') ||
      url.includes('/webhook') ||
      url.includes('/api/reminders/')
    ) {
      return Promise.reject(error);
    }

    // Genuine session expiry. Clear the persisted store so a reload does
    // not restore a dead token from localStorage.
    useAuthStore.getState().logout();

    if (typeof window !== 'undefined' && pathname !== '/login') {
      window.location.href = '/login?error=session_expired';
    }

    return Promise.reject(error);
  },
);