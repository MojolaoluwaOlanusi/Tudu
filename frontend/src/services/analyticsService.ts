import axios from 'axios';
import type {
  AnalyticsOverview,
  AnalyticsRange,
  CompletedTasksAnalytics,
  TimeSpentAnalytics,
} from '../types/analytics';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const headers = (token: string) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});

/**
 * Every figure is grouped by the user's own calendar, so the offset travels
 * with the request - otherwise "this week" can be the wrong week for them.
 */
const timezone = () => ({ timezoneOffset: new Date().getTimezoneOffset() });

export const analyticsService = {
  overview: async (token: string): Promise<AnalyticsOverview> => {
    const response = await axios.get(`${API_URL}/api/analytics/overview`, {
      ...headers(token),
      params: timezone(),
    });
    return response.data;
  },

  completedTasks: async (
    token: string,
    range: AnalyticsRange
  ): Promise<CompletedTasksAnalytics> => {
    const response = await axios.get(`${API_URL}/api/analytics/completed-tasks`, {
      ...headers(token),
      params: { range, ...timezone() },
    });
    return response.data;
  },

  timeSpent: async (
    token: string,
    range: AnalyticsRange
  ): Promise<TimeSpentAnalytics> => {
    const response = await axios.get(`${API_URL}/api/analytics/time-spent`, {
      ...headers(token),
      params: { range, ...timezone() },
    });
    return response.data;
  },
};