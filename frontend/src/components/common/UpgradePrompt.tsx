import React from 'react';
import { useNavigate } from 'react-router-dom';
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
 * Rendered by <FeatureGate> when the caller lacks the feature, and also
 * usable directly when a component wants to draw its own fallback.
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
    <div className="rounded-2xl border border-accent/30 bg-accent/5 p-4">
      <p className="mb-1 text-sm font-semibold text-ink">
        {title}
        <ProBadge />
      </p>
      {description && (
        <p className="mb-3 text-xs text-ink-muted">{description}</p>
      )}
      <button
        type="button"
        onClick={() => navigate(upgradePath)}
        className="btn-accent rounded-full px-4 py-2 text-xs font-semibold"
      >
        {ctaLabel}
      </button>
    </div>
  );
};

export default UpgradePrompt;
