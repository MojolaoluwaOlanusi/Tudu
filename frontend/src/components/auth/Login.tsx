import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import OAuthButton from './OAuthButton';
import { useAuthStore } from '../../store/authStore';
import { authService } from '../../services/authService';
import Wordmark from '../common/Wordmark';

type EmailMode = 'signin' | 'signup';

/**
 * Login / Signup.
 *
 * The Step 12 restyle keeps the live app's flow intact (OAuth buttons first,
 * "Continue with Email" toggles the form, "Sign Up" / "Sign In" toggles the
 * mode) but adopts the mockup's two-column desktop layout: a marketing panel
 * on the left, the form panel on the right. Below `lg` it collapses back to
 * the single centred column the pre-restyle login already had.
 */
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

  const isSignup = showEmailForm && emailMode === 'signup';
  const heading = isSignup ? 'Create your account' : 'Welcome back';
  const sub = isSignup
    ? 'Start free. No credit card required.'
    : 'Sign in to your board.';

  return (
    <div className="flex min-h-screen bg-page text-ink">
      {/* Left marketing panel — desktop only, ported from the mockup's AuthPage.jsx */}
      <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-hairline bg-surface p-10 lg:flex">
        <Link to="/" className="inline-block" aria-label="Tudu home">
          <Wordmark className="h-9 w-auto" />
        </Link>
        <div className="max-w-md">
          <h2 className="font-handwritten text-4xl leading-tight text-ink">
            Where simple boards become serious work.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-ink-muted">
            The fast, offline-first Kanban for teams tired of Trello&apos;s
            limits and Jira&apos;s chaos. Free for personal use, scales when you
            do.
          </p>
          <ul className="mt-6 space-y-2 text-[13px] text-ink-muted">
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              Free forever for personal use
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              Real-time sync across every device
            </li>
            <li className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              AI, Pomodoro, analytics, GitHub + Slack
            </li>
          </ul>
        </div>
        <p className="text-[11px] text-ink-muted">Made with love in Ibadan.</p>
      </aside>

      {/* Right form panel */}
      <main className="flex w-full flex-col items-center justify-center px-6 py-10 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Mobile-only brand block */}
          <div className="mb-8 text-center lg:hidden">
            <Wordmark className="mx-auto h-20 w-auto sm:h-24" />
            <p className="mt-2 text-center text-lg text-ink-muted">
              Your friendly todo app
            </p>
          </div>

          <h1 className="font-handwritten text-4xl text-ink">{heading}</h1>
          <p className="mt-2 text-sm text-ink-muted">{sub}</p>

          {error && (
            <div className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {!showEmailForm ? (
            <div className="mt-8 space-y-3">
              <OAuthButton provider="google" onClick={handleGoogleLogin} />
              <OAuthButton provider="github" onClick={handleGitHubLogin} />

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-hairline" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-page px-2 text-ink-muted">or</span>
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
            </div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="mt-8 space-y-4">
              {emailMode === 'signup' && (
                <div>
                  <label className="label" htmlFor="login-name">
                    Name
                  </label>
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
                <label className="label" htmlFor="login-email">
                  Email
                </label>
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
                <label className="label" htmlFor="login-password">
                  Password
                </label>
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
                    Don&apos;t have an account?{' '}
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

          <p className="mt-6 text-center text-[11px] text-ink-muted">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="underline hover:text-ink">
              Terms
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline hover:text-ink">
              Privacy
            </Link>
            .
          </p>
        </div>
      </main>
    </div>
  );
};

export default Login;