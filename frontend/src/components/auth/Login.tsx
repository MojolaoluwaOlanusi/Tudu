import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OAuthButton from './OAuthButton';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';

type EmailMode = 'signin' | 'signup';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, setLoading, isAuthenticated, initializeAuth, isLoading } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [error, setError] = useState('');

  useEffect(() => {
    // Initialize auth from localStorage on mount
    initializeAuth();

    // Surface OAuth errors redirected back from the backend
    if (searchParams.get('error')) {
      setError('Authentication failed. Please try again.');
      return;
    }

    // If already authenticated, redirect to dashboard
    if (isAuthenticated) {
      navigate('/', { replace: true });
      return;
    }

    // If a token is present, hand off to the dedicated callback route
    const token = searchParams.get('token');
    if (token) {
      navigate(`/auth/callback?token=${token}`, { replace: true });
    }
  }, [searchParams, navigate, setUser, setLoading, isAuthenticated, initializeAuth]);

  const handleGoogleLogin = () => {
    authService.googleLogin();
  };

  const handleGitHubLogin = () => {
    authService.githubLogin();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, token } =
        emailMode === 'signup'
          ? await authService.emailRegister(email, password, name)
          : await authService.emailLogin(email, password);

      // Persist the session so ProtectedRoute lets the user through
      setUser(user, token);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
          (emailMode === 'signup'
            ? 'Registration failed. Please try again.'
            : 'Login failed. Please check your credentials.')
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-light dark:bg-brand-dark px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1 className="text-6xl font-handwritten text-gray-800 dark:text-white mb-4">
            Tudu
          </h1>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Your friendly todo app
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6 text-center">
            {showEmailForm && emailMode === 'signup'
              ? 'Create your account'
              : 'Welcome back'}
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!showEmailForm ? (
            <>
              <div className="space-y-4 mb-6">
                <OAuthButton provider="google" onClick={handleGoogleLogin} />
                <OAuthButton provider="github" onClick={handleGitHubLogin} />
              </div>

              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500">or</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setEmailMode('signin');
                  setError('');
                  setShowEmailForm(true);
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 hover:border-brand-green dark:hover:border-brand-green transition-colors font-medium"
              >
                Continue with Email
              </button>
            </>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {emailMode === 'signup' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-brand-green focus:border-transparent"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-brand-green text-white rounded-lg hover:bg-green-600 transition-colors font-medium disabled:opacity-50 brush-stroke"
              >
                {isLoading
                  ? emailMode === 'signup'
                    ? 'Creating account...'
                    : 'Signing in...'
                  : emailMode === 'signup'
                    ? 'Sign Up'
                    : 'Sign In'}
              </button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                {emailMode === 'signin' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setEmailMode('signup');
                        setError('');
                      }}
                      className="text-brand-green hover:text-green-600 font-medium"
                    >
                      Sign Up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setEmailMode('signin');
                        setError('');
                      }}
                      className="text-brand-green hover:text-green-600 font-medium"
                    >
                      Sign In
                    </button>
                  </>
                )}
              </p>

              <button
                type="button"
                onClick={() => {
                  setShowEmailForm(false);
                  setError('');
                }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Back to OAuth options
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
