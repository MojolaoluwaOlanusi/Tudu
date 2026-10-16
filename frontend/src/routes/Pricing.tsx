import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PaystackPop from '@paystack/inline-js';
import { useAuthStore } from '../store/authStore';
import { useCheckout } from '../hooks/useBilling';
import { useUiStore } from '../store/uiStore';
import {
  detectDisplayCurrency,
  formatFromKobo,
  formatNgnExact,
} from '../config/currency';

const PLANS = [
  {
    code: 'free' as const,
    name: 'Free',
    amount_kobo: 0,
    period: 'forever',
    tagline: 'For solo users getting organised.',
    bullets: [
      'Unlimited boards and tasks',
      'AI breakdown (daily limit)',
      'Pomodoro + analytics',
      'Works on mobile',
    ],
  },
  {
    code: 'pro_monthly' as const,
    name: 'Pro',
    amount_kobo: 750_000,
    period: '/ month',
    tagline: 'For freelancers and small teams.',
    highlight: true,
    bullets: [
      'Everything in Free',
      'Team workspaces and roles',
      '100 AI credits, top up as you go',
      'GitHub and Slack integrations',
      'Self-hosting license',
    ],
  },
  {
    code: 'pro_yearly' as const,
    name: 'Pro Yearly',
    amount_kobo: 7_500_000,
    period: '/ year',
    tagline: 'Two months free, billed once a year.',
    bullets: [
      'Everything in Pro',
      '1,200 AI credits per year',
      'One receipt per year',
    ],
  },
];

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const checkout = useCheckout();
  const pushToast = useUiStore((s) => s.pushToast);
  const display = useMemo(() => detectDisplayCurrency(), []);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const handleChoose = async (plan: 'pro_monthly' | 'pro_yearly') => {
    if (!user) {
      navigate('/login?next=/pricing');
      return;
    }
    setPendingPlan(plan);
    try {
      const session = await checkout.mutateAsync(plan);

      // Open the inline popup with the access_code the backend created.
      // The webhook is still the source of truth; the popup's success
      // callback only decides what the user sees next.
      const popup = new PaystackPop();
      popup.resumeTransaction(session.access_code, {
        onSuccess: () => {
          setPendingPlan(null);
          pushToast('Payment received. Activating your subscription...', 'success');
          navigate('/billing/callback?reference=' + encodeURIComponent(session.reference));
        },
        onCancel: () => {
          setPendingPlan(null);
          pushToast('Checkout cancelled', 'info');
        },
        onError: (error: { message?: string }) => {
          setPendingPlan(null);
          pushToast(error?.message || 'Checkout failed', 'error');
        },
      });
    } catch (err) {
      setPendingPlan(null);
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      pushToast(detail || 'Could not start checkout', 'error');
    }
  };

    const handleRedirect = async (plan: 'pro_monthly' | 'pro_yearly') => {
    if (!user) {
      navigate('/login?next=/pricing');
      return;
    }
    setPendingPlan(plan);
    try {
      const session = await checkout.mutateAsync(plan);
      // Full-page redirect to Paystack's hosted checkout. Same access_code
      // and reference; the callback_url brings the user straight back.
      window.location.href = session.authorization_url;
    } catch (err) {
      setPendingPlan(null);
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      pushToast(detail || 'Could not start checkout', 'error');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-10 text-center">
        <h1 className="font-handwritten text-4xl text-ink sm:text-5xl">
          Simple pricing
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Start free. Upgrade only when you need teammates or volume.
        </p>
        {display.code !== 'NGN' && (
          <p className="mt-2 text-xs text-ink-muted">
            Prices shown in {display.code} for reference. You will be
            charged the NGN amount below each price.
          </p>
        )}
      </header>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {PLANS.map((p) => {
          const isFree = p.code === 'free';
          const busy = pendingPlan === p.code;
          const local = isFree ? null : formatFromKobo(p.amount_kobo, display);
          const ngn = isFree ? null : formatNgnExact(p.amount_kobo);

          return (
            <div
              key={p.code}
              className={
                'flex flex-col rounded-2xl border p-6 ' +
                ((p as { highlight?: boolean }).highlight
                  ? 'border-accent bg-surface shadow-lg'
                  : 'border-hairline bg-surface-2')
              }
            >
              <h2 className="mb-1 font-handwritten text-2xl text-ink">{p.name}</h2>
              <p className="mb-4 text-xs text-ink-muted">{p.tagline}</p>
              <p className="mb-1">
                <span className="font-handwritten text-4xl text-ink">
                  {local ?? '\u20a60'}
                </span>
                {p.period && (
                  <span className="ml-1 text-xs text-ink-muted">{p.period}</span>
                )}
              </p>
              {ngn && display.code !== 'NGN' && (
                <p className="mb-4 text-[11px] text-ink-muted">
                  Charged {ngn} NGN
                </p>
              )}
              {(!ngn || display.code === 'NGN') && <div className="mb-4" />}
              <ul className="mb-6 space-y-1.5 text-xs text-ink-muted">
                {p.bullets.map((b) => (
                  <li key={b}>\u2713 {b}</li>
                ))}
              </ul>
              <div className="mt-auto">
                {isFree ? (
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-accent"
                  >
                    Start free
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleChoose(p.code as 'pro_monthly' | 'pro_yearly')}
                      disabled={!!pendingPlan}
                      className="btn-accent w-full rounded-full py-2.5 text-sm font-semibold disabled:opacity-60"
                    >
                      {busy ? 'Opening checkout...' : 'Upgrade'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRedirect(p.code as 'pro_monthly' | 'pro_yearly')}
                      disabled={!!pendingPlan}
                      className="mt-2 w-full text-center text-[11px] font-medium text-ink-muted hover:text-ink disabled:opacity-60"
                    >
                      Having trouble? Pay on Paystack's site
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-8 text-center text-xs text-ink-muted">
        Payments are processed by Paystack. Cancel any time from your
        billing settings.
      </p>
    </div>
  );
};

export default Pricing;
