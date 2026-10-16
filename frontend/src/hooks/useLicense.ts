import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  licenseService,
  type LicenseRecord,
  type LicenseStatusResponse,
} from '../services/licenseService';
import { useAuthStore } from '../store/authStore';

const QUERY_KEY = ['license', 'status'] as const;

export const useLicenseStatus = () => {
  const { token } = useAuthStore();
  return useQuery<LicenseStatusResponse>({
    queryKey: QUERY_KEY,
    queryFn: () => licenseService.getStatus(token!),
    enabled: !!token,
    staleTime: 60_000,
  });
};

/** True when this instance is running in self-hosted mode. */
export const useIsSelfHosted = (): boolean => {
  const { data } = useLicenseStatus();
  return data?.mode === 'self_hosted';
};

/** Install a signed license on this self-hosted instance. */
export const useActivateLicense = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<
    { ok: boolean; payload: unknown },
    unknown,
    { payload: unknown; signature: string }
  >({
    mutationFn: (license) => licenseService.activate(token!, license),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['billing', 'entitlements'] });
    },
  });
};

/** Remove the installed license from this self-hosted instance. */
export const useDeactivateLicense = () => {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  return useMutation<void, unknown, void>({
    mutationFn: () => licenseService.deactivate(token!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['billing', 'entitlements'] });
    },
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
