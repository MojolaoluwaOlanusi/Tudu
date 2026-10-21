import React from 'react';

interface SyncTermsChangedModalProps {
  error: string;
  onClose: () => void;
  onBuy: () => void;
}

const SyncTermsChangedModal: React.FC<SyncTermsChangedModalProps> = ({ error, onClose, onBuy }) => {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose} role="presentation">
      <div className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <h2 className="mb-2 font-handwritten text-2xl text-ink">Update Blocked</h2>
        <p className="mb-5 text-sm text-ink-muted">{error}</p>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
          <button type="button" onClick={onBuy} className="btn-accent">Buy New Version</button>
        </div>
      </div>
    </div>
  );
};

export default SyncTermsChangedModal;
