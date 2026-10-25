import React, { useMemo, useState } from 'react';
import {
  useAnalyticsOverview,
  useCompletedTasks,
  useTimeSpent,
} from '../../hooks/useAnalytics';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { exportAnalyticsCsv, exportAnalyticsJson } from '../../lib/analyticsExport';
import type { AnalyticsRange } from '../../types/analytics';
import FeatureGate from '../common/FeatureGate';
import TeamAnalyticsView from './TeamAnalyticsView';
import { BarChart, LineChart, PieChart } from '../app/charts/Charts';

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  week: 'Last 7 days',
  month: 'Last 30 days',
  quarter: 'Last 12 weeks',
};

const CATEGORY_COLOURS: Record<string, string> = {
  work: '#3b82f6',
  personal: '#8b5cf6',
  study: '#10b981',
  none: '#6b6b78',
};

const PRIORITY_COLOURS: Record<string, string> = {
  high: '#ef4444',
  medium: '#f59e0b',
  low: '#94a3b8',
  none: '#3a3a3a',
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
  <div className="card min-w-0 p-4">
    <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
      {label}
    </p>
    <p
      className={`mt-2 font-handwritten text-3xl leading-none ${
        tone === 'alert' ? 'text-red-400' : 'text-ink'
      }`}
    >
      {value}
    </p>
    {hint && <p className="mt-1 text-[11px] text-ink-muted">{hint}</p>}
  </div>
);

const ChartCard: React.FC<{
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}> = ({ title, subtitle, children }) => (
  <div className="card min-w-0 p-5">
    <h2 className="font-handwritten text-xl text-ink">{title}</h2>
    {subtitle && <p className="mb-3 text-[11px] text-ink-faint">{subtitle}</p>}
    <div className="mt-3">{children}</div>
  </div>
);

const EmptyChart: React.FC<{ children?: React.ReactNode }> = ({ children }) => (
  <div className="flex h-48 items-center justify-center rounded-md bg-raised text-sm text-ink-muted">
    {children ?? 'Nothing recorded in this period yet.'}
  </div>
);

const AnalyticsDashboard: React.FC = () => {
  const [scope, setScope] = useState<'personal' | 'team'>('personal');
  const [range, setRange] = useState<AnalyticsRange>('week');
  const { data: workspaces = [] } = useWorkspaces();

  const personal = scope === 'personal';
  const overviewQuery = useAnalyticsOverview(personal);
  const completedQuery = useCompletedTasks(range, personal);
  const timeQuery = useTimeSpent(range, personal);

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
    () => buckets.map((b) => ({ label: b.label, value: b.count })),
    [buckets]
  );

  const lineData = useMemo(
    () => buckets.map((b) => ({ label: b.label, value: b.count })),
    [buckets]
  );

  const pieData = useMemo(() => {
    const slices = timeSpent?.byCategory ?? [];
    return slices.map((c) => ({
      label: c.label,
      value: c.minutes,
      color: CATEGORY_COLOURS[c.category] ?? CATEGORY_COLOURS.none,
    }));
  }, [timeSpent]);

  const priorityData = useMemo(() => {
    if (!overview) return [];
    return Object.entries(overview.byPriority).map(([key, value]) => ({
      label:
        key === 'none'
          ? 'Unset'
          : key.charAt(0).toUpperCase() + key.slice(1),
      value,
      color: PRIORITY_COLOURS[key] ?? PRIORITY_COLOURS.none,
    }));
  }, [overview]);

  const canExport = Boolean(overview && completed && timeSpent);
  const exportData = {
    range,
    overview: overview!,
    completed: completed!,
    timeSpent: timeSpent!,
  };

  const ready = !loading && !errored && Boolean(overview && completed && timeSpent);

  const scopeToggle = (
    <div
      className="flex rounded-md border border-line bg-surface p-0.5"
      role="group"
      aria-label="Analytics scope"
    >
      <button
        type="button"
        onClick={() => setScope('personal')}
        aria-pressed={scope === 'personal'}
        className={`rounded px-3 py-1.5 text-[12px] font-medium transition-colors ${
          scope === 'personal' ? 'bg-raised text-ink' : 'text-ink-muted hover:text-ink'
        }`}
      >
        Personal
      </button>
      {workspaces.length > 0 && (
        <button
          type="button"
          onClick={() => setScope('team')}
          aria-pressed={scope === 'team'}
          className={`rounded px-3 py-1.5 text-[12px] font-medium transition-colors ${
            scope === 'team' ? 'bg-raised text-ink' : 'text-ink-muted hover:text-ink'
          }`}
        >
          Team
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-row-reverse flex-wrap items-center justify-between gap-3">
        {scopeToggle}
        {personal && (
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!canExport}
              onClick={() => canExport && exportAnalyticsCsv(exportData)}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-raised hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export CSV
            </button>
            <button
              type="button"
              disabled={!canExport}
              onClick={() => canExport && exportAnalyticsJson(exportData)}
              className="rounded-md border border-line bg-surface px-3 py-1.5 text-[12px] font-medium text-ink-muted transition-colors hover:bg-raised hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export JSON
            </button>
          </div>
        )}
      </div>

      {scope === 'team' ? (
        <FeatureGate
          feature="analytics.team"
          title="Team analytics"
          description="See how your whole team is doing, per member and per board."
        >
          <TeamAnalyticsView />
        </FeatureGate>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex rounded-md border border-line bg-surface p-0.5"
              role="group"
              aria-label="Date range"
            >
              {(Object.keys(RANGE_LABELS) as AnalyticsRange[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setRange(key)}
                  aria-pressed={range === key}
                  className={`rounded px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    range === key ? 'bg-raised text-ink' : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {RANGE_LABELS[key]}
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="card p-6">
              <p className="text-sm text-ink-muted">Crunching your numbers…</p>
            </div>
          )}

          {errored && !loading && (
            <div className="card p-6">
              <p className="text-sm text-red-400">
                Could not load analytics. Check your connection and try again.
              </p>
            </div>
          )}

          {ready && overview && completed && timeSpent && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
                  <BarChart data={barData} height={224} />
                ) : (
                  <EmptyChart />
                )}
              </ChartCard>

              <div className="grid gap-5 lg:grid-cols-2">
                <ChartCard title="Time spent by category" subtitle="Tracked via Pomodoro">
                  {timeSpent.byCategory.length > 0 ? (
                    <PieChart data={pieData} size={200} />
                  ) : (
                    <EmptyChart>No focus sessions in this period yet.</EmptyChart>
                  )}
                </ChartCard>

                <ChartCard
                  title="Tasks by priority"
                  subtitle="All time, not just the selected range"
                >
                  {overview.tasks.total > 0 && priorityData.length > 0 ? (
                    <PieChart data={priorityData} size={200} />
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
                  <LineChart data={lineData} height={224} />
                ) : (
                  <EmptyChart />
                )}
              </ChartCard>

              {timeSpent.byTask.length > 0 && (
                <div className="card p-5">
                  <h2 className="mb-3 font-handwritten text-xl text-ink">Time by task</h2>
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
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
