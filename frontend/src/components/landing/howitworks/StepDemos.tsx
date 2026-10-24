import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useInView, useReducedMotion } from 'framer-motion';
import { Check, Calendar, Tag, Zap, GripVertical } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/**
 * Runs `fn` in a loop while `fn`'s own `cancelled()` check returns false.
 *
 * The loop only starts when the host element is actually visible AND the
 * user has not asked for reduced motion. In jsdom (tests), the
 * IntersectionObserver stub never fires, so `inView` stays false and the
 * loop never runs — demos render their initial state, which is what the
 * tests want.
 */
function useLoop(
  fn: (isCancelled: () => boolean) => Promise<void>,
  deps: React.DependencyList = [],
) {
  const ref = useRef<HTMLDivElement | null>(null);
  const inView = useInView(ref, { margin: '-40px', once: false });
  const reduced = useReducedMotion();
  useEffect(() => {
    if (!inView || reduced) return;
    let cancelled = false;
    void (async () => {
      while (!cancelled) {
        await fn(() => cancelled);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, ...deps]);
  return { ref, inView, reduced };
}

/* ================================================================== */
/* 1. Capture in seconds — NLP types, chips appear, morphs to card    */
/* ================================================================== */

const CAPTURE_TEXT = 'Buy milk tomorrow 9am #personal urgent';
const CAPTURE_CHIPS = [
  { icon: Calendar, label: 'Tomorrow · 9am', tone: 'brand' as const },
  { icon: Tag, label: 'Personal', tone: 'brand' as const },
  { icon: Zap, label: 'High priority', tone: 'amber' as const },
];

export const CaptureDemo: React.FC = () => {
  const [typed, setTyped] = useState('');
  const [chips, setChips] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'parsing' | 'morphed'>('typing');

  const { ref, reduced } = useLoop(async (cancelled) => {
    setPhase('typing');
    setTyped('');
    setChips(0);
    await wait(500);
    if (cancelled()) return;
    for (let i = 1; i <= CAPTURE_TEXT.length; i += 1) {
      if (cancelled()) return;
      setTyped(CAPTURE_TEXT.slice(0, i));
      await wait(28);
    }
    await wait(300);
    if (cancelled()) return;
    setPhase('parsing');
    for (let i = 1; i <= CAPTURE_CHIPS.length; i += 1) {
      if (cancelled()) return;
      setChips(i);
      await wait(320);
    }
    await wait(400);
    if (cancelled()) return;
    setPhase('morphed');
    await wait(2600);
  });

  return (
    <div ref={ref} className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Quick add
        </span>
        <span className="text-[10px] text-ink-faint">
          {phase === 'morphed' ? 'Created' : 'Typing…'}
        </span>
      </div>

      <AnimatePresence mode="wait">
        {phase !== 'morphed' ? (
          <motion.div
            key="composer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="rounded-md border border-line bg-raised px-3 py-2 text-[13px] text-ink">
              {typed || reduced ? CAPTURE_TEXT : typed}
              {phase === 'typing' && !reduced && (
                <span className="ml-0.5 inline-block h-3 w-px animate-pulse bg-brand align-middle" />
              )}
            </div>
            <div className="mt-3 flex min-h-[24px] flex-wrap gap-1.5">
              {CAPTURE_CHIPS.slice(0, reduced ? 3 : chips).map((chip) => {
                const Icon = chip.icon;
                return (
                  <motion.span
                    key={chip.label}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={twMerge(
                      'inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[10px] font-medium',
                      chip.tone === 'amber'
                        ? 'border-amber-400/30 bg-amber-400/10 text-amber-400'
                        : 'border-brand/30 bg-brand-subtle text-brand',
                    )}
                  >
                    <Icon className="h-2.5 w-2.5" />
                    {chip.label}
                  </motion.span>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
            className="rounded-md border border-line bg-raised p-3"
          >
            <div className="flex items-start gap-2">
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-line-strong" />
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink">Buy milk</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-sm bg-line-subtle px-1.5 py-0.5 text-[10px] text-ink-muted">
                    <Calendar className="h-2.5 w-2.5" /> Tomorrow · 9am
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-sm bg-brand-subtle px-1.5 py-0.5 text-[10px] text-brand">
                    <Tag className="h-2.5 w-2.5" /> personal
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-sm bg-amber-400/10 px-1.5 py-0.5 text-[10px] text-amber-400">
                    <Zap className="h-2.5 w-2.5" /> High
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ================================================================== */
/* 2. Organize with flow — drag, multi-select, bulk move              */
/* ================================================================== */

const ORGANIZE_COLS = [
  { id: 'todo', name: 'To-do' },
  { id: 'doing', name: 'Doing' },
  { id: 'done', name: 'Done' },
];

interface OrganizeCard {
  id: string;
  title: string;
  column: string;
}

const ORGANIZE_INITIAL: OrganizeCard[] = [
  { id: 'o1', title: 'Design', column: 'todo' },
  { id: 'o2', title: 'Review API', column: 'todo' },
  { id: 'o3', title: 'Write notes', column: 'todo' },
  { id: 'o4', title: 'Ship pricing', column: 'doing' },
];

export const OrganizeDemo: React.FC = () => {
  const [cards, setCards] = useState<OrganizeCard[]>(ORGANIZE_INITIAL);
  const [selected, setSelected] = useState<string[]>([]);

  const { ref, reduced } = useLoop(async (cancelled) => {
    setCards(ORGANIZE_INITIAL);
    setSelected([]);
    await wait(700);
    if (cancelled()) return;

    setCards((c) => c.map((x) => (x.id === 'o1' ? { ...x, column: 'doing' } : x)));
    await wait(900);
    if (cancelled()) return;

    setSelected(['o2', 'o3']);
    await wait(900);
    if (cancelled()) return;

    setCards((c) =>
      c.map((x) => (x.id === 'o2' || x.id === 'o3' ? { ...x, column: 'done' } : x)),
    );
    setSelected([]);
    await wait(2400);
  });

  const visible = reduced ? ORGANIZE_INITIAL : cards;

  return (
    <div ref={ref} className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Board
        </span>
        <span className="text-[10px] text-ink-faint">
          {selected.length > 0 ? `${selected.length} selected` : 'Drag to move'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {ORGANIZE_COLS.map((col) => (
          <div
            key={col.id}
            className="min-h-[160px] rounded-md border border-line-subtle bg-raised/40 p-1.5"
          >
            <div className="mb-1.5 px-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
              {col.name}
            </div>
            <div className="space-y-1">
              {visible
                .filter((c) => c.column === col.id)
                .map((card) => {
                  const isSel = selected.includes(card.id);
                  return (
                    <motion.div
                      key={card.id}
                      layoutId={reduced ? undefined : `organize-${card.id}`}
                      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
                      className={twMerge(
                        'rounded-sm border bg-surface px-1.5 py-1 text-[10px] transition-colors',
                        isSel
                          ? 'border-brand bg-brand-subtle text-ink'
                          : 'border-line-subtle text-ink',
                      )}
                    >
                      <div className="flex items-center gap-1">
                        {isSel && <Check className="h-2.5 w-2.5 shrink-0 text-brand" />}
                        <GripVertical className="h-2.5 w-2.5 shrink-0 text-ink-faint" />
                        <span className="truncate">{card.title}</span>
                      </div>
                    </motion.div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ================================================================== */
/* 3. Stay in focus — timer + growing stats + log entry                */
/* ================================================================== */

export const FocusDemo: React.FC = () => {
  const [seconds, setSeconds] = useState(25 * 60 - 42);
  const [progress, setProgress] = useState(0.15);
  const [logged, setLogged] = useState(false);

  const { ref, reduced } = useLoop(async (cancelled) => {
    setSeconds(25 * 60 - 42);
    setProgress(0.15);
    setLogged(false);
    await wait(600);
    if (cancelled()) return;
    for (let i = 0; i < 42; i += 1) {
      if (cancelled()) return;
      setSeconds((s) => Math.max(0, s - 1));
      await wait(55);
    }
    for (let i = 1; i <= 20; i += 1) {
      if (cancelled()) return;
      setProgress(0.15 + (i / 20) * 0.85);
      await wait(70);
    }
    setLogged(true);
    await wait(2200);
  });

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const label = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  const pct = reduced ? 1 : 1 - seconds / (25 * 60);
  const circ = 2 * Math.PI * 32;
  const stats = [
    { label: 'Today', value: Math.round(75 * progress) },
    { label: 'Week', value: Math.round(480 * progress) },
    { label: 'Month', value: Math.round(1920 * progress) },
  ];

  return (
    <div ref={ref} className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Focus session
        </span>
        <span className="text-[10px] text-ink-faint">
          {logged ? 'Logged' : 'In progress'}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0">
          <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
            <circle cx="40" cy="40" r="32" fill="none" stroke="var(--border-subtle)" strokeWidth="4" />
            <circle
              cx="40"
              cy="40"
              r="32"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
              style={{ transition: 'stroke-dashoffset 0.5s linear' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[12px] font-semibold text-ink tabular-nums">
            {label}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-ink">Design dashboard</p>
          <p className="mt-0.5 text-[10px] text-ink-faint">Pomodoro · Session 2 of 4</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {stats.map((st) => (
          <div key={st.label} className="rounded-md border border-line-subtle bg-raised px-1.5 py-1">
            <p className="text-[9px] text-ink-faint">{st.label}</p>
            <p className="font-mono text-[11px] font-semibold text-ink tabular-nums">
              {st.value}m
            </p>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {logged && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mt-3 flex items-center gap-2 rounded-md border border-brand/30 bg-brand-subtle px-2 py-1.5 text-[10px] text-brand"
          >
            <Check className="h-3 w-3" strokeWidth={3} />
            <span className="font-medium">+25m session logged</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ================================================================== */
/* 4. Ship & measure — empty chart → bars grow → line draws → 100%    */
/* ================================================================== */

const SHIP_BARS = [40, 65, 55, 80, 95, 70, 88];

export const ShipDemo: React.FC = () => {
  const [progress, setProgress] = useState(1);
  const [count, setCount] = useState(100);

  const { ref, reduced } = useLoop(async (cancelled) => {
    setProgress(1);
    setCount(100);
    await wait(500);
    if (cancelled()) return;
    setProgress(0);
    setCount(0);
    await wait(120);
    if (cancelled()) return;
    const steps = 24;
    for (let i = 1; i <= steps; i += 1) {
      if (cancelled()) return;
      setProgress(i / steps);
      setCount(Math.round((i / steps) * 100));
      await wait(80);
    }
    await wait(2600);
  });

  const p = reduced ? 1 : progress;
  const c = reduced ? 100 : count;

  return (
    <div ref={ref} className="rounded-xl border border-line bg-surface p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">
          Analytics
        </span>
        <span className="text-[10px] text-ink-faint">Last 7 days</span>
      </div>

      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-[10px] text-ink-faint">Completion</p>
          <p className="font-mono text-2xl font-semibold text-brand tabular-nums">
            {c}%
          </p>
        </div>
        <AnimatePresence>
          {c >= 100 && (
            <motion.span
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 rounded-sm border border-brand/30 bg-brand-subtle px-2 py-0.5 text-[10px] font-medium text-brand"
            >
              <Check className="h-2.5 w-2.5" strokeWidth={3} /> All done
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <div className="flex h-24 items-end gap-1.5">
        {SHIP_BARS.map((v, i) => (
          <div key={i} className="relative flex-1">
            <motion.div
              animate={{ height: `${v * p}%` }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-0 left-0 right-0 rounded-t-sm bg-brand/80"
            />
          </div>
        ))}
      </div>

      <div className="mt-2 flex justify-between text-[9px] text-ink-faint">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </div>
  );
};