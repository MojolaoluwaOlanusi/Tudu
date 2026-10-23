import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}

export interface GitHubStatus {
  connected: boolean;
  login?: string;
  since?: string;
}

export interface GitHubMapping {
  id: string;
  board_id: string;
  board_name: string;
  repo_full_name: string;
  pr_opened_column_id: string;
  pr_merged_column_id: string;
  created_at: string;
}

export interface SlackStatus {
  connected: boolean;
  teamName?: string;
  channelId?: string | null;
  channelName?: string | null;
  defaultBoardId?: string | null;
  notifyAssignments?: boolean;
  notifyDue?: boolean;
}

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
}

export const integrationService = {
  /* ------------------------------ GitHub ------------------------------ */

  startOAuth: async (token: string): Promise<{ url: string }> =>
    (await axios.get(API_URL + '/api/integrations/github/oauth/start', { headers: auth(token) }))
      .data,

  getStatus: async (token: string): Promise<GitHubStatus> =>
    (await axios.get(API_URL + '/api/integrations/github/status', { headers: auth(token) })).data,

  getRepos: async (token: string): Promise<GitHubRepo[]> =>
    (await axios.get(API_URL + '/api/integrations/github/repos', { headers: auth(token) })).data,

  listMappings: async (token: string): Promise<GitHubMapping[]> =>
    (await axios.get(API_URL + '/api/integrations/github/mappings', { headers: auth(token) }))
      .data,

  saveMapping: async (
    token: string,
    data: {
      board_id: string;
      repo_full_name: string;
      pr_opened_column_id: string;
      pr_merged_column_id: string;
    }
  ): Promise<GitHubMapping> =>
    (await axios.post(API_URL + '/api/integrations/github/mapping', data, { headers: auth(token) }))
      .data,

  deleteMapping: async (token: string, id: string): Promise<void> => {
    await axios.delete(API_URL + '/api/integrations/github/mapping/' + id, {
      headers: auth(token),
    });
  },

  disconnect: async (token: string): Promise<void> => {
    await axios.post(API_URL + '/api/integrations/github/disconnect', {}, { headers: auth(token) });
  },

  /* ------------------------------- Slack ------------------------------ */

  startSlackOAuth: async (token: string): Promise<{ url: string }> =>
    (await axios.get(API_URL + '/api/integrations/slack/oauth/start', { headers: auth(token) }))
      .data,

  getSlackStatus: async (token: string): Promise<SlackStatus> =>
    (await axios.get(API_URL + '/api/integrations/slack/status', { headers: auth(token) })).data,

  getSlackChannels: async (token: string): Promise<SlackChannel[]> =>
    (await axios.get(API_URL + '/api/integrations/slack/channels', { headers: auth(token) })).data,

  saveSlackSettings: async (
    token: string,
    patch: {
      channelId?: string | null;
      channelName?: string | null;
      defaultBoardId?: string | null;
      notifyAssignments?: boolean;
      notifyDue?: boolean;
    }
  ): Promise<{ ok: boolean }> =>
    (await axios.put(API_URL + '/api/integrations/slack/settings', patch, { headers: auth(token) }))
      .data,

  sendSlackTest: async (token: string): Promise<{ ok: boolean }> =>
    (await axios.post(API_URL + '/api/integrations/slack/test', {}, { headers: auth(token) })).data,

  disconnectSlack: async (token: string): Promise<void> => {
    await axios.delete(API_URL + '/api/integrations/slack', { headers: auth(token) });
  },
};

/* ------------------------- Webhook secret ------------------------- */

const API_URL_INTERNAL =
  import.meta.env.VITE_API_URL || 'http://localhost:5000';
const authInternal = (token: string) => ({
  Authorization: 'Bearer ' + token,
});

export const getGithubWebhookSecret = async (
  token: string,
): Promise<{ secret: string }> =>
  (
    await axios.get(
      API_URL_INTERNAL + '/api/integrations/github/webhook-secret',
      { headers: authInternal(token) },
    )
  ).data;

export const rotateGithubWebhookSecret = async (
  token: string,
): Promise<{ secret: string }> =>
  (
    await axios.post(
      API_URL_INTERNAL + '/api/integrations/github/rotate-secret',
      {},
      { headers: authInternal(token) },
    )
  ).data;
