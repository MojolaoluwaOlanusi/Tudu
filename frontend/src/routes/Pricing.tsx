import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import PaystackPop from '@paystack/inline-js';
import { useAuthStore } from '../store/authStore';
import { useCheckout, useEntitlements } from '../hooks/useBilling';
import { useUiStore } from '../store/uiStore';
import { detectDisplayCurrency, formatNgnExact } from '../config/currency';
import Navbar from '../components/landing/Navbar';

type Period = 'monthly' | 'yearly';
type Currency = 'NGN' | 'USD';
type PlanCode = 'pro_monthly' | 'pro_yearly';

interface CurrencyRow {
  code: string;
  symbol: string;
  ngnPerUnit: number;
}

const CURRENCY_ROWS: Record<Currency, CurrencyRow> = {
  NGN: { code: 'NGN', symbol: '\u20a6', ngnPerUnit: 1 },
  USD: { code: 'USD', symbol: '$', ngnPerUnit: 1500 },
};

const PRO_AMOUNTS_KOBO: Record<Period, number> = {
  monthly: 750_000,
  yearly: 7_500_000,
};
const PRO_PLAN_CODES: Record<Period, PlanCode> = {
  monthly: 'pro_monthly',
  yearly: 'pro_yearly',
};

const FREE_FEATURES = [
  'Unlimited boards & tasks',
  'AI breakdown (rate limited)',
  'Pomodoro & focus stats',
  'Public read API',
  'Built-in templates',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Time tracking & team analytics',
  'HD AI breakdown (12 steps)',
  'GitHub + Slack integrations',
  'Public write API + webhooks',
  'Self-hosting license',
];

const ENTERPRISE_FEATURES = [
  'Everything in Pro',
  'SAML SSO',
  'SCIM provisioning',
  'Audit log export',
  'White-label branding',
  'On-prem deployment',
  'Dedicated support & SLA',
];

const CheckRow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <li className="flex items-start gap-2 text-[12px]">
    <Check
      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand"
      strokeWidth={2.5}
    />
    <span className="text-ink-muted">{children}</span>
  </li>
);

/**
 * Pricing page.
 *
 * From the landing page: renders the marketing Navbar above it
 * (matching the mockup's `PricingPage.jsx` when `?from=app` is absent).
 *
 * From inside the app (`?from=app`): renders a slim header with a
 * Back button that returns to /settings/billing — the flow an existing
 * user goes through when they click "Upgrade".
 *
 * Visuals are the mockup's exact layout: rounded-xl NGN/USD +
 * Monthly/Yearly toggles, three cards (Free / Pro / Enterprise), the
 * "Most popular" badge on Pro, and the "Coming soon" pill on Enterprise.
 * The Paystack inline popup, currency conversion note, and "Pay on
 * Paystack's site" fallback are preserved from the real billing flow.
 */
const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const checkout = useCheckout();
  const { data: ent } = useEntitlements();
  const pushToast = useUiStore((s) => s.pushToast);

  const fromApp = searchParams.get('from') === 'app';
  const isPro = ent?.tier === 'pro';

  const detected = useMemo(() => detectDisplayCurrency(), []);
  const initialCurrency: Currency = detected.code === 'USD' ? 'USD' : 'NGN';

  const [period, setPeriod] = useState<Period>('monthly');
  const [currency, setCurrency] = useState<Currency>(initialCurrency);
  const [pendingPlan, setPendingPlan] = useState<string | null>(null);

  const proKobo = PRO_AMOUNTS_KOBO[period];
  const proNgn = formatNgnExact(proKobo);

  const row = CURRENCY_ROWS[currency];
  const displayValue =
    currency === 'NGN'
      ? proKobo / 100
      : Math.round(proKobo / 100 / row.ngnPerUnit);
  const perMonthValue = Math.round(displayValue / 12);

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
      {fromApp ? (
        <header className="sticky top-0 z-30 border-b border-hairline bg-page/80 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-6">
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
      ) : (
        <Navbar />
      )}

      <main
        className={
          fromApp
            ? 'mx-auto max-w-6xl px-6 py-10'
            : 'mx-auto max-w-6xl px-6 pt-24 pb-16'
        }
      >
        <div className="mb-10 text-center">
          <h1 className="font-handwritten text-4xl text-ink sm:text-5xl">
            Simple pricing. Real limits.
          </h1>
          <p className="mx-auto mt-3 max-w-lg text-sm text-ink-muted">
            Free forever for personal use. Upgrade when you need teammates,
            integrations, or volume.
          </p>
          {currency !== 'NGN' && (
            <p className="mx-auto mt-2 max-w-lg text-xs text-ink-muted">
              Prices shown in {currency} for reference. You will be charged the
              NGN amount below each price.
            </p>
          )}
        </div>

        <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex rounded-xl border border-line bg-surface p-1">
            {(['monthly', 'yearly'] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={
                  'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ' +
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

          <div className="inline-flex rounded-xl border border-line bg-surface p-1">
            {(['NGN', 'USD'] as Currency[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCurrency(c)}
                className={
                  'rounded-lg px-3 py-1.5 text-[12px] font-medium transition-colors ' +
                  (currency === c
                    ? 'bg-raised text-ink'
                    : 'text-ink-muted hover:text-ink')
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Free */}
          <div className="relative flex flex-col rounded-xl border border-line bg-surface p-6 transition-colors">
            <h2 className="font-handwritten text-2xl text-ink">Free</h2>
            <p className="mt-1 text-[12px] text-ink-muted">
              For solo builders getting organized.
            </p>
            <div className="my-5 min-h-[64px]">
              <p className="font-handwritten text-4xl text-ink">₦0</p>
            </div>
            <ul className="mb-6 flex-1 space-y-2">
              {FREE_FEATURES.map((f) => (
                <CheckRow key={f}>{f}</CheckRow>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="w-full rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-subtle"
            >
              Start free
            </button>
          </div>

          {/* Pro */}
          <div className="relative flex flex-col rounded-xl border border-brand/60 bg-brand-subtle/20 p-6 ring-1 ring-brand/30 transition-colors">
            <span className="absolute -top-2.5 left-4 rounded-sm bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-inverse">
              Most popular
            </span>
            <h2 className="font-handwritten text-2xl text-ink">Pro</h2>
            <p className="mt-1 text-[12px] text-ink-muted">
              For freelancers and small teams.
            </p>
            <div className="my-5 min-h-[64px]">
              <p className="font-handwritten text-4xl text-ink tabular-nums">
                {row.symbol}
                {displayValue.toLocaleString()}
                <span className="ml-1 font-sans text-sm text-ink-muted">
                  /{period === 'yearly' ? 'year' : 'month'}
                </span>
              </p>
              {period === 'yearly' && (
                <p className="mt-1 text-[11px] text-ink-faint">
                  ~ {row.symbol}
                  {perMonthValue.toLocaleString()}/mo
                </p>
              )}
              {currency !== 'NGN' && (
                <p className="mt-1 text-[10px] text-ink-faint">
                  Charged {proNgn} NGN
                </p>
              )}
            </div>
            <ul className="mb-6 flex-1 space-y-2">
              {PRO_FEATURES.map((f) => (
                <CheckRow key={f}>{f}</CheckRow>
              ))}
            </ul>
            {isPro ? (
              <div className="flex items-center justify-center gap-1.5 rounded-md border border-brand/40 bg-brand-subtle px-4 py-2 text-sm font-medium text-brand">
                <Check className="h-4 w-4" strokeWidth={2.5} />
                You are on Pro
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => startCheckout(PRO_PLAN_CODES[period])}
                  disabled={!!pendingPlan}
                  className="btn-accent brush-stroke w-full disabled:opacity-60"
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
              </>
            )}
          </div>

          {/* Enterprise */}
          <div className="relative flex flex-col rounded-xl border border-line bg-surface p-6 opacity-60 transition-colors">
            <span className="absolute -top-2.5 left-4 rounded-sm bg-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              Coming soon
            </span>
            <h2 className="font-handwritten text-2xl text-ink">Enterprise</h2>
            <p className="mt-1 text-[12px] text-ink-muted">
              For teams 20+ with compliance needs.
            </p>
            <div className="my-5 min-h-[64px]">
              <p className="font-handwritten text-4xl text-ink">Custom</p>
            </div>
            <ul className="mb-6 flex-1 space-y-2">
              {ENTERPRISE_FEATURES.map((f) => (
                <CheckRow key={f}>{f}</CheckRow>
              ))}
            </ul>
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-md border border-line px-4 py-2 text-sm font-medium text-ink-faint"
            >
              Contact sales
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-ink-muted">
          Payments are processed by Paystack. Cancel any time from your billing
          settings.
        </p>
      </main>
    </div>
  );
};

export default Pricing;