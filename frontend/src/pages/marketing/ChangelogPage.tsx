import React from 'react';
import MarketingShell from '../../components/marketing/MarketingShell';
import { H1, H2, P, UL } from '../../components/marketing/Prose';

interface Release {
  version: string;
  date: string;
  title: string;
  bullets: string[];
}

const RELEASES: Release[] = [
  {
    version: 'v1.6',
    date: 'Oct 2025',
    title: 'Command palette, power filters, keyboard shortcuts',
    bullets: [
      'Press Cmd+K anywhere to search tasks, boards, or run actions',
      'Power filters: @me, #work, due:week, priority:high',
      'Bulk select and bulk-move without a modal',
    ],
  },
  {
    version: 'v1.5',
    date: 'Sep 2025',
    title: 'Time tracking and team analytics',
    bullets: [
      'Log billable hours against any task',
      'Per-member completion rates and burndown',
      'Weekly report and CSV export',
    ],
  },
  {
    version: 'v1.4',
    date: 'Aug 2025',
    title: 'GitHub + Slack, live',
    bullets: [
      'PRs with TUDU-N in the title move cards automatically',
      'Slack notifications on assign and complete',
      'Every webhook HMAC-verified',
    ],
  },
  {
    version: 'v1.3',
    date: 'Jul 2025',
    title: 'AI breakdown',
    bullets: [
      'Type "Plan launch" and get suggested subtasks, editable before saving',
      'HD mode adds twelve steps on Pro',
      'Free on every account',
    ],
  },
  {
    version: 'v1.0',
    date: 'May 2025',
    title: 'General availability',
    bullets: [
      'Personal boards, Kanban, list view',
      'Pomodoro and focus stats',
      'Free forever for personal use',
    ],
  },
];

const ChangelogPage: React.FC = () => (
  <MarketingShell>
    <div className="mx-auto max-w-3xl px-6 py-16">
      <H1>Changelog</H1>
      <P>Every release, every fix. Ship-log starts May 2025.</P>

      <div className="mt-10 space-y-10">
        {RELEASES.map((r) => (
          <article
            key={r.version}
            className="relative border-l-2 border-line-subtle pl-6"
          >
            <span className="absolute -left-[7px] top-1.5 h-3 w-3 rounded-full border-2 border-canvas bg-brand" />
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-sm bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                {r.version}
              </span>
              <span className="text-[11px] text-ink-faint">{r.date}</span>
            </div>
            <H2>{r.title}</H2>
            <UL items={r.bullets} />
          </article>
        ))}
      </div>
    </div>
  </MarketingShell>
);

export default ChangelogPage;