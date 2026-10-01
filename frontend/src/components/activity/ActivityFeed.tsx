import React from 'react';
import { Activity } from '../../types/activity';
import { activityTone, formatActivity, relativeTime } from '../../lib/activityFormat';

interface ActivityFeedProps {
  activities: Activity[];
  isLoading?: boolean;
  emptyMessage?: string;
  compact?: boolean;
}

/**
 * Renders activity rows as friendly sentences, e.g.
 * "You moved “Write docs” to Done · 2 hours ago"
 */
const ActivityFeed: React.FC<ActivityFeedProps> = ({
  activities,
  isLoading,
  emptyMessage = 'No activity yet.',
  compact = false,
}) => {
  if (isLoading) {
    return <p className="text-xs text-ink-muted">Loading activity…</p>;
  }

  if (activities.length === 0) {
    return <p className="text-xs text-ink-muted">{emptyMessage}</p>;
  }

  return (
    <ul className={compact ? 'space-y-1.5' : 'space-y-2'}>
      {activities.map((activity) => (
        <li key={activity.id} className="flex items-start gap-2">
          <span
            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${activityTone(activity.action)}`}
          />
          <p className={`min-w-0 flex-1 text-ink ${compact ? 'text-[11px]' : 'text-xs'}`}>
            You {formatActivity(activity)}{' '}
            <span className="whitespace-nowrap text-ink-muted">
              · {relativeTime(activity.created_at)}
            </span>
          </p>
        </li>
      ))}
    </ul>
  );
};

export default ActivityFeed;