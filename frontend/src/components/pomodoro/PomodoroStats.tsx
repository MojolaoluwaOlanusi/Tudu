import React, { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Flame, Calendar, Award, Timer as TimerIcon } from 'lucide-react';
import { usePomodoroStats } from '../../hooks/usePomodoro';
import { BarChart } from '../app/charts/Charts';

type Range = 'week' | 'month' | 'quarter';

const RANGE_LABELS: Record<Range, string> = {
  week: 'Last 7 days',
  month: 'Last 30 days',
  quarter: 'Last 12 weeks',
};

const RANGE_DAYS: Record<Range, number> = { week: 7, month: 30, quarter: 84 };

interface DailySummary {
  date: string;
  sessions: number;
  minutes: number;
}

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

const humaniseMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

function bucketDaily(
  daily: DailySummary[],
  range: Range,
): { label: string; value: number }[] {
  if (range !== 'quarter') {
    return daily.map((d) => ({
      label: format(new Date(`${d.date}T00:00:00`), 'd MMM'),
      value: d.minutes,
    }));
  }
  const buckets: { label: string; value: number }[] = [];
  for (let i = 0; i < daily.length; i += 7) {
    const slice = daily.slice(i, i + 7);
    const total = slice.reduce((s, d) => s + d.minutes, 0);
    buckets.push({
      label: format(new Date(`${slice[0].date}T00:00:00`), 'd MMM'),
      value: total,
    });
  }
  return buckets;
}

const PomodoroStats: React.FC = () => {
  const [range, setRange] = useState<Range>('week');
  const days = RANGE_DAYS[range];
  const { data, isLoading, isError } = usePomodoroStats(days);

  const chartData = useMemo(
    () => (data ? bucketDaily(data.daily, range) : []),
    [data, range],
  );

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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div
          className="flex rounded-md border border-line bg-surface p-0.5"
          role="group"
          aria-label="Date range"
        >
          {(Object.keys(RANGE_LABELS) as Range[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              aria-pressed={range === key}
              className={
                'rounded px-3 py-1.5 text-[12px] font-medium transition-colors ' +
                (range === key ? 'bg-raised text-ink' : 'text-ink-muted hover:text-ink')
              }
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

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

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-handwritten text-xl text-ink">{RANGE_LABELS[range]}</h2>
          <p className="mb-3 text-[11px] text-ink-faint">Minutes of focus per day</p>
          <BarChart data={chartData} height={140} />
        </div>

        <div className="card p-5">
          <h2 className="font-handwritten text-xl text-ink">Where the time went</h2>
          <p className="mb-3 text-[11px] text-ink-faint">Per task, all-time</p>
          {data.byTask.length === 0 ? (
            <p className="py-8 text-center text-[12px] text-ink-faint">
              No focus sessions yet.
            </p>
          ) : (
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
          )}
        </div>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 font-handwritten text-xl text-ink">Recent sessions</h2>
        {data.recent.length === 0 ? (
          <p className="py-4 text-center text-[12px] text-ink-faint">
            No sessions yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.recent.map((session) => (
              <li key={session.id} className="flex items-center gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand">
                  <TimerIcon className="h-3 w-3" />
                </span>
                <span className="min-w-0 flex-1 truncate text-ink">
                  {session.task_title ?? 'Focus session'}
                </span>
                <span className="shrink-0 tabular-nums text-ink-muted">
                  {session.duration}m
                </span>
                <span className="shrink-0 text-ink-faint">
                  {session.completed_at
                    ? format(new Date(session.completed_at), 'd MMM, HH:mm')
                    : 'not finished'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default PomodoroStats;
