const KEY = 'tudu.login.from';

/**
 * Remember where the user was trying to go when they were bounced to
 * /login. sessionStorage is per-tab and survives the OAuth round-trip
 * (same origin), so this works for both email sign-in and Google/GitHub.
 */
export const rememberPostLoginDestination = (path: string): void => {
  if (!path || path === '/') return;
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    /* private mode or storage full — fall back to '/' on next login */
  }
};

/**
 * Read (and clear) the remembered destination. Returns '/' when there is
 * nothing stored, so a normal sign-in from a bookmarked /login lands on
 * the dashboard.
 */
export const consumePostLoginDestination = (): string => {
  try {
    const stored = sessionStorage.getItem(KEY);
    if (stored) sessionStorage.removeItem(KEY);
    return stored || '/';
  } catch {
    return '/';
  }
};