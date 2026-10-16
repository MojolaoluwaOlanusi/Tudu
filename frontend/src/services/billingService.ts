import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export type Tier = 'free' | 'pro' | 'enterprise';

export interface Entitlements {
  tier: Tier;
  aiCreditsRemaining: number;
  features: Record<string, boolean>;
  subscription?: {
    planCode: string;
    status: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
}

export interface CheckoutResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
  amount_kobo: number;
  currency: string;
}

export interface Payment {
  id: string;
  reference: string;
  amount_kobo: number;
  currency: string;
  status: string;
  channel: string | null;
  purpose: string;
  created_at: string;
}

export const billingService = {
  getEntitlements: async (token: string): Promise<Entitlements> =>
    (await axios.get(API_URL + '/api/billing/subscription', { headers: auth(token) })).data,

  createCheckout: async (
    token: string,
    plan: 'pro_monthly' | 'pro_yearly'
  ): Promise<CheckoutResponse> =>
    (
      await axios.post(
        API_URL + '/api/billing/checkout',
        { plan },
        { headers: auth(token) }
      )
    ).data,

  cancel: async (token: string): Promise<void> => {
    await axios.post(API_URL + '/api/billing/cancel', {}, { headers: auth(token) });
  },

  history: async (token: string): Promise<Payment[]> =>
    (await axios.get(API_URL + '/api/billing/history', { headers: auth(token) })).data,
};
