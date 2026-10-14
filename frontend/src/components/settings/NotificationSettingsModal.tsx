import React from 'react';
import { createPortal } from 'react-dom';
import {
  useNotificationPreferences,
  useSetReminders,
} from '../../hooks/useNotifications';
import { useUiStore } from '../../store/uiStore';

interface NotificationSettingsModalProps {
  onClose: () => void;
}

/**
 * Notification preferences (feature 4.11).
 *
 * Rendered via portal to document.body, so no ancestor stacking context
 * can trap it - same pattern as the API tokens modal. The one control
 * today is the reminders toggle; the layout leaves room for more without
 * a redesign.
 */
const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  onClose,
}) => {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const setReminders = useSetReminders();
  const pushToast = useUiStore((s) => s.pushToast);

  const remindersOn = prefs?.reminders ?? false;

  const handleToggle = () => {
    const next = !remindersOn;
    setReminders.mutate(next, {
      onSuccess: () =>
        pushToast(
          next ? 'Daily reminders on' : 'Daily reminders off',
          'success'
        ),
      onError: () => pushToast('Could not save the preference', 'error'),
    });
  };

  const lastSent =
    prefs?.last_sent_at &&
    !Number.isNaN(new Date(prefs.last_sent_at).getTime())
      ? new Date(prefs.last_sent_at).toLocaleString()
      : null;

  const content = (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/60"
      onClick={onClose}
      role="presentation"
      style={{ paddingTop: 'max(4rem, env(safe-area-inset-top, 0px) + 4rem)' }}
    >
      <div className="flex min-h-full items-start justify-center px-3 pb-8 sm:px-4">
        <div
          className="w-full max-w-md rounded-2xl border border-hairline bg-surface p-5 shadow-2xl sm:p-6"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Notification settings"
        >
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2 className="font-handwritten text-2xl text-ink">Notifications</h2>
              <p className="mt-0.5 text-xs text-ink-muted">
                We will only email you about what you ask for.
              </p>
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

          {isLoading ? (
            <p className="text-sm text-ink-muted">Loading...</p>
          ) : (
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-surface-2 p-4">
              <input
                type="checkbox"
                checked={remindersOn}
                onChange={handleToggle}
                disabled={setReminders.isPending}
                className="mt-0.5 h-4 w-4 accent-accent"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  Daily due-date reminders
                </span>
                <span className="mt-0.5 block text-xs text-ink-muted">
                  One email a day listing tasks that are due or overdue.
                  Sent at 07:00 UTC.
                </span>
              </span>
            </label>
          )}

          {lastSent && (
            <p className="mt-4 text-[11px] text-ink-muted">
              Last reminder sent: {lastSent}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};

export default NotificationSettingsModal;
