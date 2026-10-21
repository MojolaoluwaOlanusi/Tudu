import React, { useState } from 'react';
import { useBoards } from '../../hooks/useBoards';
import { useUpdateMarketplaceTemplate, useDeleteMarketplaceTemplate } from '../../hooks/useTemplates';
import { useUiStore } from '../../store/uiStore';
import type { MarketplaceTemplate } from '../../services/templateService';

interface EditTemplateModalProps {
  template: MarketplaceTemplate;
  onClose: () => void;
}

const EditTemplateModal: React.FC<EditTemplateModalProps> = ({ template, onClose }) => {
  const { data: boards = [] } = useBoards();
  const update = useUpdateMarketplaceTemplate();
  const del = useDeleteMarketplaceTemplate();
  const pushToast = useUiStore((s) => s.pushToast);

  const [name, setName] = useState(template.name);
  const [desc, setDesc] = useState(template.description || '');
  const [price, setPrice] = useState(template.price_kobo / 100);
  const [rental, setRental] = useState(template.rental_days);
  const [boardId, setBoardId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    update.mutate(
      { id: template.id, data: { name, description: desc, price_kobo: Math.round(price * 100), rental_days: rental, definition_board_id: boardId || undefined } },
      {
        onSuccess: () => {
          pushToast('Template updated', 'success');
          onClose();
        },
        onError: (err) => {
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast(detail || 'Could not update template', 'error');
        },
      }
    );
  };

  const handleDelete = () => {
    if (!window.confirm(`Permanently delete "${template.name}" from the marketplace? Anyone who already bought it will keep their copy.`)) return;
    del.mutate(template.id, {
      onSuccess: () => {
        pushToast('Template deleted', 'success');
        onClose();
      },
      onError: () => pushToast('Could not delete template', 'error'),
    });
  };

  const busy = update.isPending || del.isPending;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="flex items-start justify-between">
          <h2 className="mb-4 font-handwritten text-2xl text-ink">Edit Template</h2>
          <button type="button" onClick={handleDelete} disabled={busy} className="text-xs font-semibold text-red-500 hover:text-red-600 disabled:opacity-50">
            Delete Template
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="input w-full" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Price (₦)</label>
              <input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value))} min={0} step={50} className="input w-full" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-muted">Rental Days</label>
              <input type="number" value={rental} onChange={(e) => setRental(Number(e.target.value))} min={0} step={1} className="input w-full" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Update Contents (Optional)</label>
            <select value={boardId} onChange={(e) => setBoardId(e.target.value)} className="input w-full">
              <option value="">Keep existing contents</option>
              {boards.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <p className="mt-1 text-[11px] text-ink-muted">If you select a board, its columns and tasks will replace the template's contents.</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={busy} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={busy} className="btn-accent">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTemplateModal;