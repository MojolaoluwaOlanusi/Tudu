import React from 'react';
import { createPortal } from 'react-dom';
import {
  useNotificationPreferences,
  useUpdateNotifications,
} from '../../hooks/useNotifications';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { useUiStore } from '../../store/uiStore';

interface NotificationSettingsModalProps {
  onClose: () => void;
}

/**
 * Notification preferences (features 4.11, 4.12 and 5.5).
 *
 * Three toggles: due-date reminders (email), celebrations (confetti)
 * and browser notifications (push). Each is saved the moment it is
 * toggled, so there is no separate "Save" step.
 *
 * The push toggle has three possible states:
 *   - server not configured: the toggle is hidden entirely
 *   - unsupported in this browser: hidden
 *   - permission denied: shown but disabled with an explanatory hint
 */
const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  onClose,
}) => {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotifications();
  const push = usePushNotifications();
  const pushToast = useUiStore((s) => s.pushToast);

  const remindersOn = prefs?.reminders ?? false;
  const celebrationsOn = prefs?.celebrations ?? true;

  const fail = () => pushToast('Could not save the preference', 'error');

  const toggleReminders = () => {
    const next = !remindersOn;
    update.mutate(
      { reminders: next },
      {
        onSuccess: () =>
          pushToast(next ? 'Daily reminders on' : 'Daily reminders off', 'success'),
        onError: fail,
      }
    );
  };

  const toggleCelebrations = () => {
    const next = !celebrationsOn;
    update.mutate(
      { celebrations: next },
      {
        onSuccess: () =>
          pushToast(next ? 'Celebrations on' : 'Celebrations off', 'success'),
        onError: fail,
      }
    );
  };

  const togglePush = async (next: boolean) => {
    try {
      if (next) await push.enable();
      else await push.disable();
      pushToast(next ? 'Browser notifications on' : 'Browser notifications off', 'success');
    } catch {
      pushToast('Could not update browser notifications', 'error');
    }
  };

  const lastSent =
    prefs?.last_sent_at &&
    !Number.isNaN(new Date(prefs.last_sent_at).getTime())
      ? new Date(prefs.last_sent_at).toLocaleString()
      : null;

  const showPushToggle =
    !push.loading &&
    push.serverConfigured &&
    push.support !== 'unsupported';

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
            <div className="space-y-3">
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-surface-2 p-4">
                <input
                  type="checkbox"
                  checked={remindersOn}
                  onChange={toggleReminders}
                  disabled={update.isPending}
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

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-surface-2 p-4">
                <input
                  type="checkbox"
                  checked={celebrationsOn}
                  onChange={toggleCelebrations}
                  disabled={update.isPending}
                  className="mt-0.5 h-4 w-4 accent-accent"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">
                    Celebrations
                  </span>
                  <span className="mt-0.5 block text-xs text-ink-muted">
                    A small confetti pop when you finish a task, and a
                    bigger one at milestones (first 10, first 100).
                    Turn this off and everything stays quiet.
                  </span>
                </span>
              </label>

              {showPushToggle && (
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-hairline bg-surface-2 p-4">
                  <input
                    type="checkbox"
                    checked={push.support === 'subscribed'}
                    disabled={push.support === 'denied'}
                    onChange={async (e) => {
                      await togglePush(e.target.checked);
                    }}
                    className="mt-0.5 h-4 w-4 accent-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">
                      Browser notifications
                    </span>
                    <span className="mt-0.5 block text-xs text-ink-muted">
                      {push.support === 'denied'
                        ? 'Notifications are blocked in your browser settings. Allow them for Tudu, then try again.'
                        : 'A reminder appears even when Tudu is closed.'}
                    </span>
                  </span>
                </label>
              )}
            </div>
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
