import { useMutation, useQuery } from '@tanstack/react-query';
import { aiService, getAiErrorMessage } from '../services/aiService';
import { useAuthStore } from '../store/authStore';
import { queryKeys } from '../lib/queryClient';

/** Which AI provider the server has configured. */
export const useAiStatus = () => {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: queryKeys.ai.status,
    queryFn: () => aiService.getStatus(token!),
    enabled: !!token,
    staleTime: 5 * 60_000,
    retry: false,
  });
};

/** Generate a breakdown. Never throws - errors surface through `error`. */
export const useAiBreakdown = () => {
  const token = useAuthStore((state) => state.token);

  const mutation = useMutation({
    mutationFn: ({ title, count }: { title: string; count?: number }) =>
      aiService.breakdown(token!, title, count),
  });

  return {
    ...mutation,
    errorMessage: mutation.isError ? getAiErrorMessage(mutation.error) : null,
  };
};