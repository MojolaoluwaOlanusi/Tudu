import axios from 'axios';
import { ParsedTaskText } from '../types/nlp';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const nlpService = {
  /**
   * Ask the server how it would interpret a sentence.
   *
   * The browser's clock and timezone offset travel with the request so that
   * "tomorrow at 9am" means 9am for the user, wherever they are.
   */
  parseTaskText: async (token: string, text: string): Promise<ParsedTaskText> => {
    const response = await axios.post(
      `${API_URL}/api/tasks/parse`,
      {
        text,
        now: new Date().toISOString(),
        timezoneOffset: new Date().getTimezoneOffset(),
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  },
};