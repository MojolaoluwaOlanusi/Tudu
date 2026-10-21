import React, { useState } from 'react';
import { usePublishTemplate } from '../../hooks/useTemplates';
import { useUiStore } from '../../store/uiStore';

interface PublishTemplateModalProps {
  boardId: string;
  initialName: string;
  onClose: () => void;
}

const CATEGORIES = ['General', 'Engineering', 'Marketing', 'Personal', 'Design'];
const MIN_PRICE_NAIRA = 100;

const PublishTemplateModal: React.FC<PublishTemplateModalProps> = ({ boardId, initialName, onClose }) => {
  const publish = usePublishTemplate();
  const pushToast = useUiStore((s) => s.pushToast);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priceNaira, setPriceNaira] = useState('');
  const [rentalDays, setRentalDays] = useState('0');

  const numericPrice = priceNaira.trim() === '' ? 0 : Number(priceNaira);
  const priceValid = Number.isFinite(numericPrice) && (numericPrice === 0 || numericPrice >= MIN_PRICE_NAIRA);
  const isRental = Number(rentalDays) > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceValid) {
      pushToast('Price must be 0 (free) or at least ₦' + MIN_PRICE_NAIRA, 'error');
      return;
    }
    publish.mutate(
      { board_id: boardId, name, description, category, price_kobo: Math.round(numericPrice * 100), rental_days: Number(rentalDays) },
      {
        onSuccess: () => { pushToast('Template published', 'success'); onClose(); },
        onError: (err) => {
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast(detail || 'Could not publish template', 'error');
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="mb-4 font-handwritten text-2xl text-ink">Publish as template</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required maxLength={255} className="input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is this template for?" rows={3} maxLength={500} className="input w-full" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input w-full">
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">Price (₦)</label>
            <input type="number" value={priceNaira} onChange={(e) => setPriceNaira(e.target.value)} min={0} step={50} placeholder="0 for free" className="input w-full" />
            <p className="mt-1 text-[11px] text-ink-muted">To sell, set at least ₦100. Tudu keeps 30%.</p>
          </div>
          {numericPrice >= MIN_PRICE_NAIRA && (
            <div className="pt-2">
              <label className="mb-1 block text-xs font-medium text-ink-muted">Rental Period (Days)</label>
              <input type="number" value={rentalDays} onChange={(e) => setRentalDays(e.target.value)} min={0} step={1} placeholder="0 for one-time purchase" className="input w-full" />
              <p className="mt-1 text-[11px] text-ink-muted">Leave 0 for a permanent buy. Set e.g. 30 to rent it out for 30 days.</p>
            </div>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
            <button type="submit" disabled={publish.isPending || !name.trim() || !priceValid} className="btn-accent">
              {publish.isPending ? 'Publishing...' : (isRental ? 'Publish Rental' : 'Publish')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublishTemplateModal;
