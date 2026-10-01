import axios from 'axios';
import { AiStatus, BreakdownResult } from '../types/ai';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const headers = (token: string) => ({
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
});

/** Pull the server's message out of an axios error so the UI can show it. */
export const getAiErrorMessage = (error: unknown): string => {
  const axiosError = error as {
    response?: { status?: number; data?: { error?: string } };
    message?: string;
  };

  if (axiosError?.response?.status === 429) {
    return 'Too many requests — wait a moment and try again.';
  }
  if (axiosError?.response?.data?.error) return axiosError.response.data.error;
  if (axiosError?.message) return axiosError.message;
  return 'Something went wrong generating the breakdown.';
};

export const aiService = {
  /** Which provider the server is using, and whether it has credentials. */
  getStatus: async (token: string): Promise<AiStatus> => {
    const response = await axios.get(`${API_URL}/api/ai/status`, headers(token));
    return response.data;
  },

  /** Ask the AI to break a task title into sub-tasks. */
  breakdown: async (
    token: string,
    title: string,
    count?: number
  ): Promise<BreakdownResult> => {
    const response = await axios.post(
      `${API_URL}/api/ai/breakdown`,
      { title, count },
      headers(token)
    );
    return response.data;
  },
};