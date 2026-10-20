import axios from 'axios';
import type { Board } from '../types/board';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export interface InstallTemplateInput {
  name?: string;
  workspaceId?: string;
}

export interface MarketplaceTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  install_count: number;
  created_at: string;
  author_name?: string;
  status?: string;
}

export const templateService = {
  /** Create a new board from a built-in template. */

  // Marketplace endpoints
  listMarketplace: async (): Promise<MarketplaceTemplate[]> =>
    (await axios.get(API_URL + '/api/templates/marketplace')).data,

  listMyTemplates: async (token: string): Promise<MarketplaceTemplate[]> =>
    (await axios.get(API_URL + '/api/templates/mine', { headers: auth(token) })).data,

  publish: async (
    token: string,
    data: { board_id: string; name: string; description: string; category: string }
  ): Promise<MarketplaceTemplate> =>
    (
      await axios.post(API_URL + '/api/templates/publish', data, {
        headers: auth(token),
      })
    ).data,

  installMarketplace: async (token: string, id: string): Promise<Board> =>
    (
      await axios.post(
        API_URL + '/api/templates/marketplace/' + id + '/install',
        {},
        { headers: auth(token) }
      )
    ).data,

  unpublish: async (token: string, id: string): Promise<void> => {
    await axios.delete(API_URL + '/api/templates/' + id, { headers: auth(token) });
  },

  install: async (
    token: string,
    slug: string,
    input: InstallTemplateInput = {}
  ): Promise<Board> =>
    (
      await axios.post(
        API_URL + '/api/templates/' + slug + '/install',
        { name: input.name, workspace_id: input.workspaceId },
        { headers: auth(token) }
      )
    ).data,
};
