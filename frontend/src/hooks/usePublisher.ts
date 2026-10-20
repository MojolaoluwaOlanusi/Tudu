import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { publisherService, type Bank, type PublisherProfile } from '../services/publisherService';
import { useAuthStore } from '../store/authStore';

const QUERY_KEY = ['publisher', 'profile'] as const;
const BANKS_KEY = ['publisher', 'banks'] as const;

export const usePublisherProfile = () => {
  const { token } = useAuthStore();
  return useQuery<PublisherProfile>({
    queryKey: QUERY_KEY,
    queryFn: () => publisherService.getProfile(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};

export const usePublisherBanks = () => {
  const { token } = useAuthStore();
  return useQuery<Bank[]>({
    queryKey: BANKS_KEY,
    queryFn: () => publisherService.listBanks(token!),
    enabled: !!token,
    staleTime: 24 * 60 * 60 * 1000,
  });
};

export const useSavePublisherProfile = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean; payout_status: string; bank_name: string; account_name: string },
    unknown,
    { business_name: string; bank_code: string; account_number: string }
  >({
    mutationFn: (data) => publisherService.saveProfile(token!, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};
