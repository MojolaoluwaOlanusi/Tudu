import { Request, Response } from 'express';
import pool from '../config/database';
import {
  initializeTransaction,
  disableSubscription,
  PaystackError,
} from '../services/paystackService';
import { getEntitlements } from '../services/entitlementService';

const findPlan = async (code: string) => {
  const res = await pool.query(
    'SELECT code, name, interval, amount_kobo, currency, paystack_plan_code ' +
      'FROM plans WHERE code = $1',
    [code]
  );
  return res.rows[0] as
    | { code: string; name: string; interval: string; amount_kobo: number; currency: string; paystack_plan_code: string | null }
    | undefined;
};

/**
 * POST /api/billing/checkout - body: { plan }.
 *
 * Returns the access_code the inline popup opens with, the reference for
 * the success callback, and the authorization_url as a redirect fallback.
 * The actual charge is in NGN regardless of what the frontend displays;
 * the display currency is a UX layer, not a billing one.
 */
export const checkout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const email = req.user?.email;
    if (!userId || !email) return res.status(401).json({ error: 'Unauthorized' });

    const rawPlan = (req.body ?? {}).plan;
    if (typeof rawPlan !== 'string') {
      return res.status(400).json({ error: 'plan is required' });
    }

    const plan = await findPlan(rawPlan);
    if (!plan) return res.status(404).json({ error: 'Plan not found' });

    const paystackPlanCode =
      plan.code === 'pro_monthly'
        ? process.env.PAYSTACK_PLAN_PRO_MONTHLY
        : plan.code === 'pro_yearly'
          ? process.env.PAYSTACK_PLAN_PRO_YEARLY
          : null;

    if (!paystackPlanCode) {
      return res.status(500).json({ error: 'Plan is not linked to Paystack' });
    }

    const appUrl = process.env.APP_URL ?? 'http://localhost:5173';

    const init = await initializeTransaction({
      email,
      plan: paystackPlanCode,
      callback_url: appUrl + '/billing/callback',
      metadata: { userId, plan_code: plan.code },
    });

    res.json({
      authorization_url: init.authorization_url,
      access_code: init.access_code,
      reference: init.reference,
      amount_kobo: plan.amount_kobo,
      currency: plan.currency,
    });
  } catch (error) {
    if (error instanceof PaystackError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Error creating checkout:', error);
    res.status(500).json({ error: 'Failed to start checkout' });
  }
};

export const getSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const ent = await getEntitlements(userId);
    res.json(ent);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
};

/**
 * POST /api/billing/cancel.
 *
 * Paystack is told to stop the next charge; the local flag records that
 * cancellation was requested. The subscription row stays active so the
 * user keeps what they paid for until the period actually ends.
 */
export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const sub = await pool.query(
      'SELECT id, paystack_subscription_code, paystack_email_token ' +
        'FROM subscriptions WHERE user_id = $1 AND status = \'active\' LIMIT 1',
      [userId]
    );
    if (sub.rows.length === 0) {
      return res.status(404).json({ error: 'No active subscription' });
    }

    const row = sub.rows[0] as {
      id: string;
      paystack_subscription_code: string | null;
      paystack_email_token: string | null;
    };

    if (row.paystack_subscription_code && row.paystack_email_token) {
      await disableSubscription(row.paystack_subscription_code, row.paystack_email_token);
    }

    await pool.query(
      'UPDATE subscriptions SET cancel_at_period_end = TRUE, updated_at = NOW() ' +
        'WHERE id = $1',
      [row.id]
    );

    res.json({ message: 'Subscription will cancel at the end of the period' });
  } catch (error) {
    if (error instanceof PaystackError) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error('Error cancelling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
};

export const getPaymentHistory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT id, reference, amount_kobo, currency, status, channel, purpose, created_at ' +
        'FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
};
