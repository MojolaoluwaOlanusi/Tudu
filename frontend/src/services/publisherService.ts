import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export interface PublisherProfile {
  exists: boolean;
  business_name?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  payout_status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Bank {
  code: string;
  name: string;
}

export const publisherService = {
  getProfile: async (token: string): Promise<PublisherProfile> =>
    (await axios.get(API_URL + '/api/publisher/profile', { headers: auth(token) })).data,

  saveProfile: async (
    token: string,
    data: { business_name: string; bank_code: string; account_number: string }
  ): Promise<{ ok: boolean; payout_status: string; bank_name: string; account_name: string }> =>
    (
      await axios.post(API_URL + '/api/publisher/profile', data, { headers: auth(token) })
    ).data,

  listBanks: async (token: string): Promise<Bank[]> =>
    (await axios.get(API_URL + '/api/publisher/banks', { headers: auth(token) })).data,
};
