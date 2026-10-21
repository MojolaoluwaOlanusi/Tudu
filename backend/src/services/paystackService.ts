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
/**
 * Initialise a transaction.
 *
 * Modes:
 *   - plan            subscription (Paystack uses the plan amount)
 *   - amount alone    one-off (AI credit bundles)
 *   - amount + subaccount  one-off split (paid template purchases)
 *
 * subaccount is the publisher profile's ACCT_ code. The split percentage
 * is taken from that subaccount (30% to Tudu, 70% to publisher - see
 * publisherController for the percentage_charge direction).
 */
export const initializeTransaction = async (params: {
  email: string;
  plan?: string;
  amount?: number;
  callback_url: string;
  metadata?: Record<string, unknown>;
  subaccount?: string;
  bearer?: 'account' | 'subaccount';
}): Promise<PaystackInitData> => {
  const body: Record<string, unknown> = {
    email: params.email,
    callback_url: params.callback_url,
  };
  if (params.plan) body.plan = params.plan;
  if (typeof params.amount === 'number') body.amount = params.amount;
  if (params.metadata) body.metadata = params.metadata;
  if (params.subaccount) body.subaccount = params.subaccount;
  if (params.bearer) body.bearer = params.bearer;
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


/* ------------------------------------------------------------------ */
/* Subaccounts and banks - paid template payouts                       */
/* ------------------------------------------------------------------ */

export interface PaystackSubaccountData {
  subaccount_code: string;
  business_name: string;
  account_number: string;
  account_name: string;
  bank: number;
  currency: string;
  percentage_charge: number;
}

/**
 * Create a subaccount.
 *
 * percentage_charge is the amount the parent account (Tudu) takes from
 * the subaccount owner's settlement. 30 means Tudu gets 30% and the
 * publisher gets 70%. If Paystack reverses this at any point, change
 * the value here (and only here).
 */
export const createSubaccount = async (params: {
  business_name: string;
  bank_code: string;
  account_number: string;
  percentage_charge: number;
  description?: string;
}): Promise<PaystackSubaccountData> =>
  request<PaystackSubaccountData>('POST', '/subaccount', {
    business_name: params.business_name,
    bank_code: params.bank_code,
    account_number: params.account_number,
    percentage_charge: params.percentage_charge,
    description: params.description,
  });

export interface PaystackBank {
  id: number;
  name: string;
  code: string;
  slug: string;
  country: string;
  currency: string;
  type: string;
}

export const listBanks = async (): Promise<PaystackBank[]> =>
  request<PaystackBank[]>('GET', '/bank?country=nigeria&currency=NGN');

export interface PaystackRefundData {
  id: number;
  status: string;
  amount: number;
  reference: string;
  transaction: { reference: string };
}

export const refundTransaction = async (reference: string): Promise<PaystackRefundData> =>
  request<PaystackRefundData>('POST', '/refund', { transaction: reference });
