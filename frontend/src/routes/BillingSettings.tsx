import React from 'react';
import { useNavigate } from 'react-router-dom';
import PaystackPop from '@paystack/inline-js';
import {
  useEntitlements,
  useCancelSubscription,
  useBuyCredits,
} from '../hooks/useBilling';
import { useUiStore } from '../store/uiStore';
import PublisherSettings from '../components/settings/PublisherSettings';
import PurchasesList from '../components/settings/PurchasesList';


const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
};

/* ------------------------------------------------------------------ */
/* Buy more AI credits                                                 */
/* ------------------------------------------------------------------ */

interface BuyCreditsButtonProps {
  bundle: 'ai_500' | 'ai_2000';
  label: string;
}

const BuyCreditsButton: React.FC<BuyCreditsButtonProps> = ({ bundle, label }) => {
  const buy = useBuyCredits();
  const navigate = useNavigate();
  const pushToast = useUiStore((s) => s.pushToast);

  const handleClick = () => {
    buy.mutate(bundle, {
      onSuccess: (session) => {
        const popup = new PaystackPop();
        popup.resumeTransaction(session.access_code, {
          onSuccess: () => {
            pushToast('Credits purchased. They will appear shortly.', 'success');
            navigate('/settings/billing');
          },
          onCancel: () => pushToast('Purchase cancelled', 'info'),
          onError: (error: { message?: string }) =>
            pushToast(error?.message || 'Purchase failed', 'error'),
        });
      },
      onError: (err) => {
        const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        pushToast(detail || 'Could not start the purchase', 'error');
      },
    });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={buy.isPending}
      className="btn-accent rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-60"
    >
      {buy.isPending ? 'Opening checkout…' : label}
    </button>
  );
};

/* ------------------------------------------------------------------ */
/* The billing settings page                                           */
/* ------------------------------------------------------------------ */

const BillingSettings: React.FC = () => {
  const navigate = useNavigate();
  const { data: ent, isLoading } = useEntitlements();
  const cancel = useCancelSubscription();
  const pushToast = useUiStore((s) => s.pushToast);

  if (isLoading) {
    return <p className="text-sm text-ink-muted">Loading...</p>;
  }

  const isPro = ent?.tier === 'pro';
  const credits = ent?.aiCreditsRemaining ?? 0;

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

      {/* ---------------------- Current plan ---------------------- */}
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
              <dt className="text-ink-muted">Billing</dt>
              <dd className="text-ink">
                {ent.subscription.planCode === 'pro_yearly'
                  ? 'Pro Yearly · ₦75,000'
                  : 'Pro Monthly · ₦7,500'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">
                {ent.subscription.cancelAtPeriodEnd ? 'Ends on' : 'Renews on'}
              </dt>
              <dd className="text-ink">{formatDate(ent.subscription.currentPeriodEnd)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">AI credits</dt>
              <dd className="text-ink">{credits}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Status</dt>
              <dd className="text-ink capitalize">{ent.subscription.status}</dd>
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

      {/* ---------------------- Self-hosting ---------------------- */}
      {isPro && (
        <section className="card mb-5 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-handwritten text-xl text-ink">Self-hosting</h2>
              <p className="mt-1 max-w-md text-xs text-ink-muted">
                Run Tudu on your own server. Issue a signed license and download
                it to unlock Pro features on your self-hosted instance.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('/settings/license')}
              className="shrink-0 rounded-full border border-hairline bg-surface-2 px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-accent"
            >
              Manage licenses →
            </button>
          </div>
        </section>
      )}

      {/* ---------------------- Sell templates ---------------------- */}
      <PublisherSettings enabled={!!isPro} />

      {/* ---------------------- Your template purchases ---------------------- */}
      <PurchasesList />

      {/* ---------------------- Buy more AI credits ---------------------- */}
      {isPro && (
        <section className="card mb-5 p-5">
          <div className="mb-3">
            <h2 className="font-handwritten text-xl text-ink">Buy more AI credits</h2>
            <p className="mt-1 text-xs text-ink-muted">
              You have <span className="font-semibold text-ink">{credits}</span>{' '}
              credit{credits === 1 ? '' : 's'} remaining. Credits are one-off
              purchases and never expire.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <BuyCreditsButton bundle="ai_500" label="500 credits · ₦2,000" />
            <BuyCreditsButton bundle="ai_2000" label="2,000 credits · ₦7,000" />
          </div>
        </section>
      )}
    </div>
  );
};

export default BillingSettings;