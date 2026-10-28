import React from 'react';
import MarketingShell from '../../components/marketing/MarketingShell';
import { H1 } from '../../components/marketing/Prose';

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
            Live monitoring is not yet connected to this page. For real-time
            incidents, follow{' '}
            <a
              href="https://github.com/MojolaoluwaOlanusi/Tudu/issues"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-ink"
            >
              our GitHub issues
            </a>.
          </p>
        </div>
      </div>

      <h2 className="mb-3 mt-12 text-xl font-semibold text-ink">
        Incident history
      </h2>
      <div className="space-y-3">
        <div className="rounded-lg border border-line bg-surface p-4 text-center text-sm text-ink-muted">
          No recent incidents.
        </div>
      </div>
    </div>
  </MarketingShell>
);

export default StatusPage;