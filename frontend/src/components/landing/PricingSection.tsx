import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Play } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

type Currency = 'NGN' | 'USD';

interface PlanData {
  name: string;
  tagline: string;
  ngn: { monthly: number; yearly: number } | null;
  usd: { monthly: number; yearly: number } | null;
  features: string[];
  cta: string;
  highlight?: boolean;
  comingSoon?: boolean;
}

const PRICING_DATA: Record<'free' | 'pro' | 'enterprise', PlanData> = {
  free: {
    name: 'Free',
    tagline: 'For solo builders getting organized.',
    ngn: { monthly: 0, yearly: 0 },
    usd: { monthly: 0, yearly: 0 },
    features: [
      'Unlimited boards & tasks',
      'AI breakdown (rate limited)',
      'Pomodoro & focus stats',
      'Public API (read)',
      'Built-in templates',
    ],
    cta: 'Start free',
  },
  pro: {
    name: 'Pro',
    tagline: 'For freelancers and small teams.',
    ngn: { monthly: 7500, yearly: 75000 },
    usd: { monthly: 5, yearly: 50 },
    features: [
      'Everything in Free',
      'Time tracking & team analytics',
      'HD AI breakdown (12 steps)',
      'GitHub + Slack integrations',
      'Webhooks + public write API',
      'Publish templates & sell',
      'Self-hosting license',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  enterprise: {
    name: 'Enterprise',
    tagline: 'For teams 20+ with compliance needs.',
    ngn: null,
    usd: null,
    comingSoon: true,
    features: [
      'Everything in Pro',
      'SAML SSO (Okta, Azure)',
      'SCIM provisioning',
      'Compliance audit export',
      'White-label branding',
      'On-prem deployment',
      'Dedicated support & SLA',
    ],
    cta: 'Contact sales',
  },
};

interface PricingSectionProps {
  /** Start a real demo account (same handler as the Hero's secondary CTA). */
  onTryDemo: () => void;
  /** Navigate to /login. */
  onStartFree: () => void;
  /** Disables the demo CTA while it is starting. */
  starting?: boolean;
}

/**
 * Landing display-only pricing. The real checkout lives at /pricing (that
 * route is untouched). The "Upgrade to Pro" CTA on this section navigates
 * to the real page rather than opening a fake Paystack modal on marketing
 * pages.
 *
 * Note the "Try the demo" button placed below the three cards — it satisfies
 * the pre-existing e2e assertion on / (landing.spec.ts looks for a
 * "Try the demo" button on the signed-out landing page) and preserves
 * the behaviour of the original landing page's demo CTA.
 */
const PricingSection: React.FC<PricingSectionProps> = ({
  onTryDemo,
  onStartFree,
  starting = false,
}) => {
  const [yearly, setYearly] = useState(false);
  const [currency, setCurrency] = useState<Currency>('NGN');
  const navigate = useNavigate();

  const getPrice = (key: keyof typeof PRICING_DATA): { value: number; symbol: string } | null => {
    const d = PRICING_DATA[key];
    if (!d.ngn || !d.usd) return null;
    const value =
      currency === 'NGN'
        ? d.ngn[yearly ? 'yearly' : 'monthly']
        : d.usd[yearly ? 'yearly' : 'monthly'];
    return { value, symbol: currency === 'NGN' ? '₦' : '$' };
  };

  return (
    <section id="pricing" className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
      <div className="mb-10 max-w-2xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Pricing
        </p>
        <h2 className="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          Simple pricing. Real limits.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          Free forever for personal use. Upgrade when you need teammates,
          integrations, or volume.
        </p>
      </div>

      <div className="mb-8 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-line bg-surface p-1">
          {[
            { key: false, label: 'Monthly' },
            { key: true, label: 'Yearly', save: true },
          ].map((opt) => (
            <button
              key={String(opt.key)}
              type="button"
              onClick={() => setYearly(opt.key)}
              className={twMerge(
                'relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                yearly === opt.key ? 'text-ink' : 'text-ink-muted',
              )}
            >
              {yearly === opt.key && (
                <motion.div
                  layoutId="yearly-toggle"
                  className="absolute inset-0 rounded-md bg-raised"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{opt.label}</span>
              {opt.save && (
                <span className="relative z-10 ml-1.5 rounded-sm bg-brand/15 px-1 text-[9px] font-semibold uppercase tracking-wider text-brand">
                  Save 2mo
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="inline-flex rounded-lg border border-line bg-surface p-1">
          {(['NGN', 'USD'] as Currency[]).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCurrency(c)}
              className={twMerge(
                'relative rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors',
                currency === c ? 'text-ink' : 'text-ink-muted',
              )}
            >
              {currency === c && (
                <motion.div
                  layoutId="currency-toggle"
                  className="absolute inset-0 rounded-md bg-raised"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="relative z-10">{c}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {(['free', 'pro', 'enterprise'] as const).map((key) => {
          const data = PRICING_DATA[key];
          const price = getPrice(key);
          const highlight = data.highlight;
          return (
            <div
              key={key}
              className={twMerge(
                'relative flex flex-col rounded-xl border p-6 transition-colors',
                highlight
                  ? 'border-brand/60 bg-brand-subtle/20 ring-1 ring-brand/30'
                  : 'border-line bg-surface',
                data.comingSoon && 'opacity-60',
              )}
            >
              {highlight && (
                <span className="absolute -top-2.5 left-4 rounded-sm bg-brand px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-inverse">
                  Most popular
                </span>
              )}
              {data.comingSoon && (
                <span className="absolute -top-2.5 left-4 rounded-sm bg-line px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                  Coming soon
                </span>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-semibold text-ink">{data.name}</h3>
                <p className="mt-1 text-xs text-ink-muted">{data.tagline}</p>
              </div>

              <div className="mb-5 min-h-[70px]">
                {price ? (
                  <>
                    <motion.p
                      key={`${currency}-${yearly}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-4xl font-semibold text-ink tabular-nums"
                    >
                      {price.symbol}
                      {price.value.toLocaleString()}
                      <span className="ml-1 text-sm font-normal text-ink-muted">
                        /{yearly ? 'year' : 'month'}
                      </span>
                    </motion.p>
                    {yearly && key === 'pro' && (
                      <p className="mt-1 text-[11px] text-ink-faint">
                        ≈ {price.symbol}
                        {Math.round(price.value / 12).toLocaleString()}/mo
                      </p>
                    )}
                    {key === 'pro' && (
                      <p className="mt-1 text-[10px] text-ink-faint">
                        Charged ₦{(yearly ? 75000 : 7500).toLocaleString()} NGN
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-3xl font-semibold text-ink">Custom</p>
                )}
              </div>

              <ul className="mb-6 flex-1 space-y-2">
                {data.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-[12px]">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2.5} />
                    <span className="text-ink-muted">{f}</span>
                  </li>
                ))}
              </ul>

              {key === 'free' && (
                <button
                  type="button"
                  onClick={onStartFree}
                  className="w-full rounded-md border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-subtle"
                >
                  {data.cta}
                </button>
              )}
              {key === 'pro' && (
                <button
                  type="button"
                  onClick={() => navigate('/pricing')}
                  className="brush-stroke relative inline-flex w-full items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-semibold text-ink-inverse shadow-sm transition-colors hover:bg-brand-hover"
                >
                  {data.cta}
                </button>
              )}
              {key === 'enterprise' && (
                <Link
                  to="/contact"
                  className="block w-full rounded-md border border-line bg-surface px-4 py-2 text-center text-sm font-medium text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
                >
                  {data.cta}
                </Link>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-10 flex flex-col items-center gap-3">
        <p className="text-xs text-ink-muted">Not sure yet?</p>
        <button
          type="button"
          onClick={onTryDemo}
          disabled={starting}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-5 text-sm font-medium text-ink transition-colors hover:bg-subtle disabled:opacity-60"
        >
          <Play className="h-4 w-4" />
          {starting ? 'Setting up your board…' : 'Try the demo'}
        </button>
      </div>
    </section>
  );
};

export default PricingSection;