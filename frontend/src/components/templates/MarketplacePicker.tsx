import React, { useState } from 'react';
import {
  useMarketplaceTemplates,
  useInstallMarketplaceTemplate,
  useMyTemplatePurchases,
  useSyncMarketplaceTemplate,
} from '../../hooks/useTemplates';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import MarketplaceBuyModal from './MarketplaceBuyModal';
import EditTemplateModal from './EditTemplateModal';
import SyncTermsChangedModal from './SyncTermsChangedModal';
import type { Board } from '../../types/board';
import type { MarketplaceTemplate } from '../../services/templateService';

interface MarketplacePickerProps {
  onInstalled: (board: Board) => void;
  disabled?: boolean;
}

const formatPrice = (t: MarketplaceTemplate): string => {
  if (t.price_kobo === 0) return 'Free';
  const naira =
    '₦' +
    (t.price_kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 });
  return t.rental_days > 0 ? `Rent ${naira} / ${t.rental_days}d` : naira;
};

/**
 * Step 11 polish: the card header is now emoji + name + price pill in one
 * row, description sits under it, chips are quieter (`bg-surface-2` pills),
 * and the action button inherits `btn-accent brush-stroke` for paid
 * installs so the primary action reads like every other primary action in
 * the app. Behaviour unchanged: same hooks, same install/sync flow, same
 * modals for buy / edit / sync-terms-changed.
 */
const MarketplacePicker: React.FC<MarketplacePickerProps> = ({
  onInstalled,
  disabled,
}) => {
  const { data: templates = [], isLoading } = useMarketplaceTemplates();
  const { data: purchases = [] } = useMyTemplatePurchases();
  const install = useInstallMarketplaceTemplate();
  const sync = useSyncMarketplaceTemplate();
  const pushToast = useUiStore((s) => s.pushToast);
  const myId = useAuthStore((s) => s.user?.id);

  const [buyingTemplate, setBuyingTemplate] = useState<MarketplaceTemplate | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<MarketplaceTemplate | null>(null);
  const [syncError, setSyncError] = useState<{ error: string; template: MarketplaceTemplate } | null>(null);

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

  const handleSync = async (t: MarketplaceTemplate) => {
    try {
      await sync.mutateAsync(t.id);
      pushToast('Board updated with the latest template version', 'success');
    } catch (err) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not sync template';
      if (status === 402) {
        setSyncError({ error: detail, template: t });
      } else {
        pushToast(detail, 'error');
      }
    }
  };

  if (isLoading) return <p className="text-sm text-ink-muted">Loading...</p>;
  if (templates.length === 0)
    return <p className="text-sm text-ink-muted">No community templates yet.</p>;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((t) => {
          const isAuthor = t.author_id === myId;
          const purchase = purchases.find(
            (p) => p.template_id === t.id && p.status === 'success',
          );
          const hasUpdate = purchase && t.version > purchase.version_bought;

          return (
            <div
              key={t.id}
              className="group flex flex-col rounded-2xl border border-line-subtle bg-surface p-4 transition-all hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/15 text-lg"
                  >
                    📦
                  </span>
                  <p className="min-w-0 truncate font-handwritten text-lg text-ink">
                    {t.name}
                  </p>
                </div>
                <span
                  className={
                    'shrink-0 rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ' +
                    (t.price_kobo > 0
                      ? 'bg-brand/15 text-brand'
                      : 'bg-line-subtle text-ink-muted')
                  }
                >
                  {formatPrice(t)}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-ink-muted">
                {t.description || 'No description'}
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5 text-[10px] text-ink-faint">
                <span className="rounded-sm bg-surface-2 px-1.5 py-0.5">
                  {t.category}
                </span>
                <span className="rounded-sm bg-surface-2 px-1.5 py-0.5">
                  v{t.version}
                </span>
                <span className="rounded-sm bg-surface-2 px-1.5 py-0.5">
                  {t.install_count} installs
                </span>
              </div>

              <div className="mt-auto pt-3">
                {isAuthor ? (
                  <button
                    onClick={() => setEditingTemplate(t)}
                    className="w-full rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink transition-colors hover:border-brand hover:text-brand"
                  >
                    Edit template
                  </button>
                ) : hasUpdate ? (
                  <button
                    onClick={() => handleSync(t)}
                    disabled={sync.isPending}
                    className="btn-accent w-full rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  >
                    {sync.isPending ? 'Updating…' : 'Update available'}
                  </button>
                ) : (
                  <button
                    onClick={() => handleClick(t)}
                    disabled={disabled || install.isPending}
                    className="btn-accent brush-stroke w-full rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  >
                    {t.price_kobo > 0
                      ? t.rental_days > 0
                        ? 'Rent & install'
                        : 'Buy & install'
                      : 'Install'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {buyingTemplate && (
        <MarketplaceBuyModal
          template={buyingTemplate}
          onInstalled={(b) => {
            setBuyingTemplate(null);
            onInstalled(b);
          }}
          onClose={() => setBuyingTemplate(null)}
        />
      )}
      {editingTemplate && (
        <EditTemplateModal
          template={editingTemplate}
          onClose={() => setEditingTemplate(null)}
        />
      )}
      {syncError && (
        <SyncTermsChangedModal
          error={syncError.error}
          onClose={() => setSyncError(null)}
          onBuy={() => {
            const t = syncError.template;
            setSyncError(null);
            setBuyingTemplate(t);
          }}
        />
      )}
    </>
  );
};

export default MarketplacePicker;