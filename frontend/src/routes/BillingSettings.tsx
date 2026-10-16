import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useEntitlements, useCancelSubscription } from '../hooks/useBilling';
import { useUiStore } from '../store/uiStore';

const formatDate = (iso: string | null): string => {
  if (!iso) return '\u2014';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '\u2014';
  return d.toLocaleDateString();
};

const BillingSettings: React.FC = () => {
  const navigate = useNavigate();
  const { data: ent, isLoading } = useEntitlements();
  const cancel = useCancelSubscription();
  const pushToast = useUiStore((s) => s.pushToast);

  if (isLoading) {
    return <p className="text-sm text-ink-muted">Loading...</p>;
  }

  const isPro = ent?.tier === 'pro';

  const handleCancel = () => {
    if (!window.confirm('Cancel your Pro subscription at the end of this period?')) return;
    cancel.mutate(undefined, {
      onSuccess: () => pushToast('Subscription will cancel at period end', 'success'),
      onError: () => pushToast('Could not cancel the subscription', 'error'),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 font-handwritten text-3xl text-ink">Billing</h1>

      <section className="card mb-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Current plan
            </p>
            <p className="font-handwritten text-2xl text-ink">
              {isPro ? 'Pro' : 'Free'}
            </p>
          </div>
          {!isPro && (
            <button
              type="button"
              onClick={() => navigate('/pricing')}
              className="btn-accent rounded-full px-4 py-2 text-sm font-semibold"
            >
              Upgrade
            </button>
          )}
        </div>

        {isPro && ent?.subscription && (
          <dl className="mt-5 grid grid-cols-2 gap-3 text-xs">
            <div>
              <dt className="text-ink-muted">Renews on</dt>
              <dd className="text-ink">{formatDate(ent.subscription.currentPeriodEnd)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">AI credits</dt>
              <dd className="text-ink">{ent.aiCreditsRemaining}</dd>
            </div>
          </dl>
        )}

        {isPro && !ent?.subscription?.cancelAtPeriodEnd && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={cancel.isPending}
            className="mt-5 rounded-lg border border-hairline bg-surface px-3 py-2 text-xs font-semibold text-red-500 hover:border-red-300 disabled:opacity-60"
          >
            {cancel.isPending ? 'Cancelling...' : 'Cancel subscription'}
          </button>
        )}

        {ent?.subscription?.cancelAtPeriodEnd && (
          <p className="mt-5 text-xs text-amber-500">
            Your subscription will end on {formatDate(ent.subscription.currentPeriodEnd)}.
          </p>
        )}
      </section>
    </div>
  );
};

export default BillingSettings;
