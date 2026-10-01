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
    <div className="min-h-screen flex items-center justify-center bg-brand-light dark:bg-brand-dark px-4">
      <div className="max-w-md w-full text-center">
        {error ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
            <h1 className="text-3xl font-handwritten text-gray-800 dark:text-white mb-4">
              Tudu
            </h1>
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full px-4 py-3 bg-brand-green text-white rounded-lg hover:bg-green-600 transition-colors font-medium brush-stroke"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-green mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">
              Signing you in...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
