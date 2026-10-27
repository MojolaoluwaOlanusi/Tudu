import React from 'react';
import {
  useMyTemplatePurchases,
  useRefundTemplatePurchase,
} from '../../hooks/useTemplates';
import { useUiStore } from '../../store/uiStore';
import { useConfirmStore } from '../../store/confirmStore';

const formatNaira = (kobo: number): string =>
  '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 });

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
};

/**
 * Buyer purchase history with a refund button on still-eligible purchases.
 *
 * Step 11 polish: rows use the standard `rounded-xl border border-line-subtle
 * bg-surface-2 p-3` layout, refunded purchases are marked with an amber
 * pill rather than relying on the red-tinted one, and the "refund window
 * expired" line sits in the row instead of as a full-width note.
 */
const PurchasesList: React.FC = () => {
  const confirm = useConfirmStore((s) => s.confirm);
  const { data: purchases = [], isLoading } = useMyTemplatePurchases();
  const refund = useRefundTemplatePurchase();
  const pushToast = useUiStore((s) => s.pushToast);

  if (isLoading) return null;
  if (purchases.length === 0) return null;

  const handleRefund = async (reference: string, amount: number) => {
    const ok = await confirm({
      title: 'Request a refund?',
      message: `Refund ${formatNaira(amount)}?`,
      confirmLabel: 'Refund',
    });
    if (!ok) return;
    refund.mutate(reference, {
      onSuccess: () => pushToast('Refund processed', 'success'),
      onError: (err) => {
        const detail = (err as { response?: { data?: { error?: string } } })
          ?.response?.data?.error;
        pushToast(detail || 'Could not process refund', 'error');
      },
    });
  };

  return (
    <section className="card mb-5 p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-handwritten text-xl text-ink">Your template purchases</h2>
        <span className="rounded-sm bg-raised px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">
          {purchases.length}
        </span>
      </div>
      <ul className="space-y-2">
        {purchases.map((p) => {
          const isSuccess = p.status === 'success';
          const isRefunded = p.status === 'refunded';
          const fourteenDaysMs = 14 * 24 * 60 * 60 * 1000;
          const isExpired = Date.now() - new Date(p.created_at).getTime() > fourteenDaysMs;
          const canRefund = isSuccess && !isExpired;

          return (
            <li
              key={p.id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-line-subtle bg-surface-2 p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">
                  {p.template_name}
                </p>
                <p className="truncate text-[11px] text-ink-muted">
                  {formatNaira(p.amount_kobo)} · purchased {formatDate(p.created_at)}
                  {isRefunded && (
                    <span className="ml-1.5 rounded-sm bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                      refunded {formatDate(p.refunded_at)}
                    </span>
                  )}
                </p>
              </div>

              {canRefund && (
                <button
                  type="button"
                  onClick={() => handleRefund(p.reference, p.amount_kobo)}
                  disabled={refund.isPending}
                  className="shrink-0 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs font-semibold text-red-400 transition-colors hover:border-red-400/60 disabled:opacity-60"
                >
                  {refund.isPending ? 'Refunding…' : 'Refund'}
                </button>
              )}

              {isSuccess && isExpired && (
                <span className="shrink-0 text-[11px] italic text-ink-faint">
                  Refund window expired
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default PurchasesList;