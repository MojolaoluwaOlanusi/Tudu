import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface SeedResult {
  board_id: string;
  template: string;
}

export const onboardingService = {
  /** Rewrite the caller's first personal board to match a template. */
  seed: async (token: string, template: string): Promise<SeedResult> =>
    (await axios.post(`${API_URL}/api/onboarding/seed`, { template }, { headers: auth(token) }))
      .data,
};
