import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { licenseService, type LicenseRecord } from '../services/licenseService';
import { useAuthStore } from '../store/authStore';

const QUERY_KEY = ['license', 'status'] as const;

export const useLicenseStatus = () => {
  const { token } = useAuthStore();
  return useQuery<{ issuerConfigured: boolean; licenses: LicenseRecord[] }>({
    queryKey: QUERY_KEY,
    queryFn: () => licenseService.getStatus(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};

export const useIssueLicense = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    LicenseRecord,
    unknown,
    { fingerprint: string; note?: string }
  >({
    mutationFn: ({ fingerprint, note }) => licenseService.issue(token!, fingerprint, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};

export const useRevokeLicense = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, unknown, string>({
    mutationFn: (id) => licenseService.revoke(token!, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
};
