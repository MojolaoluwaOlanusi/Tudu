import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import Wordmark from '../common/Wordmark';
import type { User } from '../../types/user';

/**
 * Public landing page — shown at / to signed-out visitors.
 *
 * Two calls to action: "Try the demo" (creates a throwaway account via
 * POST /api/public/demo and drops the visitor on the board) and "Start free"
 * (navigates to /login where they can register).
 *
 * Uses the same brush-stroke / handwritten style as the app, so a visitor
 * does not feel they have landed on a different product.
 */
const Landing = () => {
  const navigate = useNavigate();
  const setUser = useAuthStore((s) => s.setUser);
  const pushToast = useUiStore((s) => s.pushToast);
  const [starting, setStarting] = useState(false);

  const handleTryDemo = async () => {
    setStarting(true);
    try {
      const session = await publicService.startDemo();
      // The store takes both at once: setUser(user, token).
      setUser(
        {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name ?? '',
          provider: 'demo',
          created_at: new Date().toISOString(),
        } as User,
        session.token
      );
      pushToast('Welcome! This is a demo board — explore freely.', 'success');
      navigate('/board');
    } catch (err) {
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      pushToast(detail || 'Could not start the demo. Try again in a moment.', 'error');
    } finally {
      setStarting(false);
    }
  };

  const handleStartFree = () => navigate('/login');

  return (
    <div className="min-h-screen bg-surface text-ink">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5">
        <Wordmark className="h-8" />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="rounded-full px-4 py-2 text-sm font-semibold text-ink-muted hover:text-ink"
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={handleStartFree}
            className="btn-accent rounded-full px-4 py-2 text-sm font-semibold"
          >
            Start free
          </button>
        </div>
      </nav>

      <section className="mx-auto max-w-4xl px-4 pt-12 pb-16 text-center sm:pt-20">
        <h1 className="font-handwritten text-5xl leading-tight text-ink sm:text-6xl md:text-7xl">
          Kanban that{' '}
          <span className="relative inline-block">
            just works
            <svg
              viewBox="0 0 200 12"
              className="absolute -bottom-1 left-0 h-3 w-full text-accent"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path d="M2 8 Q 50 2, 100 6 T 198 4" />
            </svg>
          </span>
          .
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-base text-ink-muted sm:text-lg">
          The AI-powered board for people who hate Trello's mobile bugs and Jira's
          complexity. Free forever for personal use.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleTryDemo}
            disabled={starting}
            className="btn-accent brush-stroke px-6 py-3 text-sm font-semibold disabled:opacity-60"
          >
            {starting ? 'Setting up your board…' : 'Try the demo →'}
          </button>
          <button
            type="button"
            onClick={handleStartFree}
            className="rounded-full border border-hairline bg-surface-2 px-6 py-3 text-sm font-semibold text-ink transition-colors hover:border-accent"
          >
            Start free
          </button>
        </div>

        <p className="mt-6 text-xs text-ink-muted">
          ✓ No credit card · ✓ No signup for the demo · ✓ Cancel any time
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-10 text-center font-handwritten text-3xl text-ink sm:text-4xl">
          Everything you need. Nothing you don't.
        </h2>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-hairline bg-surface-2 p-5"
            >
              <div className="mb-2 text-2xl" aria-hidden="true">
                {f.emoji}
              </div>
              <h3 className="mb-1 text-sm font-semibold text-ink">{f.title}</h3>
              <p className="text-xs text-ink-muted">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h2 className="mb-3 text-center font-handwritten text-3xl text-ink sm:text-4xl">
          Simple pricing
        </h2>
        <p className="mb-10 text-center text-sm text-ink-muted">
          Start free. Upgrade only when you need teammates or volume.
        </p>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`flex flex-col rounded-2xl border p-6 ${
                p.highlight
                  ? 'border-accent bg-surface shadow-lg'
                  : 'border-hairline bg-surface-2'
              }`}
            >
              <h3 className="mb-1 font-handwritten text-2xl text-ink">{p.name}</h3>
              <p className="mb-4 text-xs text-ink-muted">{p.tagline}</p>
              <p className="mb-5">
                <span className="font-handwritten text-4xl text-ink">{p.price}</span>
                {p.period && (
                  <span className="ml-1 text-xs text-ink-muted">{p.period}</span>
                )}
              </p>
              <ul className="mb-6 space-y-1.5 text-xs text-ink-muted">
                {p.bullets.map((b) => (
                  <li key={b}>✓ {b}</li>
                ))}
              </ul>
              <div className="mt-auto">
                {p.name === 'Pro' ? (
                  <button
                    type="button"
                    onClick={handleStartFree}
                    className="btn-accent w-full rounded-full py-2.5 text-sm font-semibold"
                  >
                    Get started
                  </button>
                ) : p.name === 'Free' ? (
                  <button
                    type="button"
                    onClick={handleTryDemo}
                    disabled={starting}
                    className="w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-accent disabled:opacity-60"
                  >
                    {starting ? 'Starting…' : 'Try the demo'}
                  </button>
                ) : (
                  <a
                    href="mailto:hello@tudu.app?subject=Tudu%20Enterprise"
                    className="block w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-center text-sm font-semibold text-ink hover:border-accent"
                  >
                    Contact us
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-hairline">
        <div className="mx-auto max-w-5xl px-4 py-10 text-xs text-ink-muted">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:justify-between">
            <div>
              <p className="mb-2 font-handwritten text-lg text-ink">tudu</p>
              <p>Made in Lagos. Built with the PERN stack.</p>
            </div>
            <div className="flex gap-10">
              <div>
                <p className="mb-2 font-semibold text-ink">Product</p>
                <ul className="space-y-1">
                  <li><a href="#features" className="hover:text-ink">Features</a></li>
                  <li><a href="#pricing" className="hover:text-ink">Pricing</a></li>
                  <li><a href="/changelog" className="hover:text-ink">Changelog</a></li>
                </ul>
              </div>
              <div>
                <p className="mb-2 font-semibold text-ink">Legal</p>
                <ul className="space-y-1">
                  <li><a href="/privacy" className="hover:text-ink">Privacy</a></li>
                  <li><a href="/terms" className="hover:text-ink">Terms</a></li>
                  <li><a href="/security" className="hover:text-ink">Security</a></li>
                </ul>
              </div>
            </div>
          </div>
          <p className="text-center sm:text-left">
            © {new Date().getFullYear()} Tudu. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

const FEATURES = [
  { emoji: '🤖', title: 'AI task breakdown', body: 'Break a vague goal into five concrete steps. Free, not behind a paywall.' },
  { emoji: '⏱️', title: 'Pomodoro built in', body: 'Focus sessions with real analytics. No separate timer app needed.' },
  { emoji: '⚡', title: 'Real-time sync', body: 'Every device, every tab, every teammate. Updates in under a second.' },
  { emoji: '📱', title: 'Works on mobile', body: 'Installable PWA. 44px touch targets. Mobile Safari does not break.' },
  { emoji: '🎨', title: 'A friendly UI', body: 'Painted strokes, handwritten headings. No enterprise jargon.' },
  { emoji: '👥', title: 'Team-ready', body: 'Workspaces, roles, shared boards — when you need them, not before.' },
];

const PLANS = [
  {
    name: 'Free',
    tagline: 'For solo users getting organised.',
    price: '₦0',
    period: 'forever',
    highlight: false,
    bullets: ['Unlimited boards and tasks', 'AI breakdown (daily limit)', 'Pomodoro + analytics', 'Works on mobile'],
  },
  {
    name: 'Pro',
    tagline: 'For freelancers and small teams.',
    price: '₦7,500',
    period: '/ month · or ₦75,000 / year',
    highlight: true,
    bullets: [
      'Everything in Free',
      'Team workspaces and roles',
      'More AI credits, or top up as you go',
      'GitHub and Slack integrations',
      'Self-hosting license',
    ],
  },
  {
    name: 'Enterprise',
    tagline: 'For teams 20+ with compliance needs.',
    price: 'Custom',
    period: 'from ₦450,000 / year',
    highlight: false,
    bullets: ['SAML SSO + SCIM', 'Audit log export', 'On-prem deployment', 'Dedicated support & SLA'],
  },
];

export default Landing;
