import axios from 'axios';
import type { SortKey, SortOrder } from '../store/filterStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

export interface UserPreferences {
  default_sort?: SortKey;
  default_order?: SortOrder;
}

export const userPreferencesService = {
  get: async (token: string): Promise<UserPreferences> =>
    (await axios.get(`${API_URL}/api/users/me/preferences`, { headers: auth(token) })).data,

  patch: async (token: string, patch: UserPreferences): Promise<UserPreferences> =>
    (
      await axios.put(`${API_URL}/api/users/me/preferences`, patch, { headers: auth(token) })
    ).data,
};
