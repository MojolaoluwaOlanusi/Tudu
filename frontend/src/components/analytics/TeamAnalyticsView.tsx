import React, { useEffect, useMemo, useState } from 'react';
import { useWorkspaces } from '../../hooks/useWorkspaces';
import { useTeamAnalytics } from '../../hooks/useAnalytics';
import { BarChart, LineChart } from '../app/charts/Charts';
import type { AnalyticsRange } from '../../types/analytics';

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  week: 'Last 7 days',
  month: 'Last 30 days',
  quarter: 'Last 12 weeks',
};

const formatDay = (iso: string): string => {
  const d = new Date(`${iso}T00:00:00.000Z`);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' });
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

const Avatar: React.FC<{ name: string | null; email: string; url: string | null }> = ({
  name,
  email,
  url,
}) =>
  url ? (
    <img
      src={url}
      alt={name || email}
      className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-accent"
    />
  ) : (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
      {(name || email || '?').charAt(0).toUpperCase()}
    </span>
  );

const TeamAnalyticsView: React.FC = () => {
  const { data: workspaces = [], isLoading: loadingWorkspaces } = useWorkspaces();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [range, setRange] = useState<AnalyticsRange>('week');

  useEffect(() => {
    if (!workspaceId && workspaces.length > 0) setWorkspaceId(workspaces[0].id);
  }, [workspaceId, workspaces]);

  const { data, isLoading, isError, refetch } = useTeamAnalytics(workspaceId, range);

  const barData = useMemo(
    () =>
      (data?.burndown ?? []).map((p) => ({
        label: formatDay(p.date),
        value: p.completed,
      })),
    [data]
  );

  const lineData = useMemo(
    () =>
      (data?.burndown ?? []).map((p) => ({
        label: formatDay(p.date),
        value: p.remaining,
      })),
    [data]
  );

  if (loadingWorkspaces) {
    return (
      <div className="card p-6">
        <p className="text-sm text-ink-muted">Loading workspaces…</p>
      </div>
    );
  }

  if (workspaces.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="font-handwritten text-2xl text-ink">No team yet</p>
        <p className="mt-2 text-sm text-ink-muted">
          Create a workspace from the Board selector to see team analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label
            htmlFor="team-workspace"
            className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted"
          >
            Workspace
          </label>
          <select
            id="team-workspace"
            value={workspaceId ?? ''}
            onChange={(event) => setWorkspaceId(event.target.value || null)}
            className="h-9 rounded-md border border-line bg-surface px-3 text-sm font-medium text-ink focus:border-accent focus:outline-none"
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </div>

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

      {isLoading && (
        <div className="card p-6">
          <p className="text-sm text-ink-muted">Loading team analytics…</p>
        </div>
      )}

      {isError && !isLoading && (
        <div className="card p-6">
          <p className="text-sm text-red-400">Could not load team analytics.</p>
          <button onClick={() => refetch()} className="btn-ghost mt-3">
            Try again
          </button>
        </div>
      )}

      {data && !isLoading && !isError && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <MetricCard
              label="Total tasks"
              value={String(data.overview.tasks.total)}
              hint={`${data.overview.completionRate}% complete`}
            />
            <MetricCard
              label="Completed"
              value={String(data.overview.tasks.done)}
              hint={`${data.byMember.reduce((s, m) => s + m.completed, 0)} in this period`}
            />
            <MetricCard
              label="In progress"
              value={String(data.overview.tasks.doing)}
              hint={`${data.overview.tasks.todo} to do`}
            />
            <MetricCard
              label="Overdue"
              value={String(data.overview.tasks.overdue)}
              tone={data.overview.tasks.overdue > 0 ? 'alert' : 'default'}
              hint={data.overview.tasks.overdue > 0 ? 'Needs attention' : 'All on track'}
            />
            <MetricCard
              label="Members"
              value={String(data.byMember.length)}
              hint={`${data.overview.boards.length} board${
                data.overview.boards.length === 1 ? '' : 's'
              }`}
            />
          </div>

          <div className="card p-5">
            <h2 className="font-handwritten text-xl text-ink">Burndown</h2>
            <p className="mb-3 text-[11px] text-ink-faint">
              Remaining tasks, end of each day. The line rises when new cards are
              added and drops when they are completed.
            </p>
            {data.burndown.length > 0 ? (
              <LineChart data={lineData} height={224} />
            ) : (
              <p className="flex h-56 items-center justify-center text-sm text-ink-muted">
                No tasks in this period.
              </p>
            )}
          </div>

          <div className="card p-5">
            <h2 className="font-handwritten text-xl text-ink">Completed per day</h2>
            <p className="mb-3 text-[11px] text-ink-faint">Tasks finished each day.</p>
            <BarChart data={barData} height={160} />
          </div>

          <div className="card p-5">
            <h2 className="mb-3 font-handwritten text-xl text-ink">By member</h2>
            {data.byMember.length === 0 ? (
              <p className="text-sm text-ink-muted">No members yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-[10px] uppercase tracking-wider text-ink-muted">
                    <tr>
                      <th className="pb-2 text-left font-semibold">Member</th>
                      <th className="pb-2 text-left font-semibold">Role</th>
                      <th className="pb-2 text-right font-semibold">Completed</th>
                      <th className="pb-2 text-right font-semibold">In progress</th>
                      <th className="pb-2 text-right font-semibold">Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.byMember.map((m) => (
                      <tr key={m.userId} className="border-t border-line-subtle">
                        <td className="py-2 pr-2">
                          <div className="flex items-center gap-2">
                            <Avatar name={m.name} email={m.email} url={m.avatarUrl} />
                            <div className="min-w-0">
                              <p className="truncate text-ink">
                                {m.name || m.email.split('@')[0]}
                              </p>
                              <p className="truncate text-[11px] text-ink-muted">
                                {m.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-2 pr-2 capitalize text-ink-muted">{m.role}</td>
                        <td className="py-2 pr-2 text-right text-ink">{m.completed}</td>
                        <td className="py-2 pr-2 text-right text-ink-muted">
                          {m.inProgress}
                        </td>
                        <td className="py-2 pr-2 text-right text-ink-muted">
                          {m.assigned}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {data.overview.boards.length > 0 && (
            <div className="card p-5">
              <h2 className="mb-3 font-handwritten text-xl text-ink">By board</h2>
              <ul className="space-y-2">
                {data.overview.boards.map((b) => {
                  const pct = b.total === 0 ? 0 : Math.round((b.done / b.total) * 100);
                  return (
                    <li key={b.id} className="flex items-center gap-3">
                      <span className="min-w-0 flex-1 truncate text-sm text-ink">
                        {b.name}
                      </span>
                      <span className="h-1.5 w-24 overflow-hidden rounded-full bg-line-subtle">
                        <span
                          className="block h-full rounded-full bg-brand transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </span>
                      <span className="w-20 shrink-0 text-right text-[11px] text-ink-muted">
                        {b.done}/{b.total}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TeamAnalyticsView;
