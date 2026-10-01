import React, { useMemo, useState } from 'react';
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import {
  useAnalyticsOverview,
  useCompletedTasks,
  useTimeSpent,
} from '../../hooks/useAnalytics';
import { exportAnalyticsCsv, exportAnalyticsJson } from '../../lib/analyticsExport';
import type { AnalyticsRange } from '../../types/analytics';

// react-chartjs-2 v5 does not auto-register; only the pieces actually used.
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
  Filler
);

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  week: 'Last 7 days',
  month: 'Last 30 days',
  quarter: 'Last 12 weeks',
};

/** Fixed palette so pie slices keep the same colour across re-renders. */
const CATEGORY_COLOURS: Record<string, string> = {
  work: '#6366f1',
  personal: '#ec4899',
  study: '#14b8a6',
  none: '#94a3b8',
};

const PRIORITY_COLOURS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#22c55e',
  none: '#cbd5e1',
};

const humaniseMinutes = (minutes: number): string => {
  if (minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
};

const MetricCard: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone?: 'default' | 'alert';
}> = ({ label, value, hint, tone = 'default' }) => (
  <div className="card p-4">
    <p className="text-xs uppercase tracking-wide text-ink-muted">{label}</p>
    <p
      className={`mt-1 text-2xl font-semibold ${
        tone === 'alert' ? 'text-red-600' : 'text-ink'
      }`}
    >
      {value}
    </p>
    {hint && <p className="mt-0.5 text-xs text-ink-muted">{hint}</p>}
  </div>
);

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="card p-5">
    <h3 className="font-handwritten text-xl text-ink">{title}</h3>
    {subtitle && <p className="mb-3 text-xs text-ink-muted">{subtitle}</p>}
    <div className="mt-3">{children}</div>
  </div>
);

/** A chart with nothing to plot should say so rather than render an empty box. */
const EmptyChart: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="flex h-48 items-center justify-center rounded-md bg-base-100/50 text-sm text-ink-muted">
    {children ?? 'Nothing recorded in this period yet.'}
  </div>
);

const PIE_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { position: 'bottom' as const } },
};

const AXIS_OPTIONS = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
};

const AnalyticsDashboard: React.FC = () => {
  const [range, setRange] = useState<AnalyticsRange>('week');

  const overviewQuery = useAnalyticsOverview();
  const completedQuery = useCompletedTasks(range);
  const timeQuery = useTimeSpent(range);

  const overview = overviewQuery.data;
  const completed = completedQuery.data;
  const timeSpent = timeQuery.data;

  const loading =
    overviewQuery.isLoading || completedQuery.isLoading || timeQuery.isLoading;
  const errored =
    overviewQuery.isError || completedQuery.isError || timeQuery.isError;

  const buckets = completed?.buckets ?? [];
  const hasCompletions = (completed?.total ?? 0) > 0;

  const barData = useMemo(
    () => ({
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          label: 'Tasks completed',
          data: buckets.map((b) => b.count),
          backgroundColor: '#6366f1',
          borderRadius: 4,
        },
      ],
    }),
    [buckets]
  );

  const lineData = useMemo(
    () => ({
      labels: buckets.map((b) => b.label),
      datasets: [
        {
          label: 'Completions',
          data: buckets.map((b) => b.count),
          borderColor: '#6366f1',
          backgroundColor: 'rgba(99, 102, 241, 0.15)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
        },
      ],
    }),
    [buckets]
  );

  const pieData = useMemo(() => {
    const slices = timeSpent?.byCategory ?? [];
    return {
      labels: slices.map((c) => c.label),
      datasets: [
        {
          data: slices.map((c) => c.minutes),
          backgroundColor: slices.map(
            (c) => CATEGORY_COLOURS[c.category] ?? '#94a3b8'
          ),
          borderWidth: 0,
        },
      ],
    };
  }, [timeSpent]);

  const priorityData = useMemo(() => {
    if (!overview) return null;
    const entries = Object.entries(overview.byPriority);
    return {
      labels: entries.map(([key]) =>
        key === 'none' ? 'Unset' : key.charAt(0).toUpperCase() + key.slice(1)
      ),
      datasets: [
        {
          data: entries.map(([, value]) => value),
          backgroundColor: entries.map(
            ([key]) => PRIORITY_COLOURS[key] ?? '#cbd5e1'
          ),
          borderWidth: 0,
        },
      ],
    };
  }, [overview]);

  const canExport = Boolean(overview && completed && timeSpent);
  const exportData = {
    range,
    overview: overview!,
    completed: completed!,
    timeSpent: timeSpent!,
  };

  const ready = !loading && !errored && Boolean(overview && completed && timeSpent);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="flex rounded-md border border-base-300 bg-base-100 p-0.5"
          role="group"
          aria-label="Date range"
        >
          {(Object.keys(RANGE_LABELS) as AnalyticsRange[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              aria-pressed={range === key}
              className={`rounded px-3 py-1 text-sm transition ${
                range === key
                  ? 'bg-accent text-white'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!canExport}
            onClick={() => canExport && exportAnalyticsCsv(exportData)}
            className="rounded-md border border-base-300 px-3 py-1.5 text-sm text-ink transition hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export CSV
          </button>
          <button
            type="button"
            disabled={!canExport}
            onClick={() => canExport && exportAnalyticsJson(exportData)}
            className="rounded-md border border-base-300 px-3 py-1.5 text-sm text-ink transition hover:bg-base-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Export JSON
          </button>
        </div>
      </div>

      {loading && (
        <div className="card p-6">
          <p className="text-sm text-ink-muted">Crunching your numbers…</p>
        </div>
      )}

      {errored && !loading && (
        <div className="card p-6">
          <p className="text-sm text-red-600">
            Could not load analytics. Check your connection and try again.
          </p>
        </div>
      )}

      {ready && overview && completed && timeSpent && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard
              label="Total tasks"
              value={String(overview.tasks.total)}
              hint={`${overview.completionRate}% complete`}
            />
            <MetricCard
              label="Completed"
              value={String(overview.tasks.done)}
              hint={`${completed.total} in this period`}
            />
            <MetricCard
              label="In progress"
              value={String(overview.tasks.doing)}
              hint={`${overview.tasks.todo} to do`}
            />
            <MetricCard
              label="Overdue"
              value={String(overview.tasks.overdue)}
              tone={overview.tasks.overdue > 0 ? 'alert' : 'default'}
              hint={overview.tasks.overdue > 0 ? 'Needs attention' : 'All on track'}
            />
            <MetricCard
              label="Focus time"
              value={humaniseMinutes(timeSpent.totalMinutes)}
              hint={`${timeSpent.totalSessions} session${
                timeSpent.totalSessions === 1 ? '' : 's'
              }`}
            />
          </div>

          {/* Bar: tasks completed */}
          <ChartCard
            title={`Tasks completed · ${RANGE_LABELS[range].toLowerCase()}`}
            subtitle={
              completed.changePercent === null
                ? 'No comparable activity in the previous period.'
                : `${completed.total} completed · ${
                    completed.changePercent > 0 ? '+' : ''
                  }${completed.changePercent}% vs previous period`
            }
          >
            {hasCompletions ? (
              <div className="h-56">
                <Bar data={barData} options={AXIS_OPTIONS} />
              </div>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <ChartCard title="Time spent by category" subtitle="Tracked via Pomodoro">
              {timeSpent.byCategory.length > 0 ? (
                <div className="h-64">
                  <Pie data={pieData} options={PIE_OPTIONS} />
                </div>
              ) : (
                <EmptyChart>No focus sessions in this period yet.</EmptyChart>
              )}
            </ChartCard>

            <ChartCard
              title="Tasks by priority"
              subtitle="All time, not just the selected range"
            >
              {overview.tasks.total > 0 && priorityData ? (
                <div className="h-64">
                  <Pie data={priorityData} options={PIE_OPTIONS} />
                </div>
              ) : (
                <EmptyChart>No tasks yet.</EmptyChart>
              )}
            </ChartCard>
          </div>

          <ChartCard
            title="Productivity trend"
            subtitle={
              completed.bestBucket
                ? `Best run: ${completed.bestBucket.count} on ${completed.bestBucket.label}`
                : RANGE_LABELS[range]
            }
          >
            {hasCompletions ? (
              <div className="h-64">
                <Line data={lineData} options={AXIS_OPTIONS} />
              </div>
            ) : (
              <EmptyChart />
            )}
          </ChartCard>

          {timeSpent.byTask.length > 0 && (
            <div className="card p-5">
              <h3 className="mb-3 font-handwritten text-xl text-ink">Time by task</h3>
              <ul className="space-y-2">
                {timeSpent.byTask.map((row) => (
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
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
