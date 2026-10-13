import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface PublicStats {
  status: string;
  uptime_seconds: number;
  version: string;
}

export interface DemoSession {
  token: string;
  user: { id: string; email: string; name: string | null };
  board_id: string;
  expires_in: string;
}

export const publicService = {
  getStats: async (): Promise<PublicStats> =>
    (await axios.get(`${API_URL}/api/public/stats`)).data,

  startDemo: async (): Promise<DemoSession> =>
    (await axios.post(`${API_URL}/api/public/demo`)).data,
};
