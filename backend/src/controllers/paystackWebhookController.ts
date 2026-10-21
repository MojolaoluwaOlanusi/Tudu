import crypto from 'node:crypto';
import { Request, Response } from 'express';
import pool from '../config/database';

interface PaystackEvent {
  event: string;
  data: Record<string, unknown>;
}

/**
 * Verify the HMAC-SHA512 signature Paystack sends in x-paystack-signature.
 *
 * The signature is over the RAW body bytes. req.body must still be a
 * Buffer when this runs; the route is registered with express.raw()
 * BEFORE the global express.json() middleware, which is what keeps the
 * bytes intact.
 */
const isValidSignature = (rawBody: Buffer, signature: unknown): boolean => {
  const secret = process.env.PAYSTACK_SECRET_KEY;
  if (!secret) return false;
  if (typeof signature !== 'string' || signature.length === 0) return false;

  const expected = crypto.createHmac('sha512', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Handle charge.success.
 *
 * Two paths: subscription charges (plan-based) are just recorded here,
 * because subscription.create does the rest. One-off purchases
 * (purpose=ai_credits) also grant the credits to the ledger.
 *
 * Idempotent per reference. The payments INSERT uses ON CONFLICT DO
 * NOTHING, and the credits are granted only when the INSERT actually
 * happened - a retried webhook finds the row already there and skips
 * the grant.
 */
const handleChargeSuccess = async (data: Record<string, unknown>) => {
  const reference = data.reference as string | undefined;
  const amount = typeof data.amount === 'number' ? data.amount : 0;
  const status = (data.status as string) ?? 'success';
  const channel = (data.channel as string) ?? null;
  const currency = (data.currency as string) ?? 'NGN';
  const metadata = (data.metadata as Record<string, unknown>) ?? {};
  const userId = metadata.userId as string | undefined;
  const purpose = (metadata.purpose as string) ?? 'subscription';
  const credits = typeof metadata.credits === 'number' ? metadata.credits : 0;

  if (!reference || !userId) {
    console.error('charge.success missing reference or userId', data);
    return;
  }

  const inserted = await pool.query(
    'INSERT INTO payments (user_id, reference, amount_kobo, currency, status, channel, purpose, raw) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ' +
      'ON CONFLICT (reference) DO NOTHING ' +
      'RETURNING id',
    [userId, reference, amount, currency, status, channel, purpose, JSON.stringify(data)]
  );

  // If the row already existed, this is a retry - nothing left to do.
  if (inserted.rows.length === 0) return;

  if (purpose === 'ai_credits' && credits > 0) {
    await pool.query(
      'INSERT INTO ai_credit_ledger (user_id, delta, reason) VALUES ($1, $2, $3)',
      [userId, credits, 'credit_purchase']
    );
  }

  if (purpose === 'template_purchase') {
    const templateId = metadata.template_id as string | undefined;
    if (templateId) {
      await pool.query(
        `UPDATE template_purchases p
         SET status = 'success', 
             expires_at = CASE WHEN (SELECT rental_days FROM marketplace_templates WHERE id = $2) > 0 
                               THEN NOW() + (SELECT rental_days * INTERVAL '1 day' FROM marketplace_templates WHERE id = $2) 
                               ELSE NULL END,
             version_bought = (SELECT version FROM marketplace_templates WHERE id = $2),
             price_paid_kobo = (SELECT price_kobo FROM marketplace_templates WHERE id = $2),
             rental_days_paid = (SELECT rental_days FROM marketplace_templates WHERE id = $2),
             updated_at = NOW()
         WHERE p.reference = $1 AND p.status = 'pending'`,
        [reference, templateId]
      );
    }
  }
};

const handleSubscriptionCreate = async (data: Record<string, unknown>) => {
  const customer = (data.customer as Record<string, unknown>) ?? {};
  const customerCode = customer.customer_code as string | undefined;
  const email = customer.email as string | undefined;
  const subscriptionCode = data.subscription_code as string | undefined;
  const emailToken = data.email_token as string | undefined;
  const planObj = data.plan as Record<string, unknown> | undefined;
  const paystackPlanCode = planObj?.plan_code as string | undefined;
  const nextPaymentDate = data.next_payment_date as string | undefined;

  if (!email || !subscriptionCode) {
    console.error('subscription.create missing email or code', data);
    return;
  }

  const userRow = await pool.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  if (userRow.rows.length === 0) {
    console.error('subscription.create for unknown email', email);
    return;
  }
  const userId: string = userRow.rows[0].id;

  const planRow = await pool.query(
    'SELECT code, ai_credits FROM plans WHERE paystack_plan_code = $1 LIMIT 1',
    [paystackPlanCode]
  );
  const plan = planRow.rows[0] ?? (await pool.query(
    'SELECT code, ai_credits FROM plans WHERE code = \'pro_monthly\' LIMIT 1'
  )).rows[0];

  if (!plan) {
    console.error('subscription.create but no local plan exists');
    return;
  }

  const periodEnd = nextPaymentDate ? new Date(nextPaymentDate) : new Date(Date.now() + 30 * 24 * 3600 * 1000);

  await pool.query(
    'UPDATE subscriptions SET status = \'cancelled\', updated_at = NOW() ' +
      'WHERE user_id = $1 AND status = \'active\'',
    [userId]
  );

  await pool.query(
    'INSERT INTO subscriptions ' +
      '(user_id, plan_code, status, paystack_subscription_code, ' +
      ' paystack_customer_code, paystack_email_token, current_period_end, cancel_at_period_end) ' +
      'VALUES ($1, $2, \'active\', $3, $4, $5, $6, FALSE)',
    [userId, plan.code, subscriptionCode, customerCode ?? null, emailToken ?? null, periodEnd]
  );

  await pool.query(
    'INSERT INTO ai_credit_ledger (user_id, delta, reason) VALUES ($1, $2, \'subscription_grant\')',
    [userId, plan.ai_credits]
  );
};

const handleSubscriptionDisable = async (data: Record<string, unknown>) => {
  const subscriptionCode = data.subscription_code as string | undefined;
  if (!subscriptionCode) return;

  await pool.query(
    'UPDATE subscriptions SET status = \'cancelled\', updated_at = NOW() ' +
      'WHERE paystack_subscription_code = $1',
    [subscriptionCode]
  );
};

const handleInvoicePaymentFailed = async (data: Record<string, unknown>) => {
  const subscriptionObj = data.subscription as Record<string, unknown> | undefined;
  const subscriptionCode = subscriptionObj?.subscription_code as string | undefined;
  if (!subscriptionCode) return;

  await pool.query(
    'UPDATE subscriptions SET status = \'past_due\', updated_at = NOW() ' +
      'WHERE paystack_subscription_code = $1',
    [subscriptionCode]
  );
};

export const handleWebhook = async (req: Request, res: Response) => {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw)) {
    console.error('Webhook body is not a raw Buffer. Check the route mount order.');
    return res.status(500).json({ error: 'Webhook body not captured' });
  }

  const signature = req.headers['x-paystack-signature'];
  if (!isValidSignature(raw, signature)) {
    console.error('Webhook signature mismatch');
    return res.status(401).json({ error: 'Invalid signature' });
  }

  let event: PaystackEvent;
  try {
    event = JSON.parse(raw.toString()) as PaystackEvent;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  try {
    switch (event.event) {
      case 'charge.success':
        await handleChargeSuccess(event.data);
        break;
      case 'subscription.create':
        await handleSubscriptionCreate(event.data);
        break;
      case 'subscription.disable':
        await handleSubscriptionDisable(event.data);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data);
        break;
      default:
        break;
    }
  } catch (error) {
    console.error('Error handling Paystack event', event.event, error);
  }

  res.json({ received: true });
};
