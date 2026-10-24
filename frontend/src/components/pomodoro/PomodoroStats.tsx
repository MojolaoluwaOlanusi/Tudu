import React from 'react';
import { format } from 'date-fns';
import { Flame, Calendar, Award, Timer as TimerIcon } from 'lucide-react';
import { usePomodoroStats } from '../../hooks/usePomodoro';

/**
 * A single metric tile. The mockup (StatsView.jsx) pairs each number with a
 * small green-tinted icon, an uppercase label and a handwritten Caveat value.
 * The `hint` line is unchanged from the pre-restyle version.
 */
const StatCard: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
}> = ({ icon: Icon, label, value, hint }) => (
  <div className="card min-w-0 p-4">
    <div className="flex items-center gap-2">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-subtle text-brand">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
        {label}
      </p>
    </div>
    <p className="mt-2 font-handwritten text-3xl leading-none text-ink">{value}</p>
    {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
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
        <p className="text-sm text-red-400">Could not load Pomodoro stats.</p>
      </div>
    );
  }

  const maxMinutes = Math.max(...data.daily.map((d) => d.minutes), 1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Flame}
          label="Today"
          value={humaniseMinutes(data.today.minutes)}
          hint={`${data.today.sessions} session${data.today.sessions === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={Calendar}
          label="This week"
          value={humaniseMinutes(data.week.minutes)}
          hint={`${data.week.sessions} session${data.week.sessions === 1 ? '' : 's'}`}
        />
        <StatCard
          icon={Award}
          label="All time"
          value={humaniseMinutes(data.totals.minutes)}
          hint={`${data.totals.sessions} completed`}
        />
        <StatCard
          icon={TimerIcon}
          label="Started"
          value={String(data.totals.startedSessions)}
          hint={`${data.totals.abandoned} abandoned`}
        />
      </div>

      {/* Last seven days */}
      <div className="card p-5">
        <h2 className="font-handwritten text-xl text-ink">Last 7 days</h2>
        <p className="mb-3 text-[11px] text-ink-faint">Minutes of focus per day</p>
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
          <h2 className="font-handwritten text-xl text-ink">Where the time went</h2>
          <p className="mb-3 text-[11px] text-ink-faint">Per task, all-time</p>
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
          <h2 className="mb-3 font-handwritten text-xl text-ink">Recent sessions</h2>
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