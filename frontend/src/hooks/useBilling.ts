import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingService, type Entitlements } from '../services/billingService';
import { useAuthStore } from '../store/authStore';

const QUERY_KEY = ['billing', 'entitlements'] as const;

export const useEntitlements = () => {
  const { token } = useAuthStore();
  return useQuery<Entitlements>({
    queryKey: QUERY_KEY,
    queryFn: () => billingService.getEntitlements(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};

export const useCheckout = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    Awaited<ReturnType<typeof billingService.createCheckout>>,
    unknown,
    'pro_monthly' | 'pro_yearly'
  >({
    mutationFn: (plan) => billingService.createCheckout(token!, plan),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useCancelSubscription = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: () => billingService.cancel(token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};
