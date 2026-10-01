import axios from 'axios';
import { PagedActivity } from '../types/activity';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface ActivityFilters {
  limit?: number;
  offset?: number;
  taskId?: string;
  /** ISO date strings. */
  from?: string;
  to?: string;
}

const authHeaders = (token: string) => ({
  headers: { Authorization: `Bearer ${token}` },
});

export const activityService = {
  /** My activity feed, optionally filtered by task and/or date range. */
  getActivity: async (
    token: string,
    filters: ActivityFilters = {}
  ): Promise<PagedActivity> => {
    const response = await axios.get(`${API_URL}/api/activity`, {
      ...authHeaders(token),
      params: {
        ...(filters.limit ? { limit: filters.limit } : {}),
        ...(filters.offset ? { offset: filters.offset } : {}),
        ...(filters.taskId ? { taskId: filters.taskId } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {}),
      },
    });
    return response.data;
  },

  /** My activity on one specific task. */
  getTaskActivity: async (
    token: string,
    taskId: string,
    limit = 10
  ): Promise<PagedActivity> => {
    const response = await axios.get(`${API_URL}/api/activity/${taskId}`, {
      ...authHeaders(token),
      params: { limit },
    });
    return response.data;
  },
};