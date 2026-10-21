import React, { useState } from 'react';
import { useMarketplaceTemplates, useInstallMarketplaceTemplate, useMyTemplatePurchases, useSyncMarketplaceTemplate } from '../../hooks/useTemplates';
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
  const naira = '₦' + (t.price_kobo / 100).toLocaleString('en-NG', { maximumFractionDigits: 0 });
  return t.rental_days > 0 ? `Rent ${naira} / ${t.rental_days}d` : naira;
};

const MarketplacePicker: React.FC<MarketplacePickerProps> = ({ onInstalled, disabled }) => {
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
      const status = (err as { response?: { status?: number; data?: { error?: string } } })?.response?.status;
      const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Could not sync template';
      if (status === 402) {
        setSyncError({ error: detail, template: t });
      } else {
        pushToast(detail, 'error');
      }
    }
  };

  if (isLoading) return <p className="text-sm text-ink-muted">Loading...</p>;
  if (templates.length === 0) return <p className="text-sm text-ink-muted">No community templates yet.</p>;

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((t) => {
          const isAuthor = t.author_id === myId;
          const purchase = purchases.find((p) => p.template_id === t.id && p.status === 'success');
          const hasUpdate = purchase && t.version > purchase.version_bought;

          return (
            <div key={t.id} className="group flex flex-col items-start gap-2 rounded-2xl border border-hairline bg-surface-2 p-4 text-left transition-all hover:border-accent hover:shadow-md">
              <div className="flex w-full items-start justify-between gap-2">
                <div className="text-3xl" aria-hidden="true">📦</div>
                <span className={'rounded-full px-2 py-0.5 text-[11px] font-semibold ' + (t.price_kobo > 0 ? 'bg-accent/15 text-accent-strong' : 'bg-surface text-ink-muted')}>
                  {formatPrice(t)}
                </span>
              </div>
              <div className="w-full">
                <p className="font-handwritten text-xl text-ink">{t.name}</p>
                <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{t.description || 'No description'}</p>
              </div>
              <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-ink-muted">
                <span className="rounded-full bg-surface px-2 py-0.5">{t.category}</span>
                <span className="rounded-full bg-surface px-2 py-0.5">v{t.version}</span>
                <span className="rounded-full bg-surface px-2 py-0.5">{t.install_count} installs</span>
              </div>

              <div className="mt-3 w-full">
                {isAuthor ? (
                  <button onClick={() => setEditingTemplate(t)} className="w-full rounded-lg border border-hairline bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent">
                    Edit Template
                  </button>
                ) : hasUpdate ? (
                  <button onClick={() => handleSync(t)} disabled={sync.isPending} className="w-full rounded-lg border border-accent bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-strong hover:bg-accent/20 disabled:opacity-60">
                    {sync.isPending ? 'Updating...' : 'Update Available'}
                  </button>
                ) : (
                  <button onClick={() => handleClick(t)} disabled={disabled || install.isPending} className="w-full rounded-lg bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-accent border border-transparent hover:border-accent">
                    {t.price_kobo > 0 ? (t.rental_days > 0 ? 'Rent & Install' : 'Buy & Install') : 'Install'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {buyingTemplate && <MarketplaceBuyModal template={buyingTemplate} onInstalled={(b) => { setBuyingTemplate(null); onInstalled(b); }} onClose={() => setBuyingTemplate(null)} />}
      {editingTemplate && <EditTemplateModal template={editingTemplate} onClose={() => setEditingTemplate(null)} />}
      {syncError && <SyncTermsChangedModal error={syncError.error} onClose={() => setSyncError(null)} onBuy={() => { const t = syncError.template; setSyncError(null); setBuyingTemplate(t); }} />}
    </>
  );
};

export default MarketplacePicker;
