import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCurrentUser } from '../../hooks/useAuth';

/**
 * Handles the redirect from the backend OAuth flow (Google/GitHub)
 * at /auth/callback?token=...
 *
 * The token is exchanged for the current user with a React Query hook
 * (`useCurrentUser`). Once resolved, the session is written to the auth
 * store and the user is sent to the dashboard.
 */
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const callbackToken = searchParams.get('token');
  const hasError = Boolean(searchParams.get('error')) || !callbackToken;

  const { data: user, isLoading, isError } = useCurrentUser(
    hasError ? null : callbackToken
  );

  // Guard against React 18 StrictMode double-invoking effects in dev.
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;

    // Already signed in - nothing to do.
    if (isAuthenticated) {
      processed.current = true;
      navigate('/', { replace: true });
      return;
    }

    if (user && callbackToken) {
      processed.current = true;
      setUser(user, callbackToken);
      navigate('/', { replace: true });
    }
  }, [user, callbackToken, isAuthenticated, setUser, navigate]);

  const showError = hasError || isError;

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md text-center">
        {showError ? (
          <div className="card p-8">
            <h1 className="mb-4 font-handwritten text-4xl text-ink">Tudu</h1>
            <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              Authentication failed. Please try again.
            </div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="btn-accent brush-stroke w-full py-3"
            >
              Back to login
            </button>
          </div>
        ) : (
          <div className="text-center">
            {isLoading && (
              <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-accent"></div>
            )}
            <p className="mt-4 font-handwritten text-xl text-ink-muted">
              Signing you in…
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
