import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
}

export const integrationService = {
  connectGitHub: async (token: string, githubToken: string): Promise<void> => {
    await axios.post(API_URL + '/api/integrations/github/connect', { token: githubToken }, { headers: auth(token) });
  },

  getRepos: async (token: string): Promise<GitHubRepo[]> =>
    (await axios.get(API_URL + '/api/integrations/github/repos', { headers: auth(token) })).data,

  saveMapping: async (
    token: string,
    data: { board_id: string; repo_full_name: string; pr_opened_column_id: string; pr_merged_column_id: string }
  ): Promise<void> => {
    await axios.post(API_URL + '/api/integrations/github/mapping', data, { headers: auth(token) });
  },
};
