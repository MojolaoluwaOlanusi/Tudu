import React from 'react';
import { useMarketplaceTemplates } from '../../hooks/useTemplates';

interface MarketplacePickerProps {
  onSelect: (id: string) => void;
  disabled?: boolean;
}

/**
 * Grid of community-published templates.
 *
 * Rendered as the second tab of the gallery modal. Any signed-in user
 * can install; only Pro users can publish, but the button that publishes
 * lives in BoardsModal, not here, so no gating is needed on this card.
 */
const MarketplacePicker: React.FC<MarketplacePickerProps> = ({ onSelect, disabled }) => {
  const { data: templates = [], isLoading } = useMarketplaceTemplates();

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
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {templates.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          disabled={disabled}
          className="group flex flex-col items-start gap-2 rounded-2xl border border-hairline bg-surface-2 p-4 text-left transition-all hover:border-accent hover:shadow-md disabled:opacity-60"
        >
          <div className="text-3xl" aria-hidden="true">
            📦
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
            Use this template →
          </span>
        </button>
      ))}
    </div>
  );
};

export default MarketplacePicker;
