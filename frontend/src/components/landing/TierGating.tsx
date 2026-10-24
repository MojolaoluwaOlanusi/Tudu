import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, ListFilter, ListChecks, Timer, Sparkles, LayoutTemplate,
  Code2, Clock, BarChart3, Wand2, Upload, Github, Webhook, KeyRound,
  Lock, Building2, Users, FileText,
} from 'lucide-react';
import { twMerge } from 'tailwind-merge';

type Tier = 'free' | 'pro' | 'enterprise';

interface FeatureRow {
  name: string;
  tier: Tier;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

const FEATURES: FeatureRow[] = [
  { name: 'Boards & Kanban', tier: 'free', desc: 'Drag, WIP, templates', icon: LayoutGrid },
  { name: 'Lists & filters', tier: 'free', desc: 'Group, sort, saved views', icon: ListFilter },
  { name: 'Bulk & shortcuts', tier: 'free', desc: 'Multi-select, ⌘K', icon: ListChecks },
  { name: 'Pomodoro focus', tier: 'free', desc: '25-min sessions', icon: Timer },
  { name: 'AI breakdown', tier: 'free', desc: 'Split into steps', icon: Sparkles },
  { name: 'Built-in templates', tier: 'free', desc: 'Sprint, Bug, Content', icon: LayoutTemplate },
  { name: 'Public API (read)', tier: 'free', desc: 'Personal tokens', icon: Code2 },
  { name: 'Time tracking', tier: 'pro', desc: 'Manual + running', icon: Clock },
  { name: 'Team analytics', tier: 'pro', desc: 'Per-member insights', icon: BarChart3 },
  { name: 'HD AI breakdown', tier: 'pro', desc: '12 steps vs 6', icon: Wand2 },
  { name: 'Publish templates', tier: 'pro', desc: 'Sell on marketplace', icon: Upload },
  { name: 'GitHub + Slack', tier: 'pro', desc: 'PR sync, alerts', icon: Github },
  { name: 'Webhooks + write API', tier: 'pro', desc: 'POST/PATCH/DELETE', icon: Webhook },
  { name: 'Self-hosting license', tier: 'pro', desc: 'Run on your servers', icon: KeyRound },
  { name: 'SAML SSO', tier: 'enterprise', desc: 'Okta, Azure, Google', icon: Building2 },
  { name: 'SCIM provisioning', tier: 'enterprise', desc: 'Auto-sync from IdP', icon: Users },
  { name: 'Audit export', tier: 'enterprise', desc: 'Compliance logs', icon: FileText },
];

const TIERS: { key: Tier; label: string }[] = [
  { key: 'free', label: 'Free' },
  { key: 'pro', label: 'Pro' },
  { key: 'enterprise', label: 'Enterprise' },
];

const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, enterprise: 2 };

/**
 * Marketing page section: interactive tier matrix. Pure client state — no
 * entitlements call, no network. Lets a signed-out visitor switch tiers
 * to see what unlocks. Matches the mockup exactly.
 */
const TierGating: React.FC = () => {
  const [selected, setSelected] = useState<Tier>('free');
  const selectedRank = TIER_RANK[selected];
  const unlocked = FEATURES.filter((f) => TIER_RANK[f.tier] <= selectedRank).length;
  const locked = FEATURES.length - unlocked;

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            Tier gating
          </p>
          <h2 className="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Start free. Unlock power when you need it.
          </h2>
          <p className="mt-3 text-base leading-relaxed text-ink-muted">
            Every feature below is real. Switch tiers to see exactly what unlocks.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-[11px]">
          <span className="text-ink-muted">
            <span className="font-semibold text-ink tabular-nums">{unlocked}</span> unlocked
          </span>
          {locked > 0 && (
            <span className="text-ink-faint">
              <span className="font-semibold tabular-nums">{locked}</span> locked
            </span>
          )}
        </div>
      </div>

      <div className="mb-8 inline-flex rounded-lg border border-line bg-surface p-1">
        {TIERS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setSelected(t.key)}
            className="relative rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors"
            aria-pressed={selected === t.key}
          >
            {selected === t.key && (
              <motion.div
                layoutId="tier-toggle"
                className="absolute inset-0 rounded-md bg-raised"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={twMerge(
                'relative z-10',
                selected === t.key ? 'text-ink' : 'text-ink-muted',
              )}
            >
              {t.label}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map((f) => {
          const locked = TIER_RANK[f.tier] > selectedRank;
          const Icon = f.icon;
          return (
            <motion.div
              key={f.name}
              animate={{ opacity: locked ? 0.4 : 1, scale: locked ? 0.98 : 1 }}
              transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
              className={twMerge(
                'relative rounded-lg border p-3.5 transition-colors',
                locked ? 'border-line-subtle bg-surface/60' : 'border-line bg-surface',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={twMerge(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md',
                    locked ? 'bg-line-subtle text-ink-faint' : 'bg-brand-subtle text-brand',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <AnimatePresence initial={false}>
                  {locked && (
                    <motion.span
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="flex shrink-0 items-center gap-1 rounded-sm border border-line bg-raised px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-ink-faint"
                    >
                      <Lock className="h-2 w-2" />
                      {f.tier === 'pro' ? 'Pro' : 'Ent'}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <p className="mt-2 text-[12px] font-medium text-ink">{f.name}</p>
              <p className="mt-0.5 text-[10px] leading-relaxed text-ink-faint">{f.desc}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};

export default TierGating;