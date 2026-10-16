const BASE = 'https://api.paystack.co';

export class PaystackError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 502) {
    super(message);
    this.statusCode = statusCode;
  }
}

const getSecretKey = (): string => {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new PaystackError('PAYSTACK_SECRET_KEY is not configured', 500);
  return key;
};

interface PaystackEnvelope<T> {
  status: boolean;
  message: string;
  data: T;
}

const request = async <T>(
  method: 'GET' | 'POST',
  urlPath: string,
  body?: unknown
): Promise<T> => {
  const res = await fetch(BASE + urlPath, {
    method,
    headers: {
      Authorization: 'Bearer ' + getSecretKey(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const envelope = (await res.json()) as PaystackEnvelope<T>;
  if (!res.ok || !envelope.status) {
    throw new PaystackError(envelope.message || 'Paystack request failed', res.status);
  }
  return envelope.data;
};

/**
 * The pieces of an initialise response the frontend needs.
 *
 * access_code is what the inline popup opens with: the backend already
 * initialized the transaction (so the webhook metadata and reference
 * exist before the user sees a form), and the popup just resumes it.
 * authorization_url is kept as a fallback for browsers that block the
 * inline script; the frontend can always redirect to it.
 */
export interface PaystackInitData {
  authorization_url: string;
  access_code: string;
  reference: string;
}

/**
 * Initialise a transaction.
 *
 * Two modes: a plan (subscription - Paystack uses the plan amount and
 * creates a recurring charge on success) or a bare amount (one-off -
 * used for AI credit bundles). Exactly one of plan or amount must be
 * provided; we do not trust both.
 */
export const initializeTransaction = async (params: {
  email: string;
  plan?: string;
  amount?: number;
  callback_url: string;
  metadata?: Record<string, unknown>;
}): Promise<PaystackInitData> => {
  const body: Record<string, unknown> = {
    email: params.email,
    callback_url: params.callback_url,
  };
  if (params.plan) body.plan = params.plan;
  if (typeof params.amount === 'number') body.amount = params.amount;
  if (params.metadata) body.metadata = params.metadata;
  return request<PaystackInitData>('POST', '/transaction/initialize', body);
};

export interface PaystackVerifyData {
  status: string;
  reference: string;
  amount: number;
  currency: string;
  customer: { email: string; customer_code: string };
  plan?: { plan_code: string } | string;
  subscription_code?: string;
  channel?: string;
  paid_at?: string;
}

export const verifyTransaction = async (reference: string): Promise<PaystackVerifyData> =>
  request<PaystackVerifyData>('GET', '/transaction/verify/' + encodeURIComponent(reference));

export const disableSubscription = async (
  subscriptionCode: string,
  emailToken: string
): Promise<void> => {
  await request<unknown>('POST', '/subscription/disable', {
    code: subscriptionCode,
    token: emailToken,
  });
};
