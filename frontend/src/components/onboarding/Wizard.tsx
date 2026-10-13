import React, { useState } from 'react';
import TemplatePicker from '../templates/TemplatePicker';
import { useSeedBoard } from '../../hooks/useOnboarding';
import { useUiStore } from '../../store/uiStore';

interface WizardProps {
  onDone: () => void;
}

/**
 * First-run onboarding wizard.
 *
 * Shown by <WizardRoot /> to a signed-in user who has not yet completed it and
 * whose board is still empty. The user picks a template; the backend rewrites
 * their first personal board in place, and the wizard closes.
 *
 * Skipping ("Set up later") also counts as completing the wizard — the flag
 * is set on the client either way, so the user is not asked twice.
 */
const Wizard: React.FC<WizardProps> = ({ onDone }) => {
  const seed = useSeedBoard();
  const pushToast = useUiStore((s) => s.pushToast);
  const [picking, setPicking] = useState<string | null>(null);

  const handleSelect = (slug: string) => {
    setPicking(slug);
    seed.mutate(slug, {
      onSuccess: () => {
        pushToast(
          slug === 'blank' ? 'Ready when you are.' : 'Your board is ready.',
          'success'
        );
        onDone();
      },
      onError: (err) => {
        const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
        pushToast(detail || 'Could not set up the board', 'error');
        setPicking(null);
      },
    });
  };

  const busy = seed.isPending;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Tudu"
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-hairline bg-surface p-5 shadow-xl sm:p-6">
        <div className="mb-5">
          <h2 className="font-handwritten text-3xl text-ink">Welcome to Tudu 👋</h2>
          <p className="mt-1 text-sm text-ink-muted">
            Pick a starter board. You can rename it, reshape the columns, or start
            over at any time.
          </p>
        </div>

        <TemplatePicker onSelect={handleSelect} disabled={busy} />

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="text-xs font-semibold text-ink-muted hover:text-ink disabled:opacity-60"
          >
            Set up later
          </button>
          {picking && (
            <p className="text-xs text-ink-muted" aria-live="polite">
              Setting up “{picking}”…
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Wizard;
