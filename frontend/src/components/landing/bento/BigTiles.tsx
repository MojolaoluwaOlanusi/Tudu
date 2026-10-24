import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Clock, Search, Play, Pause } from 'lucide-react';
import { TileHeader, useTileInView, wait, Cursor } from './shared';
import { twMerge } from 'tailwind-merge';

const tileClass =
  'relative overflow-hidden rounded-xl border border-line bg-surface p-5 transition-colors duration-300 hover:border-line-strong';

const PROMPT = 'Plan app launch';
const SUBTASKS = [
  { title: 'Draft launch brief', estimate: '2d' },
  { title: 'Define success metrics', estimate: '1d' },
  { title: 'Coordinate marketing', estimate: '3d' },
  { title: 'Prepare press kit', estimate: '2d' },
  { title: 'Schedule demos', estimate: '1d' },
  { title: 'Write announcement', estimate: '1d' },
];

export const AiBreakdownTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [typed, setTyped] = useState('');
  const [phase, setPhase] = useState<'idle' | 'typing' | 'generating' | 'showing'>('idle');
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setPhase('typing');
        setTyped('');
        setShown(0);
        await wait(600);
        if (cancelled) return;
        for (let i = 1; i <= PROMPT.length; i += 1) {
          if (cancelled) return;
          setTyped(PROMPT.slice(0, i));
          await wait(55);
        }
        await wait(500);
        if (cancelled) return;
        setPhase('generating');
        await wait(700);
        if (cancelled) return;
        setPhase('showing');
        for (let i = 1; i <= SUBTASKS.length; i += 1) {
          if (cancelled) return;
          setShown(i);
          await wait(170);
        }
        await wait(2800);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [inView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      data-spotlight=""
      className={twMerge(tileClass, className)}
    >
      <div className="relative">
        <TileHeader
          title="AI that actually helps"
          icon={<Sparkles className="h-3.5 w-3.5" />}
          badge="Pro"
        />
        <div className="mt-4 flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-brand" />
          <span className="min-w-0 flex-1 truncate text-[13px] text-ink">
            {typed}
            {phase === 'typing' && <Cursor />}
          </span>
          <span className="shrink-0 rounded-sm bg-brand px-2 py-0.5 text-[10px] font-semibold text-ink-inverse">
            Break down
          </span>
        </div>
        <div className="mt-3 min-h-[170px]">
          <AnimatePresence mode="wait">
            {phase === 'generating' && (
              <motion.p
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-[11px] text-ink-muted"
              >
                Breaking into steps<span className="animate-pulse">…</span>
              </motion.p>
            )}
            {phase === 'showing' && (
              <motion.div
                key="list"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-1.5"
              >
                {SUBTASKS.slice(0, shown).map((task) => (
                  <motion.div
                    key={task.title}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center gap-2 rounded-md border border-line-subtle bg-raised px-2 py-1.5"
                  >
                    <span className="h-3.5 w-3.5 shrink-0 rounded border border-line-strong" />
                    <span className="min-w-0 flex-1 truncate text-[12px] text-ink">
                      {task.title}
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-sm bg-line-subtle px-1.5 py-0.5 text-[10px] text-ink-muted">
                      <Clock className="h-2.5 w-2.5" />
                      {task.estimate}
                    </span>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line-subtle pt-3 text-[11px]">
          <span className="text-ink-faint">Free · 100 / mo</span>
          <span className="font-medium text-brand">Pro · 1,200 + HD</span>
        </div>
      </div>
    </motion.div>
  );
};

const CMD_FILTER = '@me due:today';
const CMD_RESULTS = ['Design dashboard', 'Review API spec', 'Ship pricing page'];

export const CommandPaletteTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [showK, setShowK] = useState(false);
  const [filter, setFilter] = useState('');
  const [results, setResults] = useState<string[]>([]);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setShowK(false);
        setFilter('');
        setResults([]);
        await wait(500);
        if (cancelled) return;
        setShowK(true);
        await wait(500);
        if (cancelled) return;
        for (let i = 1; i <= CMD_FILTER.length; i += 1) {
          if (cancelled) return;
          setFilter(CMD_FILTER.slice(0, i));
          await wait(55);
        }
        await wait(300);
        if (cancelled) return;
        for (let i = 0; i < CMD_RESULTS.length; i += 1) {
          if (cancelled) return;
          setResults(CMD_RESULTS.slice(0, i + 1));
          await wait(200);
        }
        await wait(2400);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [inView]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      data-spotlight=""
      className={twMerge(tileClass, className)}
    >
      <div className="relative">
        <TileHeader
          title="Command everything"
          icon={<Search className="h-3.5 w-3.5" />}
          hint="⌘K"
        />
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-2 rounded-md border border-line bg-raised px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-ink-muted" />
            <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink">
              {filter}
              {filter.length > 0 && filter.length < CMD_FILTER.length && <Cursor />}
            </span>
            <AnimatePresence>
              {showK && (
                <motion.span
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                  className="shrink-0 rounded border border-line bg-surface px-1.5 py-0.5 font-mono text-[10px] text-ink-muted"
                >
                  K
                </motion.span>
              )}
            </AnimatePresence>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['@me', 'due:today'].map((chip, i) => (
              <motion.span
                key={chip}
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: filter.includes(chip.split(' ')[0]) ? 1 : 0.2 }}
                transition={{ delay: i * 0.08 }}
                className="rounded-sm border border-brand/30 bg-brand-subtle px-1.5 py-0.5 font-mono text-[10px] text-brand"
              >
                {chip}
              </motion.span>
            ))}
          </div>
        </div>
        <div className="mt-3 min-h-[110px] space-y-1">
          {results.map((r, i) => (
            <motion.div
              key={r}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className={
                'flex items-center gap-2 rounded-md px-2 py-1.5 text-[12px] ' +
                (i === 0 ? 'bg-raised text-ink' : 'text-ink-muted')
              }
            >
              <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-line-strong" />
              <span className="min-w-0 flex-1 truncate">{r}</span>
              <span className="shrink-0 font-mono text-[10px] text-ink-faint">⏎</span>
            </motion.div>
          ))}
        </div>
        <p className="mt-3 border-t border-line-subtle pt-3 text-[10px] text-ink-faint">
          Power query:{' '}
          <span className="font-mono text-ink-muted">@me #work due:week priority:high</span>
        </p>
      </div>
    </motion.div>
  );
};

export const FocusModeTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [seconds, setSeconds] = useState(25 * 60);
  const [statsWidth, setStatsWidth] = useState(20);

  useEffect(() => {
    if (!inView) return;
    setSeconds(25 * 60 - 37);
    const id = window.setInterval(() => {
      setSeconds((s) => (s <= 1 ? 25 * 60 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    let raf: number | undefined;
    let t0: number | undefined;
    const step = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / 2200);
      setStatsWidth(20 + p * 60);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [inView]);

  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const label =
    String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  const pct = 1 - seconds / (25 * 60);
  const circ = 2 * Math.PI * 26;

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15 } }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.4, ease: [0.2, 0, 0, 1] }}
      data-spotlight=""
      className={twMerge(tileClass, className)}
    >
      <TileHeader
        title="Focus Mode, built-in"
        icon={<Play className="h-3.5 w-3.5" />}
      />
      <div className="mt-4 flex items-center gap-4">
        <div className="relative h-16 w-16 shrink-0">
          <svg viewBox="0 0 64 64" className="h-full w-full -rotate-90">
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="4"
            />
            <circle
              cx="32"
              cy="32"
              r="26"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={circ * (1 - pct)}
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center font-mono text-[11px] font-semibold text-ink">
            {label}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-medium text-ink">Design dashboard</p>
          <p className="mt-0.5 text-[10px] text-ink-faint">
            Pomodoro · Session 2 of 4
          </p>
          <span className="mt-2 inline-flex items-center gap-1 rounded-sm bg-line-subtle px-2 py-1 text-[10px] font-medium text-ink-muted">
            <Pause className="h-2.5 w-2.5" /> Pause
          </span>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-ink-faint">Today</span>
          <span className="font-medium text-ink">1h 15m</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-line-subtle">
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-1000"
            style={{ width: statsWidth + '%' }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-ink-faint">Weekly goal</span>
          <span className="text-ink-muted">{Math.round(statsWidth)}%</span>
        </div>
      </div>
    </motion.div>
  );
};