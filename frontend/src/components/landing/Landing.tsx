import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicService } from '../../services/publicService';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import Navbar from './Navbar';
import Hero from './Hero';
import LiveBoardHero from './LiveBoardHero';
import LogoStrip from './LogoStrip';
import ProblemSection from './ProblemSection';
import BentoGrid from './BentoGrid';
import HowItWorks from './HowItWorks';
import UnderTheHood from './UnderTheHood';
import type { User } from '../../types/user';

/**
 * Public landing page — shown at / to signed-out visitors.
 *
 * Step 4 composition: the mockup's fixed Navbar + Hero + LiveBoardHero,
 * followed by the still-live Feature / Pricing / Footer sections (those
 * are replaced by the mockup's versions in Steps 5 and 7).
 *
 * Behavior is unchanged from the pre-Step-4 landing:
 *   - "Try the demo" calls publicService.startDemo(), setUser(), then /board
 *   - "Start free" navigates to /login
 * Every existing handler and toast copy is preserved verbatim.
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
      setUser(
        {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name ?? '',
          provider: 'demo',
          created_at: new Date().toISOString(),
        } as User,
        session.token,
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
    <div className="min-h-screen bg-canvas text-ink">
      <Navbar />
      <main className="pt-14">
        <Hero
          onTryDemo={handleTryDemo}
          onStartFree={handleStartFree}
          starting={starting}
        />

        <div className="mx-auto max-w-5xl px-6 pb-12">
          <LiveBoardHero />
        </div>

        <LogoStrip />
        <ProblemSection />
        <BentoGrid />

        <HowItWorks />
        <UnderTheHood />

        {/* --- Features (live copy, replaced by BentoGrid in Step 5) --- */}
        <section className="mx-auto max-w-5xl px-4 py-12">
          <h2 className="mb-10 text-center font-handwritten text-3xl text-ink sm:text-4xl">
            Everything you need. Nothing you don&apos;t.
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-line bg-surface-2 p-5"
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

        {/* --- Pricing (live copy, replaced by PricingSection in Step 7) --- */}
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
                    : 'border-line bg-surface-2'
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
                      className="w-full rounded-full border border-line bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-accent disabled:opacity-60"
                    >
                      {starting ? 'Starting…' : 'Try the demo'}
                    </button>
                  ) : (
                    <a
                      href="mailto:hello@tudu.app?subject=Tudu%20Enterprise"
                      className="block w-full rounded-full border border-line bg-surface px-4 py-2.5 text-center text-sm font-semibold text-ink hover:border-accent"
                    >
                      Contact us
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* --- Footer (live copy, replaced by the mockup Footer in Step 7) --- */}
        <footer className="border-t border-line">
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
                    <li>
                      <a href="#features" className="hover:text-ink">
                        Features
                      </a>
                    </li>
                    <li>
                      <a href="#pricing" className="hover:text-ink">
                        Pricing
                      </a>
                    </li>
                    <li>
                      <a href="/changelog" className="hover:text-ink">
                        Changelog
                      </a>
                    </li>
                  </ul>
                </div>
                <div>
                  <p className="mb-2 font-semibold text-ink">Legal</p>
                  <ul className="space-y-1">
                    <li>
                      <a href="/privacy" className="hover:text-ink">
                        Privacy
                      </a>
                    </li>
                    <li>
                      <a href="/terms" className="hover:text-ink">
                        Terms
                      </a>
                    </li>
                    <li>
                      <a href="/security" className="hover:text-ink">
                        Security
                      </a>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <p className="text-center sm:text-left">
              © {new Date().getFullYear()} Tudu. All rights reserved.
            </p>
          </div>
        </footer>
      </main>
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