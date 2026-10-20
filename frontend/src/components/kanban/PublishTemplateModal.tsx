import React, { useState } from 'react';
import { usePublishTemplate } from '../../hooks/useTemplates';
import { useUiStore } from '../../store/uiStore';

interface PublishTemplateModalProps {
  boardId: string;
  initialName: string;
  onClose: () => void;
}

const CATEGORIES = [
  'General',
  'Engineering',
  'Marketing',
  'Personal',
  'Design',
];

const MIN_PRICE_NAIRA = 100;

/**
 * The "Publish as template" form.
 *
 * The price field is in naira; the backend stores it in kobo. 0 keeps
 * the template free. Any non-zero value must be at least ₦100 - the
 * backend enforces this too, but validating here gives instant feedback.
 */
const PublishTemplateModal: React.FC<PublishTemplateModalProps> = ({
  boardId,
  initialName,
  onClose,
}) => {
  const publish = usePublishTemplate();
  const pushToast = useUiStore((s) => s.pushToast);
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('General');
  const [priceNaira, setPriceNaira] = useState('');

  const numericPrice = priceNaira.trim() === '' ? 0 : Number(priceNaira);
  const priceValid =
    Number.isFinite(numericPrice) && (numericPrice === 0 || numericPrice >= MIN_PRICE_NAIRA);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!priceValid) {
      pushToast('Price must be 0 (free) or at least ₦' + MIN_PRICE_NAIRA, 'error');
      return;
    }
    publish.mutate(
      {
        board_id: boardId,
        name,
        description,
        category,
        price_kobo: Math.round(numericPrice * 100),
      },
      {
        onSuccess: () => {
          pushToast('Template published to marketplace', 'success');
          onClose();
        },
        onError: (err) => {
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast(detail || 'Could not publish template', 'error');
        },
      }
    );
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Publish as template"
      >
        <h2 className="mb-4 font-handwritten text-2xl text-ink">Publish as template</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={255}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
              rows={3}
              maxLength={500}
              className="input w-full"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input w-full"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-ink-muted">
              Price (₦)
            </label>
            <input
              type="number"
              value={priceNaira}
              onChange={(e) => setPriceNaira(e.target.value)}
              min={0}
              step={50}
              placeholder="0 for free, or ≥ 100 to sell"
              className="input w-full"
            />
            <p className="mt-1 text-[11px] text-ink-muted">
              Leave blank or 0 to publish for free. To sell, set at least
              ₦{MIN_PRICE_NAIRA}. Tudu keeps 30% of each sale.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={publish.isPending || !name.trim() || !priceValid}
              className="btn-accent"
            >
              {publish.isPending ? 'Publishing...' : 'Publish'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PublishTemplateModal;
