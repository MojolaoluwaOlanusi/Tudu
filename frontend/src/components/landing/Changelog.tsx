import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Entry {
  version: string;
  date: string;
  title: string;
  excerpt: string;
}

// Three most recent milestones from the actual git log. Full history at
// /changelog.
const ENTRIES: Entry[] = [
  {
    version: 'v1.0.0',
    date: 'Oct 28, 2026',
    title: 'Launch-ready',
    excerpt:
      'CI on every push, AGPL-3.0, full self-hosting + marketplace + API docs, and a mobile-and-honesty pass across the marketing site.',
  },
  {
    version: 'v0.7.0',
    date: 'Oct 16, 2026',
    title: 'Pro tier ships',
    excerpt:
      'Paystack subscriptions, tier gating, HD AI breakdown with credit metering, and a self-hosting license you own forever.',
  },
  {
    version: 'v0.6.0',
    date: 'Oct 14, 2026',
    title: 'Free tier complete',
    excerpt:
      'Landing page, onboarding wizard, power filters, sorting, undo, bulk actions, keyboard shortcuts, PWA, templates, public read API, and due-date reminders.',
  },
];

const Changelog: React.FC = () => (
  <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
    <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          Changelog
        </p>
        <h2 className="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          Shipped in the open
        </h2>
      </div>
      <Link
        to="/changelog"
        className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
      >
        Full history <ArrowRight className="h-3 w-3" />
      </Link>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {ENTRIES.map((entry, i) => (
        <Link key={entry.version} to="/changelog" className="block">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className="group h-full rounded-lg border border-line bg-surface p-5 transition-colors hover:border-line-strong"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-sm bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold text-brand">
                {entry.version}
              </span>
              <span className="text-[11px] text-ink-faint">{entry.date}</span>
            </div>
            <h3 className="mb-2 text-sm font-semibold text-ink transition-colors group-hover:text-brand">
              {entry.title}
            </h3>
            <p className="text-[12px] leading-relaxed text-ink-muted">
              {entry.excerpt}
            </p>
            <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-ink-muted transition-colors group-hover:text-brand">
              Read more
              <ArrowRight className="h-3 w-3" />
            </div>
          </motion.div>
        </Link>
      ))}
    </div>
  </section>
);

export default Changelog;