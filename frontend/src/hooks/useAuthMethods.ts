import { useQuery } from '@tanstack/react-query';
import { authService, type AuthMethods } from '../services/authService';

/**
 * Reports which sign-in methods the backend has configured.
 *
 * Login uses this to hide OAuth buttons the server cannot serve -
 * showing a Google button on an instance without Google credentials
 * produces a 503 on click (see backend/src/routes/auth.ts).
 *
 * The Login component defaults each flag to `true` until this query
 * resolves, so a transient network failure does not hide a sign-in
 * method that exists.
 */
export const useAuthMethods = () =>
  useQuery<AuthMethods>({
    queryKey: ['auth', 'methods'],
    queryFn: () => authService.getAuthMethods(),
    staleTime: 5 * 60_000,
    retry: 1,
  });