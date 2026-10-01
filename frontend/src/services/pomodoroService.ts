import axios from 'axios';
import { PomodoroSession, PomodoroStats } from '../types/pomodoro';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const headers = (token: string) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});

export const pomodoroService = {
  start: async (
    token: string,
    taskId?: string | null,
    duration?: number
  ): Promise<PomodoroSession> => {
    const response = await axios.post(
      `${API_URL}/api/pomodoro/start`,
      { taskId: taskId ?? null, duration },
      headers(token)
    );
    return response.data;
  },

  complete: async (token: string, sessionId: string): Promise<PomodoroSession> => {
    const response = await axios.post(
      `${API_URL}/api/pomodoro/complete`,
      { sessionId },
      headers(token)
    );
    return response.data;
  },

  /** The in-flight session, so a page refresh does not lose the timer. */
  active: async (token: string): Promise<PomodoroSession | null> => {
    const response = await axios.get(`${API_URL}/api/pomodoro/active`, headers(token));
    return response.data;
  },

  /**
   * Stats are grouped by day in the user's own timezone, so the offset travels
   * with the request - otherwise "today" can be the wrong day for them.
   */
  stats: async (token: string, days = 7): Promise<PomodoroStats> => {
    const response = await axios.get(`${API_URL}/api/pomodoro/stats`, {
      ...headers(token),
      params: { days, timezoneOffset: new Date().getTimezoneOffset() },
    });
    return response.data;
  },
};