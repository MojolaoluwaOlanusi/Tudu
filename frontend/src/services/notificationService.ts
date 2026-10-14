import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export interface NotificationPreferences {
  reminders: boolean;
  last_sent_at: string | null;
}

export const notificationService = {
  get: async (token: string): Promise<NotificationPreferences> =>
    (await axios.get(API_URL + '/api/users/me/notifications', { headers: auth(token) })).data,

  set: async (
    token: string,
    reminders: boolean
  ): Promise<NotificationPreferences> =>
    (
      await axios.put(
        API_URL + '/api/users/me/notifications',
        { reminders },
        { headers: auth(token) }
      )
    ).data,
};
