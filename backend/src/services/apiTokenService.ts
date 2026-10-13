import crypto from 'node:crypto';

/** A recognisable prefix so a leaked token is easy to spot in logs. */
export const TOKEN_PREFIX = 'tudu_pat_';

/**
 * Hash a token for storage or lookup.
 *
 * The pepper is a server-only secret; storing sha256(pepper + token)
 * means an attacker with read access to the database cannot brute-force
 * tokens without also holding the pepper, which lives in env.
 */
export const hashToken = (plaintext: string): string => {
  const pepper = process.env.API_TOKEN_HASH_PEPPER ?? '';
  return crypto
    .createHash('sha256')
    .update(pepper + plaintext)
    .digest('hex');
};

/**
 * Create a new token. Returns the plaintext (to show the user exactly once)
 * alongside the hash and prefix that get persisted.
 */
export const generateToken = (): {
  plaintext: string;
  hash: string;
  prefix: string;
} => {
  const random = crypto.randomBytes(24).toString('hex');
  const plaintext = TOKEN_PREFIX + random;
  return {
    plaintext,
    hash: hashToken(plaintext),
    prefix: plaintext.slice(0, TOKEN_PREFIX.length + 8),
  };
};

/** True when a string looks like a token we issued, before any DB lookup. */
export const looksLikeToken = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(TOKEN_PREFIX) && value.length >= 40;
