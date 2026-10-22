import axios from 'axios';
import type { CreateManualEntry, TimeEntry, TimeReport } from '../types/time';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export interface EntryPage {
  items: TimeEntry[];
  total: number;
  limit: number;
  offset: number;
}

export const timeService = {
  getActive: async (token: string): Promise<TimeEntry | null> =>
    (await axios.get(API_URL + '/api/time/active', { headers: auth(token) })).data,

  start: async (
    token: string,
    body: { taskId?: string | null; description?: string | null; billable?: boolean }
  ): Promise<TimeEntry> =>
    (await axios.post(API_URL + '/api/time/start', body, { headers: auth(token) })).data,

  stop: async (token: string): Promise<TimeEntry> =>
    (await axios.post(API_URL + '/api/time/stop', {}, { headers: auth(token) })).data,

  listEntries: async (
    token: string,
    params: { limit?: number; offset?: number; taskId?: string; from?: string; to?: string } = {}
  ): Promise<EntryPage> =>
    (await axios.get(API_URL + '/api/time/entries', { headers: auth(token), params })).data,

  createManual: async (token: string, body: CreateManualEntry): Promise<TimeEntry> =>
    (await axios.post(API_URL + '/api/time/entries', body, { headers: auth(token) })).data,

  deleteEntry: async (token: string, id: string): Promise<void> => {
    await axios.delete(API_URL + '/api/time/entries/' + id, { headers: auth(token) });
  },

  report: async (
    token: string,
    range: 'week' | 'month' | 'quarter'
  ): Promise<TimeReport> =>
    (
      await axios.get(API_URL + '/api/time/report', {
        headers: auth(token),
        params: { range, timezoneOffset: new Date().getTimezoneOffset() },
      })
    ).data,
};
