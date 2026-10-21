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

export const integrationService = {
  /** Returns the GitHub authorize URL for the current user. */
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
    await axios.post(
      API_URL + '/api/integrations/github/disconnect',
      {},
      { headers: auth(token) }
    );
  },
};
