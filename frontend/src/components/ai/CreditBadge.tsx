import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEntitlements } from '../../hooks/useBilling';

interface CreditBadgeProps {
  /** Compact variant strips the label and shows just the number. */
  compact?: boolean;
}

/**
 * The "N credits left · Buy more" strip shown above the AI modal's
 * breakdown list. Renders nothing for Free users - they are not
 * metered, so showing them a balance would be confusing.
 *
 * The "Buy more" link goes to /settings/billing, where the purchase
 * buttons live (that part is a separate component, since billing
 * settings is where all money-related actions belong).
 */
const CreditBadge: React.FC<CreditBadgeProps> = ({ compact = false }) => {
  const { data } = useEntitlements();
  const navigate = useNavigate();

  if (!data || data.tier !== 'pro') return null;

  const remaining = data.aiCreditsRemaining;
  const low = remaining <= 10;

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => navigate('/settings/billing')}
        className={
          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors ' +
          (low
            ? 'border-amber-400/50 bg-amber-400/10 text-amber-400 hover:border-amber-400'
            : 'border-hairline bg-surface-2 text-ink-muted hover:border-accent hover:text-ink')
        }
        title="AI credits remaining"
      >
        {remaining} cr
      </button>
    );
  }

  return (
    <div
      className={
        'flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs ' +
        (low ? 'border-amber-400/40 bg-amber-400/10' : 'border-hairline bg-surface-2')
      }
    >
      <span className="text-ink-muted">
        <span className={low ? 'font-semibold text-amber-400' : 'font-semibold text-ink'}>
          {remaining}
        </span>{
          ' ' + (remaining === 1 ? 'credit' : 'credits') + ' remaining'
        }
      </span>
      <button
        type="button"
        onClick={() => navigate('/settings/billing')}
        className="shrink-0 font-semibold text-accent-strong hover:text-accent"
      >
        Buy more
      </button>
    </div>
  );
};

export default CreditBadge;
