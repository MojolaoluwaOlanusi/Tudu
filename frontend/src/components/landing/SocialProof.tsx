import React from 'react';
import { motion } from 'framer-motion';
import { GitBranch, Shield, Globe } from 'lucide-react';

interface Principle {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
}

// Previously this component showed three fictional testimonials attributed
// to named people at real companies (Kuda, Mono, Flutterwave), plus
// fabricated metrics ("500+ Teams", "12,000+ Tasks", "NGN 45k paid to
// publishers"). None of that was backed by the codebase or by any real
// data. Replaced with honest statements about what the project optimizes
// for, plus verifiable facts from the repository itself.
const PRINCIPLES: Principle[] = [
  {
    icon: GitBranch,
    title: 'Built in the open',
    body: 'Every commit is public. The roadmap, the bugs, and the honest limits all live in the repository.',
  },
  {
    icon: Shield,
    title: 'Self-hostable',
    body: 'Run it on your own server. The Pro tier unlocks on a signed license you own, not on a phone-home check.',
  },
  {
    icon: Globe,
    title: 'A free tier that works',
    body: 'The free plan is not a trial. Every feature a solo user needs is free, forever.',
  },
];

const FACTS = [
  { label: 'License', value: 'AGPL-3.0' },
  { label: 'Stack', value: 'Postgres + React' },
  { label: 'Source', value: 'On GitHub' },
];

const SocialProof: React.FC = () => (
  <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
    <div className="mb-12 text-center">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        What this project optimizes for
      </p>
      <h2 className="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl">
        Small, honest, and built to be read
      </h2>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {PRINCIPLES.map((p, i) => {
        const Icon = p.icon;
        return (
          <motion.div
            key={p.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            className="rounded-lg border border-line bg-surface p-5"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-subtle text-brand">
              <Icon className="h-4 w-4" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-ink">{p.title}</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">
              {p.body}
            </p>
          </motion.div>
        );
      })}
    </div>

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mt-12 grid grid-cols-3 gap-6 border-t border-line-subtle pt-10 text-center"
    >
      {FACTS.map((f) => (
        <div key={f.label}>
          <p className="text-[11px] uppercase tracking-wider text-ink-faint">
            {f.label}
          </p>
          <p className="mt-1 text-sm font-medium text-ink">{f.value}</p>
        </div>
      ))}
    </motion.div>
  </section>
);

export default SocialProof;