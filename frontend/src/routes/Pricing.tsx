import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import PaystackPop from '@paystack/inline-js';
import { useAuthStore } from '../store/authStore';
import { useCheckout } from '../hooks/useBilling';
import { useUiStore } from '../store/uiStore';
import {
  detectDisplayCurrency,
  formatFromKobo,
  formatNgnExact,
} from '../config/currency';

type Period = 'monthly' | 'yearly';
type PlanCode = 'pro_monthly' | 'pro_yearly';

/** Billing period ↔ plan code ↔ amount (all in NGN kobo). */
const PRO_AMOUNTS_KOBO: Record<Period, number> = {
  monthly: 750_000,
  yearly: 7_500_000,
};
const PRO_PLAN_CODES: Record<Period, PlanCode> = {
  monthly: 'pro_monthly',
  yearly: 'pro_yearly',
};

const FREE_FEATURES = [
  'Unlimited boards and tasks',
  'AI breakdown (daily limit)',
  'Pomodoro + analytics',
  'Works on mobile',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Team workspaces and roles',
  '100 AI credits, top up as you go',
  'GitHub and Slack integrations',
  'Self-hosting license',
];

const ENTERPRISE_FEATURES = [
  'SAML SSO (Okta, Azure)',
  'SCIM provisioning',
  'Compliance audit export',
  'On-prem deployment',
];

const CheckRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-xs text-ink-muted">
    <Check
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand"
      strokeWidth={2.5}
    />
    <span>{children}</span>
  </li>
);

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const checkout = useCheckout();
  const pushToast = useUiStore((s) => s.pushToast);

  const display = useMemo(() => detectDisplayCurrency(), []);
  const [period, setPeriod] = useState<Period>('monthly');
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const fromApp = searchParams.get('from') === 'app';

  const proKobo = PRO_AMOUNTS_KOBO[period];
  const proLocal = formatFromKobo(proKobo, display);
  const proNgn = formatNgnExact(proKobo);
  const proPerMonthLabel =
    period === 'yearly'
      ? '≈ ' + formatFromKobo(Math.round(proKobo / 12), display) + ' / month'
      : null;

  const startCheckout = async (planCode: PlanCode) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setPendingPlan(planCode);
    try {
      const session = await checkout.mutateAsync(planCode);
      const popup = new PaystackPop();
      popup.resumeTransaction(session.access_code, {
        onSuccess: () => {
          setPendingPlan(null);
          pushToast(
            'Payment received. Activating your subscription...',
            'success'
          );
          navigate(
            '/billing/callback?reference=' +
              encodeURIComponent(session.reference)
          );
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
      const detail = (
        err as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      pushToast(detail || 'Could not start checkout', 'error');
    }
  };

  const redirectCheckout = async (planCode: PlanCode) => {
    if (!user) {
      navigate('/login');
      return;
    }
    setPendingPlan(planCode);
    try {
      const session = await checkout.mutateAsync(planCode);
      window.location.href = session.authorization_url;
    } catch (err) {
      setPendingPlan(null);
      const detail = (
        err as { response?: { data?: { error?: string } } }
      )?.response?.data?.error;
      pushToast(detail || 'Could not start checkout', 'error');
    }
  };

  const proBusy = pendingPlan === PRO_PLAN_CODES[period];

  return (
    <div className="min-h-screen bg-page text-ink">
      {fromApp && (
        <header className="sticky top-0 z-30 border-b border-hairline bg-page/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4 sm:px-6">
            <button
              type="button"
              onClick={() => navigate('/settings/billing')}
              className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <span className="text-ink-faint">|</span>
            <span className="text-[13px] font-semibold text-ink">Pricing</span>
          </div>
        </header>
      )}

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
              Prices shown in {display.code} for reference. You will be charged
              the NGN amount below each price.
            </p>
          )}
        </header>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex rounded-xl border border-line bg-surface p-1">
            {(['monthly', 'yearly'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={
                  'relative rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ' +
                  (period === p
                    ? 'bg-raised text-ink'
                    : 'text-ink-muted hover:text-ink')
                }
              >
                {p === 'monthly' ? (
                  'Monthly'
                ) : (
                  <span className="inline-flex items-center gap-1.5">
                    Yearly
                    <span className="rounded-sm bg-brand-subtle px-1 text-[9px] font-semibold uppercase tracking-wider text-brand">
                      Save 2mo
                    </span>
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-hairline bg-surface-2 p-6">
            <h2 className="font-handwritten text-2xl text-ink">Free</h2>
            <p className="mb-4 text-xs text-ink-muted">
              For solo users getting organised.
            </p>
            <p className="mb-1">
              <span className="font-handwritten text-4xl text-ink">₦0</span>
            </p>
            <div className="mb-4" />
            <ul className="mb-6 space-y-1.5">
              {FREE_FEATURES.map((f) => (
                <CheckRow key={f}>{f}</CheckRow>
              ))}
            </ul>
            <div className="mt-auto">
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="w-full rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:border-accent"
              >
                Start free
              </button>
            </div>
          </div>

          {/* Pro */}
          <div className="flex flex-col rounded-2xl border border-accent bg-surface p-6 shadow-lg">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-handwritten text-2xl text-ink">Pro</h2>
              <span className="rounded-sm bg-brand-subtle px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
                Most popular
              </span>
            </div>
            <p className="mb-4 text-xs text-ink-muted">
              For freelancers and small teams.
            </p>
            <p className="mb-1">
              <span className="font-handwritten text-4xl text-ink">
                {proLocal}
              </span>
              <span className="ml-1 text-xs text-ink-muted">
                / {period === 'monthly' ? 'month' : 'year'}
              </span>
            </p>
            {proPerMonthLabel && (
              <p className="mb-1 text-[11px] text-ink-muted">
                {proPerMonthLabel}
              </p>
            )}
            {display.code !== 'NGN' ? (
              <p className="mb-4 text-[11px] text-ink-muted">
                Charged {proNgn} NGN
              </p>
            ) : (
              <div className="mb-4" />
            )}
            <ul className="mb-6 space-y-1.5">
              {PRO_FEATURES.map((f) => (
                <CheckRow key={f}>{f}</CheckRow>
              ))}
            </ul>
            <div className="mt-auto">
              <button
                type="button"
                onClick={() => startCheckout(PRO_PLAN_CODES[period])}
                disabled={!!pendingPlan}
                className="btn-accent w-full rounded-full py-2.5 text-sm font-semibold disabled:opacity-60"
              >
                {proBusy ? 'Opening checkout...' : 'Upgrade to Pro'}
              </button>
              <button
                type="button"
                onClick={() => redirectCheckout(PRO_PLAN_CODES[period])}
                disabled={!!pendingPlan}
                className="mt-2 w-full text-center text-[11px] font-medium text-ink-muted hover:text-ink disabled:opacity-60"
              >
                Having trouble? Pay on Paystack&apos;s site
              </button>
            </div>
          </div>

          {/* Enterprise */}
          <div className="flex flex-col rounded-2xl border border-hairline bg-surface-2 p-6">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="font-handwritten text-2xl text-ink">
                Enterprise
              </h2>
              <span className="rounded-sm bg-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                Coming soon
              </span>
            </div>
            <p className="mb-4 text-xs text-ink-muted">
              For teams 20+ with compliance needs.
            </p>
            <p className="mb-1">
              <span className="font-handwritten text-4xl text-ink">
                Custom
              </span>
            </p>
            <div className="mb-4" />
            <ul className="mb-6 space-y-1.5">
              {ENTERPRISE_FEATURES.map((f) => (
                <CheckRow key={f}>{f}</CheckRow>
              ))}
            </ul>
            <div className="mt-auto">
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-full border border-hairline bg-surface px-4 py-2.5 text-sm font-semibold text-ink-faint"
              >
                Contact sales
              </button>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-ink-muted">
          Payments are processed by Paystack. Cancel any time from your billing
          settings.
        </p>
      </div>
    </div>
  );
};

export default Pricing;