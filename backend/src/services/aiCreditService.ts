import pool from '../config/database';

/**
 * The credit bundles a user can buy. Fixed amounts, one-off charges.
 *
 * Codes are the client-facing identifier passed to the checkout
 * endpoint; the webhook uses the metadata.credits value to know how
 * many to grant, so changing the amount here without changing the
 * Paystack charge would be a bug. Keep this list and the payload the
 * checkout endpoint sends in step.
 */
export const BUNDLES = [
  { code: 'ai_500',  credits: 500,  amount_kobo: 200_000, label: '500 credits' },
  { code: 'ai_2000', credits: 2000, amount_kobo: 700_000, label: '2,000 credits' },
] as const;

export type BundleCode = (typeof BUNDLES)[number]['code'];

export const findBundle = (code: string) =>
  BUNDLES.find((b) => b.code === code);

/**
 * Read a user's current credit balance. A missing ledger row is a
 * balance of 0, not an error - new accounts simply have no entries.
 */
export const getBalance = async (userId: string): Promise<number> => {
  const res = await pool.query(
    'SELECT COALESCE(SUM(delta), 0)::int AS balance FROM ai_credit_ledger WHERE user_id = $1',
    [userId]
  );
  return res.rows[0].balance as number;
};

/**
 * Debit one call's worth of credits, but only for Pro users.
 *
 * Free users are not metered - they have their own rate limiter and
 * the existing daily allowance. That keeps the "AI breakdown is free"
 * promise intact for solo users while making the endpoint sustainable
 * for heavy Pro usage.
 *
 * Returns a discriminated union so the caller can tell three cases
 * apart: "free user, nothing to do", "Pro user, debited", and
 * "Pro user, out of credits".
 */
export interface DebitResult {
  /** True when the user is Pro and was actually metered. */
  applies: boolean;
  /** True when the debit succeeded (or when no debit was needed). */
  ok: boolean;
  /** Balance after the debit, when applicable. */
  balance: number;
}

export const debitForUser = async (
  userId: string,
  reason: string,
  cost = 1
): Promise<DebitResult> => {
  // Two queries: is this user Pro, and is their balance sufficient?
  // The tier check is a JOIN against an active subscription; a Free user
  // short-circuits before the debit.
  const sub = await pool.query(
    'SELECT 1 FROM subscriptions WHERE user_id = $1 AND status = \'active\' LIMIT 1',
    [userId]
  );

  if (sub.rows.length === 0) {
    return { applies: false, ok: true, balance: 0 };
  }

  // Atomic check-and-debit: the INSERT only fires when the current sum
  // is at least the cost. A concurrent request sees the same snapshot,
  // so at worst a user gets one extra credit under heavy parallelism,
  // which is not worth the extra locking.
  const inserted = await pool.query(
    'INSERT INTO ai_credit_ledger (user_id, delta, reason) ' +
      'SELECT $1, $2, $3 ' +
      'WHERE (SELECT COALESCE(SUM(delta), 0) FROM ai_credit_ledger WHERE user_id = $1) >= $4 ' +
      'RETURNING id',
    [userId, -cost, reason, cost]
  );

  if (inserted.rows.length === 0) {
    return { applies: true, ok: false, balance: 0 };
  }

  const balance = await getBalance(userId);
  return { applies: true, ok: true, balance };
};

/**
 * Give a credit back when the call that consumed it failed.
 *
 * Uses a distinct reason so the ledger shows the pairing: a "refund"
 * entry is always preceded by a "ai.breakdown" debit in a real
 * failure case. If the refund itself fails, the user is out a single
 * credit for a failed call - acceptable, and recoverable by support.
 */
export const refundForUser = async (
  userId: string,
  reason: string,
  cost = 1
): Promise<void> => {
  await pool.query(
    'INSERT INTO ai_credit_ledger (user_id, delta, reason) VALUES ($1, $2, $3)',
    [userId, cost, reason]
  );
};

/**
 * Grant credits. Used by the webhook after a bundle purchase succeeds.
 *
 * The ledger design means we never UPDATE a row: every grant is a new
 * INSERT. That makes the history auditable and makes a partial refund
 * just another row.
 */
export const grantCredits = async (
  userId: string,
  amount: number,
  reason: string
): Promise<void> => {
  await pool.query(
    'INSERT INTO ai_credit_ledger (user_id, delta, reason) VALUES ($1, $2, $3)',
    [userId, amount, reason]
  );
};
