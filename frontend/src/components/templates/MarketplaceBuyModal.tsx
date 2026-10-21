import React, { useState } from 'react';
import PaystackPop from '@paystack/inline-js';
import { useCheckoutMarketplace, useInstallMarketplaceTemplate } from '../../hooks/useTemplates';
import { useUiStore } from '../../store/uiStore';
import type { MarketplaceTemplate } from '../../services/templateService';
import type { Board } from '../../types/board';

interface MarketplaceBuyModalProps { template: MarketplaceTemplate; onInstalled: (board: Board) => void; onClose: () => void; }

const MarketplaceBuyModal: React.FC<MarketplaceBuyModalProps> = ({ template, onInstalled, onClose }) => {
  const checkout = useCheckoutMarketplace();
  const install = useInstallMarketplaceTemplate();
  const pushToast = useUiStore((s) => s.pushToast);
  const [busy, setBusy] = useState(false);

  const handleBuy = async () => {
    setBusy(true);
    try {
      const session = await checkout.mutateAsync(template.id);
      const popup = new PaystackPop();
      popup.resumeTransaction(session.access_code, {
        onSuccess: async () => {
          try {
            const board = await install.mutateAsync({ id: template.id, reference: session.reference });
            pushToast('Template installed', 'success');
            onInstalled(board);
          } catch (err) {
            const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
            pushToast(detail || 'Payment received. Install will be available shortly.', 'info');
            onClose();
          } finally { setBusy(false); }
        },
        onCancel: () => { pushToast('Purchase cancelled', 'info'); setBusy(false); },
        onError: (err: { message?: string }) => { pushToast(err?.message || 'Payment failed', 'error'); setBusy(false); },
      });
    } catch (err) {
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      pushToast(detail || 'Could not start checkout', 'error');
      setBusy(false);
    }
  };

  const actionText = template.rental_days > 0 ? 'Rent' : 'Pay';
  const periodText = template.rental_days > 0 ? ` for ${template.rental_days} days` : '';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="mb-1 font-handwritten text-2xl text-ink">{template.name}</h2>
        <p className="mb-4 text-xs text-ink-muted">{template.description || 'No description'}</p>
        <div className="mb-4 rounded-xl border border-hairline bg-surface-2 p-4">
          <p className="text-xs text-ink-muted">{template.rental_days > 0 ? 'Rental Price' : 'Price'}</p>
          <p className="font-handwritten text-3xl text-ink">₦{(template.price_kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 })}</p>
          <p className="mt-1 text-[11px] text-ink-muted">{template.rental_days > 0 ? `Valid for ${template.rental_days} days.` : 'One-time purchase, yours to keep.'}</p>
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost" disabled={busy}>Cancel</button>
          <button type="button" onClick={handleBuy} disabled={busy} className="btn-accent">
            {busy ? 'Opening checkout...' : actionText + ' ₦' + (template.price_kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 }) + periodText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceBuyModal;
