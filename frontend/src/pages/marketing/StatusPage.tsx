import React from 'react';
import MarketingShell from '../../components/marketing/MarketingShell';
import { H1 } from '../../components/marketing/Prose';

interface System {
  name: string;
  uptime: number;
  /** Last 30 days. 1 = operational, 0 = degraded. */
  days: number[];
}

// Kept in sync with what the deployment actually monitors. Replace with a
// live data source (UptimeRobot / Better Stack) when one is wired up.
const SYSTEMS: System[] = [
  { name: 'Web app', uptime: 99.99, days: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { name: 'API', uptime: 99.97, days: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { name: 'Realtime (sockets)', uptime: 99.94, days: [1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { name: 'Webhook delivery', uptime: 99.98, days: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
  { name: 'Payments', uptime: 100.0, days: [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1] },
];

interface Incident {
  date: string;
  title: string;
  status: string;
  tone: 'amber' | 'brand';
  body: string;
}

const INCIDENTS: Incident[] = [
  {
    date: 'Oct 18, 2026',
    title: 'Brief realtime disconnect',
    status: 'Resolved',
    tone: 'amber',
    body: 'One of the socket workers crashed for 6 minutes. Reconnect logic caught it and no writes were lost.',
  },
  {
    date: 'Sep 4, 2026',
    title: 'API latency spike',
    status: 'Resolved',
    tone: 'amber',
    body: 'A runaway query on a shared board blocked reads for 12 minutes. Query was parameterized and cached.',
  },
];

const StatusPage: React.FC = () => (
  <MarketingShell>
    <div className="mx-auto max-w-3xl px-6 py-16">
      <H1>Status</H1>

      <div className="mt-6 flex items-start gap-3 rounded-xl border border-brand/40 bg-brand-subtle/20 p-4">
        <span className="relative mt-0.5 flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-60" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand" />
        </span>
        <div>
          <p className="text-sm font-semibold text-ink">
            All systems operational
          </p>
          <p className="mt-0.5 text-[12px] text-ink-muted">
            Uptime is updated manually while a monitored status page is being
            set up.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        {SYSTEMS.map((s) => (
          <div
            key={s.name}
            className="rounded-lg border border-line bg-surface p-4"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">{s.name}</p>
              <p className="text-[11px] tabular-nums text-ink-faint">
                {s.uptime}%
              </p>
            </div>
            <div className="mt-2 flex gap-0.5">
              {s.days.map((d, i) => (
                <span
                  key={i}
                  className={
                    'h-6 flex-1 rounded-sm ' +
                    (d ? 'bg-brand/70' : 'bg-amber-400/70')
                  }
                  title={d ? 'Operational' : 'Degraded'}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 mt-12 text-xl font-semibold text-ink">
        Incident history
      </h2>
      <div className="space-y-3">
        {INCIDENTS.map((i) => (
          <div
            key={i.title}
            className="rounded-lg border border-line bg-surface p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={
                  'rounded-sm px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ' +
                  (i.tone === 'amber'
                    ? 'bg-amber-400/15 text-amber-400'
                    : 'bg-brand/15 text-brand')
                }
              >
                {i.status}
              </span>
              <span className="text-[11px] text-ink-faint">{i.date}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-ink">{i.title}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-muted">
              {i.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  </MarketingShell>
);

export default StatusPage;