import React, { useState } from 'react';
import TemplatePicker from '../templates/TemplatePicker';
import { useInstallTemplate } from '../../hooks/useTemplates';
import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';

interface TemplateGalleryModalProps {
  onClose: () => void;
}

/**
 * 'Create a board from a template' flow.
 *
 * Reuses TemplatePicker from the onboarding wizard (4.2), so the two flows
 * stay in step. On success the new board becomes the active one and the
 * modal closes - the user asked for a board, so the board should be what
 * they see next.
 */
const TemplateGalleryModal: React.FC<TemplateGalleryModalProps> = ({ onClose }) => {
  const install = useInstallTemplate();
  const setActiveBoard = useBoardStore((s) => s.setActiveBoard);
  const pushToast = useUiStore((s) => s.pushToast);
  const [picking, setPicking] = useState<string | null>(null);

  const handleSelect = (slug: string) => {
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

  const busy = install.isPending;

  return (
    <div
      className='fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4'
      onClick={onClose}
      role='presentation'
    >
      <div
        className='max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl sm:p-6'
        onClick={(event) => event.stopPropagation()}
        role='dialog'
        aria-modal='true'
        aria-label='Create a board from a template'
      >
        <div className='mb-5 flex items-start justify-between gap-3'>
          <div>
            <h2 className='font-handwritten text-2xl text-ink'>Start from a template</h2>
            <p className='mt-0.5 text-xs text-ink-muted'>
              Each template comes with columns and a few example cards.
            </p>
          </div>
          <button
            type='button'
            onClick={onClose}
            aria-label='Close'
            className='rounded-full border border-hairline bg-surface-2 px-3 py-1.5 text-sm text-ink-muted hover:text-ink'
          >
            Close
          </button>
        </div>

        <TemplatePicker onSelect={handleSelect} disabled={busy} />

        {picking && (
          <p className='mt-4 text-xs text-ink-muted' aria-live='polite'>
            Setting up {picking}...
          </p>
        )}
      </div>
    </div>
  );
};

export default TemplateGalleryModal;
