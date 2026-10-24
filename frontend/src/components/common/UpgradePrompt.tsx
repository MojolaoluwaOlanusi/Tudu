import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import ProBadge from './ProBadge';

interface UpgradePromptProps {
  /** The human-readable feature name, e.g. "Deeper AI breakdown". */
  title: string;
  /** One sentence explaining what the feature does. */
  description?: string;
  /** Path to send the user to on click. Falls back to /pricing. */
  upgradePath?: string;
  /** Optional override for the button label. */
  ctaLabel?: string;
  /** Compact variant for use inside a small card or a modal footer. */
  compact?: boolean;
}

/**
 * The card shown in place of a locked feature.
 *
 * Restyled in Step 13 to the mockup's `UpgradeCard` pattern
 * (see `TeamAnalytics.jsx`): a card with a green-tinted Lock icon, a title,
 * an optional one-line description, and a brand-filled CTA. This restyle
 * cascades to every place `FeatureGate` gates a feature: Analytics > Team,
 * AI HD breakdown, license issue, time tracking, and the compact badge on
 * the AI breakdown modal.
 *
 * The CTA label default ("See plans") and the destination default
 * (`/pricing`) are intentionally unchanged — a pre-existing test asserts
 * the presence of a `button` with accessible name matching /see plans/i.
 */
const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  title,
  description,
  upgradePath = '/pricing',
  ctaLabel = 'See plans',
  compact = false,
}) => {
  const navigate = useNavigate();

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => navigate(upgradePath)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 px-3 py-2 text-left text-xs text-ink-muted transition-colors hover:border-accent/60 hover:bg-accent/10"
      >
        <span className="min-w-0 flex-1 truncate">
          <span className="text-ink">{title}</span>
          <ProBadge />
        </span>
        <span className="shrink-0 font-semibold text-accent-strong">Upgrade</span>
      </button>
    );
  }

  return (
    <div className="card border-accent/30 bg-brand-subtle/10 p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand">
          <Lock className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {title}
            <ProBadge />
          </p>
          {description && (
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
              {description}
            </p>
          )}
          <button
            type="button"
            onClick={() => navigate(upgradePath)}
            className="mt-3 inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1.5 text-[12px] font-semibold text-ink-inverse transition-colors hover:bg-brand-hover"
          >
            {ctaLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradePrompt;