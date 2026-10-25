import React from 'react';
import { useNotificationPreferences, useUpdateNotifications } from '../../../hooks/useNotifications';
import { usePushNotifications } from '../../../hooks/usePushNotifications';
import { useUiStore } from '../../../store/uiStore';
import { PageHeader, Section, ToggleRow } from './primitives';

const SettingsNotifications: React.FC = () => {
  const { data: prefs, isLoading } = useNotificationPreferences();
  const update = useUpdateNotifications();
  const push = usePushNotifications();
  const pushToast = useUiStore((s) => s.pushToast);

  const remindersOn = prefs?.reminders ?? false;
  const celebrationsOn = prefs?.celebrations ?? true;

  const toggle = (patch: { reminders?: boolean; celebrations?: boolean }) => {
    update.mutate(patch, {
      onError: () => pushToast('Could not save the preference', 'error'),
    });
  };

  const showPushToggle =
    !push.loading && push.serverConfigured && push.support !== 'unsupported';

  return (
    <div>
      <PageHeader title="Notifications" description="We will only email you about what you ask for." />
      <Section>
        {isLoading ? (
          <p className="text-sm text-ink-muted">Loading...</p>
        ) : (
          <div className="space-y-3">
            <ToggleRow
              label="Daily due-date reminders"
              description="One email a day listing tasks that are due or overdue. Sent at 07:00 UTC."
              checked={remindersOn}
              onChange={(v) => toggle({ reminders: v })}
              disabled={update.isPending}
            />
            <ToggleRow
              label="Celebrations"
              description="A small confetti pop when you finish a task, and a bigger one at milestones."
              checked={celebrationsOn}
              onChange={(v) => toggle({ celebrations: v })}
              disabled={update.isPending}
            />
            {showPushToggle && (
              <ToggleRow
                label="Browser notifications"
                description={
                  push.support === 'denied'
                    ? 'Notifications are blocked in your browser settings.'
                    : 'A reminder appears even when Tudu is closed.'
                }
                checked={push.support === 'subscribed'}
                onChange={async (v) => {
                  try {
                    if (v) await push.enable();
                    else await push.disable();
                  } catch {
                    pushToast('Could not update browser notifications', 'error');
                  }
                }}
                disabled={push.support === 'denied'}
              />
            )}
          </div>
        )}
      </Section>
    </div>
  );
};

export default SettingsNotifications;
