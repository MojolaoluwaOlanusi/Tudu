import React from 'react';
import { format } from 'date-fns';
import { usePomodoroStats } from '../../hooks/usePomodoro';

const StatCard: React.FC<{ label: string; value: string; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="card min-w-0 p-4">
    <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
    <p className="mt-1 text-2xl font-semibold text-ink">{value}</p>
    {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
  </div>
);

/** 125 -> "2h 5m", 45 -> "45m" */
const humaniseMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

const PomodoroStats: React.FC = () => {
  const { data, isLoading, isError } = usePomodoroStats(7);

  if (isLoading) {
    return (
      <div className="card p-6">
        <p className="text-sm text-ink-muted">Loading your focus stats…</p>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="card p-6">
        <p className="text-sm text-red-600">Could not load Pomodoro stats.</p>
      </div>
    );
  }

  const maxMinutes = Math.max(...data.daily.map((d) => d.minutes), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today" value={humaniseMinutes(data.today.minutes)} hint={`${data.today.sessions} session${data.today.sessions === 1 ? '' : 's'}`} />
        <StatCard label="This week" value={humaniseMinutes(data.week.minutes)} hint={`${data.week.sessions} session${data.week.sessions === 1 ? '' : 's'}`} />
        <StatCard label="All time" value={humaniseMinutes(data.totals.minutes)} hint={`${data.totals.sessions} completed`} />
        <StatCard
          label="Started"
          value={String(data.totals.startedSessions)}
          hint={`${data.totals.abandoned} abandoned`}
        />
      </div>

      {/* Last seven days */}
      <div className="card p-5">
        <h3 className="mb-3 font-handwritten text-xl text-ink">Last 7 days</h3>
        <div className="flex h-32 items-end gap-2">
          {data.daily.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex w-full flex-1 items-end">
                <div
                  className="w-full rounded-t-md bg-accent transition-all"
                  style={{ height: `${(day.minutes / maxMinutes) * 100}%` }}
                  title={`${day.date}: ${humaniseMinutes(day.minutes)}`}
                />
              </div>
              <span className="text-[10px] text-ink-muted">
                {format(new Date(`${day.date}T00:00:00`), 'EEE')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Per task */}
      {data.byTask.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-handwritten text-xl text-ink">Where the time went</h3>
          <ul className="space-y-2">
            {data.byTask.map((row) => (
              <li
                key={row.taskId ?? 'unassigned'}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate text-ink">{row.title ?? 'No task'}</span>
                <span className="shrink-0 text-ink-muted">
                  {humaniseMinutes(row.minutes)} · {row.sessions} session
                  {row.sessions === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent sessions */}
      {data.recent.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-3 font-handwritten text-xl text-ink">Recent sessions</h3>
          <ul className="space-y-2">
            {data.recent.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate text-ink">
                  {session.task_title ?? 'Focus session'}
                </span>
                <span className="shrink-0 text-ink-muted">
                  {session.duration}m
                  {session.completed_at
                    ? ` · ${format(new Date(session.completed_at), 'd MMM, HH:mm')}`
                    : ' · not finished'}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PomodoroStats;