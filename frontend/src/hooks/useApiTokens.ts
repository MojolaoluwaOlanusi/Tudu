import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiTokenService, type ApiToken } from '../services/apiTokenService';
import { useAuthStore } from '../store/authStore';

const QUERY_KEY = ['api-tokens'] as const;

export const useApiTokens = () => {
  const { token } = useAuthStore();
  return useQuery<ApiToken[]>({
    queryKey: QUERY_KEY,
    queryFn: () => apiTokenService.list(token!),
    enabled: !!token,
    staleTime: 30_000,
  });
};

export const useCreateApiToken = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<ApiToken, unknown, string>({
    mutationFn: (label) => apiTokenService.create(token!, label),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useRevokeApiToken = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => apiTokenService.revoke(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};
