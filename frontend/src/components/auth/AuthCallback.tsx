import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';

/**
 * Handles the redirect from the backend OAuth flow
 * (Google/GitHub) at /auth/callback?token=...
 *
 * It exchanges the JWT for the current user, stores the session
 * in the auth store and then sends the user to the dashboard.
 */
const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, token, setUser, setLoading } = useAuthStore();
  const [error, setError] = useState('');
  // Guard against React 18 StrictMode double-invoking effects in dev.
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;

    const errorParam = searchParams.get('error');
    const callbackToken = searchParams.get('token');

    // If we already have a valid session, skip straight to the dashboard.
    if (user && token) {
      navigate('/', { replace: true });
      return;
    }

    if (errorParam || !callbackToken) {
      setError('Authentication failed. Please try again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    authService
      .handleCallback(callbackToken)
      .then(({ user: authUser, token: authToken }) => {
        setUser(authUser, authToken);
        navigate('/', { replace: true });
      })
      .catch((err) => {
        console.error('Auth callback error:', err);
        setError('Authentication failed. Please try again.');
        setLoading(false);
      });
  }, [searchParams, navigate, setUser, setLoading, user, token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-md text-center">
        {error ? (
          <div className="card p-8">
            <h1 className="mb-4 font-handwritten text-4xl text-ink">Tudu</h1>
            <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
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
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-accent"></div>
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
