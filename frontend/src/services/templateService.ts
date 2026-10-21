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
  price_kobo: number;
  rental_days: number;
  version: number;
  author_id: string;
  created_at: string;
  author_name?: string;
  status?: string;
}

export interface TemplatePurchase {
  id: string;
  reference: string;
  amount_kobo: number;
  status: string;
  created_at: string;
  refunded_at: string | null;
  template_id: string;
  template_name: string;
  version_bought: number;
  price_paid_kobo: number;
  rental_days_paid: number;
}

export interface TemplatePurchase {
  id: string;
  reference: string;
  amount_kobo: number;
  status: string;
  created_at: string;
  refunded_at: string | null;
  template_id: string;
  template_name: string;
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
    data: {
      board_id: string;
      name: string;
      description: string;
      category: string;
      price_kobo: number;
      rental_days: number;
    }
  ): Promise<MarketplaceTemplate> =>
    (
      await axios.post(API_URL + '/api/templates/publish', data, {
        headers: auth(token),
      })
    ).data,

  installMarketplace: async (
    token: string,
    id: string,
    reference?: string
  ): Promise<Board> =>
    (
      await axios.post(
        API_URL + '/api/templates/marketplace/' + id + '/install',
        reference ? { reference } : {},
        { headers: auth(token) }
      )
    ).data,

  checkoutMarketplace: async (
    token: string,
    id: string
  ): Promise<{ access_code: string; reference: string; authorization_url: string; amount_kobo: number }> =>
    (
      await axios.post(
        API_URL + '/api/templates/marketplace/' + id + '/checkout',
        {},
        { headers: auth(token) }
      )
    ).data,

  updateMarketplace: async (
    token: string,
    id: string,
    data: { name?: string; description?: string; price_kobo?: number; rental_days?: number; definition_board_id?: string }
  ): Promise<void> => {
    await axios.put(API_URL + '/api/templates/marketplace/' + id, data, { headers: auth(token) });
  },

  syncMarketplace: async (token: string, id: string): Promise<void> => {
    await axios.post(API_URL + '/api/templates/marketplace/' + id + '/sync', {}, { headers: auth(token) });
  },

  listMyPurchases: async (token: string): Promise<TemplatePurchase[]> =>
    (await axios.get(API_URL + '/api/templates/purchases/mine', { headers: auth(token) })).data,

  refundPurchase: async (token: string, reference: string): Promise<void> => {
    await axios.post(
      API_URL + '/api/templates/purchases/' + encodeURIComponent(reference) + '/refund',
      {},
      { headers: auth(token) }
    );
  },

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
