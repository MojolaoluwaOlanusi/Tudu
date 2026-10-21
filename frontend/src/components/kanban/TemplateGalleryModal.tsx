import React, { useState } from 'react';
import TemplatePicker from '../templates/TemplatePicker';
import MarketplacePicker from '../templates/MarketplacePicker';
import { useInstallTemplate } from '../../hooks/useTemplates';
import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';
import type { Board } from '../../types/board';

interface TemplateGalleryModalProps {
  onClose: () => void;
}

/**
 * "Create a board from a template".
 *
 * Two tabs. Built-in uses the static catalogue from 4.9; Marketplace
 * fetches published templates from the API. The marketplace picker
 * manages its own install flow (including the paid-template checkout),
 * so this modal only needs to react to a completed install.
 */
const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({ onClose }) => {
  const [tab, setTab] = useState<'builtin' | 'marketplace'>('builtin');
  const install = useInstallTemplate();
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const pushToast = useUiStore((s) => s.pushToast);
  const [picking, setPicking] = useState<string | null>(null);

  const handleSelectBuiltin = (slug: string) => {
    setPicking(slug);
    install.mutate(
      { slug },
      {
        onSuccess: (board) => {
          setActiveBoard(board.id);
          pushToast('Board ' + JSON.stringify(board.name) + ' created from template', 'success');
          onClose();
        },
        onError: (err) => {
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast(detail || 'Could not create the board', 'error');
          setPicking(null);
        },
      }
    );
  };

  const handleInstalled = (board: Board) => {
    setActiveBoard(board.id);
    pushToast('Board ' + JSON.stringify(board.name) + ' created from template', 'success');
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl sm:p-6"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Create a board from a template"
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-handwritten text-2xl text-ink">
              Start from a template
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Each template comes with columns and a few example cards.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => setTab('builtin')}
                className={
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors ' +
                  (tab === 'builtin'
                    ? 'bg-accent text-white'
                    : 'bg-surface-2 text-ink-muted hover:text-ink')
                }
              >
                Built-in
              </button>
              <button
                type="button"
                onClick={() => setTab('marketplace')}
                className={
                  'rounded-full px-3 py-1 text-xs font-semibold transition-colors ' +
                  (tab === 'marketplace'
                    ? 'bg-accent text-white'
                    : 'bg-surface-2 text-ink-muted hover:text-ink')
                }
              >
                Marketplace
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:text-ink"
          >
            Close
          </button>
        </div>

        {tab === 'builtin' ? (
          <TemplatePicker onSelect={handleSelectBuiltin} disabled={install.isPending} />
        ) : (
          <MarketplacePicker onInstalled={handleInstalled} disabled={false} />
        )}

        {picking && tab === 'builtin' && (
          <p className="mt-4 text-xs text-ink-muted" aria-live="polite">
            Setting up {picking}...
          </p>
        )}
      </div>
    </div>
  );
};

export default TemplateGalleryModal;