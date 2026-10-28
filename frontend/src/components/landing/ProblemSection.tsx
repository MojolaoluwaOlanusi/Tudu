import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

type Mode = 'trello' | 'jira';
type CardKey = 'trello' | 'tudu' | 'jira';

interface CardData {
  name: string;
  tagline: string;
  bullets: string[];
  impact: string;
  tone: 'competitor' | 'brand';
}

const CARDS: Record<CardKey, CardData> = {
  trello: {
    name: 'Trello',
    tagline: "Great, until it isn't.",
    bullets: [
      'No real filters',
      'Breaks on mobile',
      'Power-ups add up fast',
    ],
    impact: 'Many teams spend more on workarounds than Tudu gives free.',
    tone: 'competitor',
  },
  tudu: {
    name: 'Tudu',
    tagline: 'The middle path.',
    bullets: [
      'Fast like Trello',
      'Powerful where it counts',
      'Free for personal use',
      'Offline-first',
    ],
    impact: 'The only board your whole team actually opens.',
    tone: 'brand',
  },
  jira: {
    name: 'Jira',
    tagline: 'Powerful, until it slows you down.',
    bullets: [
      'Many clicks to create a task',
      'The setup takes a project to figure out',
      'Config debt you can’t undo',
    ],
    impact: 'Many teams burn their first sprint just onboarding.',
    tone: 'competitor',
  },
};

const useIsMobile = (): boolean => {
  const [mobile, setMobile] = useState(
    typeof window !== 'undefined' &&
      window.matchMedia('(max-width: 767px)').matches,
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return mobile;
};

interface CardProps {
  cardKey: CardKey;
  card: CardData;
  mode: Mode;
  index: number;
}

const Card: React.FC<CardProps> = ({ cardKey, card, mode, index }) => {
  const [hovered, setHovered] = useState(false);
  const isMobile = useIsMobile();
  const showImpact = hovered || isMobile;
  const isDimmed =
    (cardKey === 'trello' && mode === 'jira') ||
    (cardKey === 'jira' && mode === 'trello');
  const isTudu = cardKey === 'tudu';

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
    >
      <motion.div
        animate={{ opacity: isDimmed ? 0.35 : 1, scale: isDimmed ? 0.98 : 1 }}
        transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={
          'relative h-full rounded-lg border p-5 ' +
          (isTudu ? 'border-brand/40 bg-brand-subtle' : 'border-line bg-surface')
        }
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={
                  'h-2 w-2 shrink-0 rounded-full ' +
                  (isTudu ? 'bg-brand' : 'bg-ink-faint')
                }
              />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {card.name}
              </span>
            </div>
            <p
              className={
                'mt-2 text-sm leading-snug ' +
                (isTudu ? 'text-ink' : 'text-ink-muted')
              }
            >
              {card.tagline}
            </p>
          </div>
          {isTudu && (
            <span className="shrink-0 rounded-sm bg-brand/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-brand">
              You&apos;re here
            </span>
          )}
        </div>

        <div className="my-4 h-px bg-line-subtle" />

        <ul className="space-y-2">
          {card.bullets.map((bullet, i) => (
            <motion.li
              key={bullet}
              initial={{ opacity: 0, x: -4 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: index * 0.08 + 0.2 + i * 0.05 }}
              className="flex items-start gap-2 text-[13px]"
            >
              {isTudu ? (
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" strokeWidth={2.5} />
              ) : (
                <X className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400/80" strokeWidth={2.5} />
              )}
              <span className={isTudu ? 'text-ink' : 'text-ink-muted'}>{bullet}</span>
            </motion.li>
          ))}
        </ul>

        <AnimatePresence initial={false}>
          {showImpact && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
              className="overflow-hidden"
            >
              <div
                className={
                  'mt-3 rounded-md border-l-2 px-3 py-2 text-[11px] leading-relaxed ' +
                  (isTudu
                    ? 'border-brand bg-brand-subtle/60 text-ink'
                    : 'border-red-400/50 bg-red-500/5 text-ink-muted')
                }
              >
                <span className="font-semibold">{isTudu ? '→ ' : '⚠ '}</span>
                {card.impact}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

/** Side-by-side honest comparison of Trello, Tudu, and Jira. */
const ProblemSection: React.FC = () => {
  const [mode, setMode] = useState<Mode>('trello');

  return (
    <section className="mx-auto max-w-7xl px-6 py-20 lg:py-28">
      <div className="mb-10 max-w-2xl">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
          The honest comparison
        </p>
        <h2 className="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl">
          You&apos;ve outgrown the options. There&apos;s a middle path.
        </h2>
        <p className="mt-3 text-base leading-relaxed text-ink-muted">
          Trello is fast but shallow. Jira is deep but slow. Tudu is both fast and
          deep — because we&apos;re not trying to be either.
        </p>
      </div>

      <div className="mb-8 inline-flex rounded-lg border border-line bg-surface p-1">
        {(
          [
            { key: 'trello' as const, label: 'Trello vs Tudu' },
            { key: 'jira' as const, label: 'Jira vs Tudu' },
          ]
        ).map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setMode(opt.key)}
            aria-pressed={mode === opt.key}
            className="relative rounded-md px-4 py-1.5 text-[13px] font-medium transition-colors"
          >
            {mode === opt.key && (
              <motion.div
                layoutId="problem-toggle"
                className="absolute inset-0 rounded-md bg-raised"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span
              className={
                'relative z-10 ' + (mode === opt.key ? 'text-ink' : 'text-ink-muted')
              }
            >
              {opt.label}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card cardKey="trello" card={CARDS.trello} mode={mode} index={0} />
        <Card cardKey="tudu" card={CARDS.tudu} mode={mode} index={1} />
        <Card cardKey="jira" card={CARDS.jira} mode={mode} index={2} />
      </div>
    </section>
  );
};

export default ProblemSection;