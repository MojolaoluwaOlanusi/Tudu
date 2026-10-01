import { useQuery } from '@tanstack/react-query';
import { authService } from '../services/authService';
import { queryKeys } from '../lib/queryClient';

/**
 * Resolve the signed-in user from a JWT.
 * Used by the OAuth callback page to exchange the token for a real session.
 */
export const useCurrentUser = (token: string | null) =>
  useQuery({
    queryKey: queryKeys.auth.me(token ?? 'anonymous'),
    queryFn: () => authService.getCurrentUser(token as string),
    enabled: !!token,
    staleTime: 5 * 60_000,
    gcTime: 5 * 60_000,
    retry: false,
  });
