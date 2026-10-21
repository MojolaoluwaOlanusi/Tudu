import React, { useState } from 'react';
import { useMarketplaceTemplates, useInstallMarketplaceTemplate } from '../../hooks/useTemplates';
import { useUiStore } from '../../store/uiStore';
import MarketplaceBuyModal from './MarketplaceBuyModal';
import type { Board } from '../../types/board';
import type { MarketplaceTemplate } from '../../services/templateService';

interface MarketplacePickerProps {
  onInstalled: (board: Board) => void;
  disabled?: boolean;
}

const formatNaira = (kobo: number): string =>
  kobo === 0
    ? 'Free'
    : '₦' + (kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 });

/**
 * Grid of community-published templates.
 *
 * Clicking any template attempts an install. The backend returns 402
 * if the template is paid and no successful purchase exists - which
 * the picker handles by opening the buy modal. If the buyer already
 * owns the template, install just works.
 */
const MarketplacePicker: React.FC<MarketplacePickerProps> = ({ onInstalled, disabled }) => {
  const { data: templates = [], isLoading } = useMarketplaceTemplates();
  const install = useInstallMarketplaceTemplate();
  const pushToast = useUiStore((s) => s.pushToast);
  const [buyingTemplate, setBuyingTemplate] = useState<MarketplaceTemplate | null>(null);

  const handleClick = async (t: MarketplaceTemplate) => {
    try {
      const board = await install.mutateAsync({ id: t.id });
      onInstalled(board);
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 402) {
        setBuyingTemplate(t);
      } else {
        const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        pushToast(detail || 'Could not install the template', 'error');
      }
    }
  };

  if (isLoading) {
    return <p className="text-sm text-ink-muted">Loading community templates...</p>;
  }
  if (templates.length === 0) {
    return (
      <p className="text-sm text-ink-muted">
        No community templates yet. Be the first to publish one.
      </p>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => handleClick(t)}
            disabled={disabled || install.isPending}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-hairline bg-surface-2 p-4 text-left transition-all hover:border-accent hover:shadow-md disabled:opacity-60"
          >
            <div className="flex w-full items-start justify-between gap-2">
              <div className="text-3xl" aria-hidden="true">
                📦
              </div>
              <span
                className={
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold ' +
                  (t.price_kobo > 0
                    ? 'bg-accent/15 text-accent-strong'
                    : 'bg-surface text-ink-muted')
                }
              >
                {formatNaira(t.price_kobo)}
              </span>
            </div>
            <div>
              <p className="font-handwritten text-xl text-ink">{t.name}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">
                {t.description || 'No description'}
              </p>
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-ink-muted">
              <span className="rounded-full bg-surface px-2 py-0.5">{t.category}</span>
              <span className="rounded-full bg-surface px-2 py-0.5">
                {t.install_count} install{t.install_count === 1 ? '' : 's'}
              </span>
              {t.author_name && (
                <span className="rounded-full bg-surface px-2 py-0.5">
                  by {t.author_name}
                </span>
              )}
            </div>
            <span className="mt-2 text-xs font-semibold text-accent-strong opacity-0 transition-opacity group-hover:opacity-100">
              {t.price_kobo > 0 ? 'Buy & install' : 'Use this template'} →
            </span>
          </button>
        ))}
      </div>

      {buyingTemplate && (
        <MarketplaceBuyModal
          template={buyingTemplate}
          onInstalled={(board) => {
            setBuyingTemplate(null);
            onInstalled(board);
          }}
          onClose={() => setBuyingTemplate(null)}
        />
      )}
    </>
  );
};

export default MarketplacePicker;
