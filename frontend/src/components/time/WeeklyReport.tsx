import React, { useMemo, useState } from 'react';
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTimeReport, formatDuration } from '../../hooks/useTime';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type Range = 'week' | 'month' | 'quarter';

const RANGE_LABELS: Record<Range, string> = {
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

const WeeklyReport: React.FC = () => {
  const [range, setRange] = useState<Range>('week');
  const { data, isLoading, isError } = useTimeReport(range);

  const barData = useMemo(() => {
    const days = data?.byDay ?? [];
    return {
      labels: days.map((d) => formatDay(d.date)),
      datasets: [
        {
          label: 'Hours',
          data: days.map((d) => Math.round((d.seconds / 3600) * 10) / 10),
          backgroundColor: '#22c55e',
          borderRadius: 4,
        },
      ],
    };
  }, [data]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: { y: { beginAtZero: true } },
  };

  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-handwritten text-xl text-ink">Time tracked</h3>
          <p className="text-xs text-ink-muted">Hours per day, from task timers and manual entries.</p>
        </div>
        <div className="flex rounded-md border border-hairline bg-surface-2 p-0.5" role="group" aria-label="Time range">
          {(Object.keys(RANGE_LABELS) as Range[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              aria-pressed={range === key}
              className={`rounded px-2.5 py-1 text-xs transition ${
                range === key ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink'
              }`}
            >
              {RANGE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {isLoading && <p className="text-sm text-ink-muted">Loading…</p>}
      {isError && !isLoading && (
        <p className="text-sm text-red-600">Could not load the time report.</p>
      )}

      {data && !isLoading && !isError && (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-hairline bg-surface-2 p-3">
              <p className="text-[10px] uppercase tracking-wide text-ink-muted">Total</p>
              <p className="text-lg font-semibold text-ink">{formatDuration(data.totalSeconds)}</p>
              <p className="text-[11px] text-ink-muted">{data.totalEntries} entr{data.totalEntries === 1 ? 'y' : 'ies'}</p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface-2 p-3">
              <p className="text-[10px] uppercase tracking-wide text-ink-muted">Billable</p>
              <p className="text-lg font-semibold text-accent-strong">{formatDuration(data.billableSeconds)}</p>
              <p className="text-[11px] text-ink-muted">
                {data.totalSeconds === 0
                  ? '0%'
                  : Math.round((data.billableSeconds / data.totalSeconds) * 100) + '%'}
                of total
              </p>
            </div>
            <div className="rounded-lg border border-hairline bg-surface-2 p-3">
              <p className="text-[10px] uppercase tracking-wide text-ink-muted">Average / day</p>
              <p className="text-lg font-semibold text-ink">
                {formatDuration(Math.round(data.totalSeconds / Math.max(1, data.byDay.length)))}
              </p>
              <p className="text-[11px] text-ink-muted">{data.byDay.length} day{data.byDay.length === 1 ? '' : 's'}</p>
            </div>
          </div>

          <div className="h-48">
            <Bar data={barData} options={chartOptions} />
          </div>

          {data.byTask.length > 0 && (
            <div className="mt-4">
              <h4 className="mb-2 text-xs font-semibold text-ink">Top tasks</h4>
              <ul className="space-y-1">
                {data.byTask.slice(0, 5).map((t) => (
                  <li key={t.taskId ?? 'untagged'} className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate text-ink">{t.title ?? 'Untagged time'}</span>
                    <span className="shrink-0 text-ink-muted">{formatDuration(t.seconds)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default WeeklyReport;
