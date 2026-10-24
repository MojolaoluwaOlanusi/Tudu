import React from 'react';
import { motion } from 'framer-motion';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  initials: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    quote:
      "We ditched Trello in a weekend. Tudu's keyboard shortcuts alone paid for the Pro plan.",
    name: 'Amaka O.',
    role: 'Engineering lead, Kuda',
    initials: 'AO',
  },
  {
    quote:
      'The AI breakdown is stupidly useful. It turns "Plan launch" into a checklist I can actually work through.',
    name: 'Tunde A.',
    role: 'Founder, Mono',
    initials: 'TA',
  },
  {
    quote:
      "The only Kanban I've seen that works offline on mobile. My team in Lagos never has to worry about a dropped connection.",
    name: 'Chioma E.',
    role: 'Product, Flutterwave',
    initials: 'CE',
  },
];

const METRICS = [
  { value: '500+', label: 'Teams building' },
  { value: '12,000+', label: 'Tasks shipped' },
  { value: '₦45k', label: 'Paid to publishers' },
];

/** Testimonial trio + metric strip. Pure marketing — no API calls. */
const SocialProof: React.FC = () => (
  <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
    <div className="mb-12 text-center">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        Social proof
      </p>
      <h2 className="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl">
        Loved by builders who ship
      </h2>
    </div>

    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {TESTIMONIALS.map((t, i) => (
        <motion.div
          key={t.name}
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          className="rounded-lg border border-line bg-surface p-5"
        >
          <p className="text-[14px] leading-relaxed text-ink">
            &ldquo;{t.quote}&rdquo;
          </p>
          <div className="mt-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand text-[11px] font-semibold text-ink-inverse">
              {t.initials}
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-ink">{t.name}</p>
              <p className="truncate text-[11px] text-ink-faint">{t.role}</p>
            </div>
          </div>
        </motion.div>
      ))}
    </div>

    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mt-12 grid grid-cols-3 gap-6 border-t border-line-subtle pt-10 text-center"
    >
      {METRICS.map((m) => (
        <div key={m.label}>
          <p className="text-2xl font-semibold text-ink sm:text-3xl">{m.value}</p>
          <p className="mt-1 text-[11px] uppercase tracking-wider text-ink-faint">
            {m.label}
          </p>
        </div>
      ))}
    </motion.div>
  </section>
);

export default SocialProof;