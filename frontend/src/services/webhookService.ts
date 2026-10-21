import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const auth = (token: string) => ({ Authorization: 'Bearer ' + token });

export type WebhookEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.moved'
  | 'task.deleted';

export const WEBHOOK_EVENTS: WebhookEvent[] = [
  'task.created',
  'task.updated',
  'task.moved',
  'task.deleted',
];

export interface WebhookEndpoint {
  id: string;
  url: string;
  description: string | null;
  events: WebhookEvent[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /** Only present in the response from create(); never returned again. */
  secret?: string;
}

export interface WebhookDelivery {
  id: string;
  event_type: string;
  status: 'pending' | 'success' | 'failed' | 'dead';
  attempt_count: number;
  next_attempt_at: string;
  last_attempt_at: string | null;
  last_response_status: number | null;
  last_response_body: string | null;
  created_at: string;
}

export interface CreateEndpointInput {
  url: string;
  description?: string;
  events?: WebhookEvent[];
}

export const webhookService = {
  list: async (token: string): Promise<WebhookEndpoint[]> =>
    (await axios.get(API_URL + '/api/webhooks', { headers: auth(token) })).data,

  create: async (token: string, input: CreateEndpointInput): Promise<WebhookEndpoint> =>
    (await axios.post(API_URL + '/api/webhooks', input, { headers: auth(token) })).data,

  update: async (
    token: string,
    id: string,
    patch: { is_active: boolean },
  ): Promise<WebhookEndpoint> =>
    (await axios.put(API_URL + '/api/webhooks/' + id, patch, { headers: auth(token) })).data,

  remove: async (token: string, id: string): Promise<void> => {
    await axios.delete(API_URL + '/api/webhooks/' + id, { headers: auth(token) });
  },

  deliveries: async (token: string, id: string): Promise<WebhookDelivery[]> =>
    (await axios.get(API_URL + '/api/webhooks/' + id + '/deliveries', { headers: auth(token) })).data,

  retryDelivery: async (token: string, deliveryId: string): Promise<void> => {
    await axios.post(
      API_URL + '/api/webhooks/deliveries/' + deliveryId + '/retry',
      {},
      { headers: auth(token) },
    );
  },
};
