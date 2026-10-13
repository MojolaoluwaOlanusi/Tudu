import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export interface ApiToken {
  id: string;
  label: string;
  token_prefix: string;
  last_used_at: string | null;
  created_at: string;
  /** Only present in the response from create(); never returned again. */
  plaintext?: string;
}

export const apiTokenService = {
  list: async (token: string): Promise<ApiToken[]> =>
    (await axios.get(API_URL + '/api/tokens', { headers: auth(token) })).data,

  create: async (token: string, label: string): Promise<ApiToken> =>
    (
      await axios.post(
        API_URL + '/api/tokens',
        { label },
        { headers: auth(token) }
      )
    ).data,

  revoke: async (token: string, id: string): Promise<void> => {
    await axios.delete(API_URL + '/api/tokens/' + id, { headers: auth(token) });
  },
};
