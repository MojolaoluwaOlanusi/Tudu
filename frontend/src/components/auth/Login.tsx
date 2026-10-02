import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import OAuthButton from './OAuthButton';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';

type EmailMode = 'signin' | 'signup';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser, isAuthenticated } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailMode, setEmailMode] = useState<EmailMode>('signin');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
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
  }, [searchParams, navigate, isAuthenticated]);

  const handleGoogleLogin = () => {
    authService.googleLogin();
  };

  const handleGitHubLogin = () => {
    authService.githubLogin();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

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
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/wordmark.png"
            alt="Tudu"
            className="mx-auto h-20 w-auto dark:invert sm:h-24"
          />
          <p className="mt-2 text-center text-lg text-ink-muted">
            Your friendly todo app
          </p>
        </div>

        <div className="card p-6 sm:p-8">
          <h2 className="mb-6 text-center font-handwritten text-3xl text-ink">
            {showEmailForm && emailMode === 'signup'
              ? 'Create your account'
              : 'Welcome back'}
          </h2>

          {error && (
            <div className="mb-4 rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">
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
                  <div className="w-full border-t border-hairline"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-surface px-2 text-ink-muted">or</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setEmailMode('signin');
                  setError('');
                  setShowEmailForm(true);
                }}
                className="w-full rounded-xl border border-hairline bg-surface px-4 py-3 font-medium text-ink transition-colors hover:border-accent hover:text-accent-strong"
              >
                Continue with Email
              </button>
            </>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              {emailMode === 'signup' && (
                <div>
                  <label className="label" htmlFor="login-name">Name</label>
                  <input
                    id="login-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your name"
                    className="input"
                  />
                </div>
              )}

              <div>
                <label className="label" htmlFor="login-email">Email</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label" htmlFor="login-password">Password</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-accent brush-stroke w-full py-3"
              >
                {isSubmitting
                  ? emailMode === 'signup'
                    ? 'Creating account...'
                    : 'Signing in...'
                  : emailMode === 'signup'
                    ? 'Sign Up'
                    : 'Sign In'}
              </button>

              <p className="text-center text-sm text-ink-muted">
                {emailMode === 'signin' ? (
                  <>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setEmailMode('signup');
                        setError('');
                      }}
                      className="font-medium text-accent-strong hover:text-accent"
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
                      className="font-medium text-accent-strong hover:text-accent"
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
                className="w-full text-sm text-ink-muted hover:text-ink"
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
