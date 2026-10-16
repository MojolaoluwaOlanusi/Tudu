/**
 * Runtime mode detection.
 *
 * A single env var switches the app between two shapes:
 *
 *   cloud        (default) - hosted on Vercel + Render, users sign up,
 *                            subscriptions come from Paystack, and this
 *                            instance issues licenses for self-hosters.
 *
 *   self_hosted           - runs on the customer's own server. There is
 *                            no Paystack, no subscription; a signed
 *                            license file on disk grants the tier.
 *
 * The mode changes only two things at runtime: where entitlements come
 * from, and which license endpoints are mounted. Everything else - auth,
 * tasks, boards - is identical.
 */
export type TuduMode = 'cloud' | 'self_hosted';

export const getMode = (): TuduMode =>
  process.env.TUDU_MODE === 'self_hosted' ? 'self_hosted' : 'cloud';

export const isSelfHosted = (): boolean => getMode() === 'self_hosted';
