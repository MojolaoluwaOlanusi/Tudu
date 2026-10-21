import React from 'react';
import {
  useMyTemplatePurchases,
  useRefundTemplatePurchase,
} from '../../hooks/useTemplates';
import { useUiStore } from '../../store/uiStore';

const formatNaira = (kobo: number): string =>
  '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 });

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
};

/**
 * The buyer's template purchase history with a refund button on
 * purchases that are still eligible (status = success). Refunded
 * purchases are shown greyed out with the refund date.
 */
const PurchasesList: React.FC = () => {
  const { data: purchases = [], isLoading } = useMyTemplatePurchases();
  const refund = useRefundTemplatePurchase();
  const pushToast = useUiStore((s) => s.pushToast);

  if (isLoading) return null;
  if (purchases.length === 0) return null;

  const handleRefund = (reference: string, amount: number) => {
    if (!window.confirm('Request a refund of ' + formatNaira(amount) + '?')) return;
    refund.mutate(reference, {
      onSuccess: () => pushToast('Refund processed', 'success'),
      onError: (err) => {
        const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        pushToast(detail || 'Could not process refund', 'error');
      },
    });
  };

  return (
    <section className="card mb-5 p-5">
      <h2 className="mb-3 font-handwritten text-xl text-ink">Your template purchases</h2>
      <ul className="space-y-2">
        {purchases.map((p) => {
          const refundable = p.status === 'success';
          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.template_name}</p>
                <p className="text-[11px] text-ink-muted">
                  {formatNaira(p.amount_kobo)} · purchased {formatDate(p.created_at)}
                  {p.status === 'refunded' && (
                    <span className="text-amber-500"> · refunded {formatDate(p.refunded_at)}</span>
                  )}
                </p>
              </div>
              {refundable && (
                <button
                  type="button"
                  onClick={() => handleRefund(p.reference, p.amount_kobo)}
                  disabled={refund.isPending}
                  className="shrink-0 rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:border-red-300 disabled:opacity-60"
                >
                  {refund.isPending ? 'Refunding...' : 'Refund'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default PurchasesList;
