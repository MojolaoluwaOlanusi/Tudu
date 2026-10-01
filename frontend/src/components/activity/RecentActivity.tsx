import React, { useState } from 'react';
import { useActivityFeed } from '../../hooks/useActivity';
import { useTasks } from '../../hooks/useTasks';
import ActivityFeed from './ActivityFeed';

type Range = 'all' | 'today' | '7d' | '30d';

const RANGE_FROM: Record<Range, () => string | undefined> = {
  all: () => undefined,
  today: () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start.toISOString();
  },
  '7d': () => new Date(Date.now() - 7 * 864e5).toISOString(),
  '30d': () => new Date(Date.now() - 30 * 864e5).toISOString(),
};

const RANGE_LABELS: Record<Range, string> = {
  all: 'All time',
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
};

const selectClass =
  'rounded-lg border border-hairline bg-surface px-2 py-1 text-xs text-ink';

/** "Recent activity" panel with task and date filters. */
const RecentActivity: React.FC = () => {
  const [range, setRange] = useState<Range>('all');
  const [taskId, setTaskId] = useState('');

  const { data: tasks } = useTasks();
  const { data, isLoading } = useActivityFeed({
    limit: 12,
    ...(range !== 'all' ? { from: RANGE_FROM[range]() } : {}),
    ...(taskId ? { taskId } : {}),
  });

  const total = data?.total ?? 0;

  return (
    <section className="card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-handwritten text-xl text-ink">Recent activity</h3>
          {!isLoading && total > 0 && (
            <p className="text-[11px] text-ink-muted">
              {total} event{total === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            aria-label="Filter activity by task"
            className={`${selectClass} max-w-[160px]`}
          >
            <option value="">All tasks</option>
            {(tasks ?? []).map((task) => (
              <option key={task.id} value={task.id}>
                {task.title}
              </option>
            ))}
          </select>

          <select
            value={range}
            onChange={(e) => setRange(e.target.value as Range)}
            aria-label="Filter activity by date"
            className={selectClass}
          >
            {(Object.keys(RANGE_LABELS) as Range[]).map((key) => (
              <option key={key} value={key}>
                {RANGE_LABELS[key]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <ActivityFeed
        activities={data?.items ?? []}
        isLoading={isLoading}
        emptyMessage="No activity yet. Create a task to get started!"
      />
    </section>
  );
};

export default RecentActivity;