import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '../types/user';

/**
 * Auth state (Zustand + persist).
 * Only the *session* lives here - server data for the user is fetched and
 * cached through React Query (see `hooks/useAuth.ts`).
 */
interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setUser: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      setUser: (user, token) => set({ user, token, isAuthenticated: true }),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      // Rehydrate synchronously from localStorage so the router never flashes
      // the login screen for an already signed-in user.
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const selectToken = (state: AuthStore) => state.token;
export const selectUser = (state: AuthStore) => state.user;
export const selectIsAuthenticated = (state: AuthStore) => state.isAuthenticated;

