import axios from 'axios';

/**
 * Global axios configuration for offline resilience.
 *
 * Without a timeout, a request sent while the network is off but
 * navigator.onLine is still true hangs for the OS-level TCP timeout
 * (30-90 seconds on most systems). That leaves the mutation pending,
 * the submit button stuck on "Creating…", and the offline queue with
 * nothing to capture.
 *
 * 10s is generous for a healthy server, tight enough to fail fast
 * when the network is truly gone.
 */
axios.defaults.timeout = 10_000;

/**
 * When the browser reports it is offline, fail immediately instead of
 * waiting for the OS to notice. The offline queue captures the
 * operation from the resulting TypeError.
 */
axios.interceptors.request.use((config) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.reject(new TypeError('Network Error'));
  }
  return config;
});
