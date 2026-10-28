import React from 'react';
import { Link } from 'react-router-dom';
import MarketingShell from '../../components/marketing/MarketingShell';
import { H1, H2, P, UL } from '../../components/marketing/Prose';

interface Release {
  version: string;
  date: string;
  title: string;
  bullets: string[];
}

// Sourced from the repository's git log. Every bullet maps to a merge
// commit that actually landed on those dates. When GitHub release tags
// are created, this file and CHANGELOG.md will switch to listing real
// tagged releases.
const RELEASES: Release[] = [
  {
    version: 'v1.0.0',
    date: 'Oct 28, 2026',
    title: 'Launch-ready',
    bullets: [
      'CI on every push (backend + frontend, Postgres 16 service container)',
      'AGPL-3.0 license, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, SUPPORT',
      'Docs: SELF_HOSTING, MARKETPLACE, API_AND_WEBHOOKS, ENTERPRISE, LAUNCH_AND_GROWTH, LAUNCH_TIMING',
      'Fixed: sidebar shared-list links, ConfirmDialog replaces window.confirm, post-login destination, mobile docs nav, mobile chart readability, mobile board switcher, OAuth strategies registered conditionally',
    ],
  },
  {
    version: 'v0.7.0',
    date: 'Oct 16, 2026',
    title: 'Pro tier ships',
    bullets: [
      'Paystack subscriptions with server-side entitlement',
      'Tier gating infrastructure, HD AI breakdown, AI credit metering',
      'Self-hosting license: Ed25519 signed, offline verifiable',
      'Browser push notifications via VAPID',
    ],
  },
  {
    version: 'v0.6.0',
    date: 'Oct 14, 2026',
    title: 'Free tier complete',
    bullets: [
      'Landing page and public demo',
      'Onboarding wizard with template picker',
      'Power filters, sorting, undo (soft delete), bulk actions, keyboard shortcuts, command palette',
      'PWA install, built-in templates, public read API with personal tokens, due-date reminders',
    ],
  },
  {
    version: 'v0.5.0',
    date: 'Oct 12, 2026',
    title: 'Custom boards and team features',
    bullets: [
      'Custom boards and custom columns with stages and WIP limits',
      'Workspaces with admin / member / viewer roles',
      'Board integrity trigger keeps task status and column stage in step',
      'Assignee with role-based validation',
    ],
  },
  {
    version: 'v0.3.0',
    date: 'Oct 2, 2026',
    title: 'Analytics, branding, tests, onboarding',
    bullets: [
      'Analytics dashboard with Chart.js and CSV/JSON export',
      'Brush-stroke UI polish with theme-aware wordmark',
      'Jest, Vitest, and Playwright test suites',
      '18-step guided product tour',
    ],
  },
  {
    version: 'v0.2.0',
    date: 'Oct 1, 2026',
    title: 'Core features',
    bullets: [
      'Email auth, dark mode, Kanban with drag and drop, subtasks',
      'Sharing by email, activity log, real-time sync over Socket.io',
      'Natural language input, AI task breakdown, Pomodoro timer',
    ],
  },
  {
    version: 'v0.1.0',
    date: 'Sep 30, 2026',
    title: 'Initial release',
    bullets: [
      'Project structure for a PERN stack todo app',
      'Google and GitHub OAuth',
      'Core task CRUD, due dates, search and filters',
    ],
  },
];

const ChangelogPage: React.FC = () => (
  <MarketingShell>
    <div className="mx-auto max-w-3xl px-6 py-16">
      <H1>Changelog</H1>
      <P>
        Every milestone, every fix. Tudu&apos;s public development started
        on September 30, 2026. The whole product you see today shipped in
        four weeks.
      </P>
      <P>
        No GitHub release tags exist yet. The entries below group merged
        work by development milestone so you can follow the narrative.
        Dates come from the merge commit for each milestone. When tags are
        created, this page will switch to listing real tagged releases.
      </P>

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

      <div className="mt-12 border-t border-line-subtle pt-6 text-[12px] text-ink-faint">
        The full git log lives at{' '}
        <Link to="https://github.com/MojolaoluwaOlanusi/Tudu/commits/main" className="underline hover:text-ink">
          github.com/MojolaoluwaOlanusi/Tudu/commits/main
        </Link>
        .
      </div>
    </div>
  </MarketingShell>
);

export default ChangelogPage;