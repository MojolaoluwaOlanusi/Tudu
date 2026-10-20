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

/**
 * The "Publish as template" form.
 *
 * Shown from BoardsModal. On submit, the backend snapshots the board's
 * columns and example tasks; nothing else from this modal is stored.
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    publish.mutate(
      { board_id: boardId, name, description, category },
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
        className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-xl"
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
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button
              type="submit"
              disabled={publish.isPending || !name.trim()}
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
