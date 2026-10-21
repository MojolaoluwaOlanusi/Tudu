import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  webhookService,
  type CreateEndpointInput,
  type WebhookDelivery,
  type WebhookEndpoint,
} from '../services/webhookService';
import { useAuthStore } from '../store/authStore';

const ENDPOINTS_KEY = ['webhooks', 'endpoints'] as const;
const deliveriesKey = (id: string) => ['webhooks', 'deliveries', id] as const;

export const useWebhookEndpoints = () => {
  const { token } = useAuthStore();
  return useQuery<WebhookEndpoint[]>({
    queryKey: ENDPOINTS_KEY,
    queryFn: () => webhookService.list(token!),
    enabled: !!token,
    staleTime: 30_000,
  });
};

export const useCreateWebhookEndpoint = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<WebhookEndpoint, unknown, CreateEndpointInput>({
    mutationFn: (input) => webhookService.create(token!, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY }),
  });
};

export const useUpdateWebhookEndpoint = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    WebhookEndpoint,
    unknown,
    { id: string; is_active: boolean }
  >({
    mutationFn: ({ id, is_active }) => webhookService.update(token!, id, { is_active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY }),
  });
};

export const useDeleteWebhookEndpoint = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => webhookService.remove(token!, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ENDPOINTS_KEY });
      queryClient.removeQueries({ queryKey: ['webhooks', 'deliveries'] });
    },
  });
};

export const useWebhookDeliveries = (endpointId: string | null) => {
  const { token } = useAuthStore();
  return useQuery<WebhookDelivery[]>({
    queryKey: deliveriesKey(endpointId ?? 'none'),
    queryFn: () => webhookService.deliveries(token!, endpointId!),
    enabled: !!token && !!endpointId,
    staleTime: 15_000,
  });
};

export const useRetryWebhookDelivery = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, unknown, { deliveryId: string; endpointId: string }>({
    mutationFn: ({ deliveryId }) => webhookService.retryDelivery(token!, deliveryId),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: deliveriesKey(vars.endpointId) });
    },
  });
};
