import pool from '../config/database';
import { FEATURES, type FeatureKey, type Tier } from '../config/features';

export interface Entitlements {
  tier: Tier;
  aiCreditsRemaining: number;
  features: Record<FeatureKey, boolean>;
  subscription?: {
    planCode: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
}

/**
 * Read the caller's entitlements.
 *
 * The tier is derived from the subscription status, never stored as its
 * own column: an active subscription is what makes a user Pro, and
 * cancelling clears it. That way there is exactly one source of truth.
 */
export const getEntitlements = async (userId: string): Promise<Entitlements> => {
  const sub = await pool.query(
    'SELECT s.plan_code, s.status, s.current_period_end, s.cancel_at_period_end, ' +
      '       p.ai_credits ' +
      'FROM subscriptions s ' +
      'JOIN plans p ON p.code = s.plan_code ' +
      'WHERE s.user_id = $1 AND s.status = \'active\' ' +
      'LIMIT 1',
    [userId]
  );

  const active = sub.rows[0] as
    | { plan_code: string; status: string; current_period_end: Date | null; cancel_at_period_end: boolean; ai_credits: number }
    | undefined;

  const tier: Tier = active ? 'pro' : 'free';

  let aiCreditsRemaining = 0;
  if (active) {
    const ledger = await pool.query(
      'SELECT COALESCE(SUM(delta), 0)::int AS balance FROM ai_credit_ledger WHERE user_id = $1',
      [userId]
    );
    aiCreditsRemaining = Math.max(0, ledger.rows[0].balance);
  }

  const features = Object.keys(FEATURES).reduce((acc, key) => {
    const k = key as FeatureKey;
    acc[k] = FEATURES[k][tier];
    return acc;
  }, {} as Record<FeatureKey, boolean>);

  return {
    tier,
    aiCreditsRemaining,
    features,
    subscription: active
      ? {
          planCode: active.plan_code,
          status: active.status,
          currentPeriodEnd: active.current_period_end
            ? active.current_period_end.toISOString()
            : null,
          cancelAtPeriodEnd: active.cancel_at_period_end,
        }
      : undefined,
  };
};
