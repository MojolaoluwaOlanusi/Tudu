import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { billingService, type Entitlements, type Payment } from '../services/billingService';
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

export const useBuyCredits = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    { access_code: string; reference: string; authorization_url: string },
    unknown,
    'ai_500' | 'ai_2000'
  >({
    mutationFn: (bundle) => billingService.buyAiCredits(token!, bundle),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const usePaymentHistory = () => {
  const { token } = useAuthStore();
  return useQuery<Payment[]>({
    queryKey: ['billing', 'history'],
    queryFn: () => billingService.history(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};