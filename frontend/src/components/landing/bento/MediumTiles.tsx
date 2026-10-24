import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Undo2,
  WifiOff,
  CheckCircle2,
  Palette,
  Users,
  Terminal,
} from 'lucide-react';
import { TileHeader, useTileInView, wait } from './shared';
import { twMerge } from 'tailwind-merge';

const tileClass =
  'relative overflow-hidden rounded-xl border border-line bg-surface p-5 transition-colors duration-300 hover:border-line-strong';

export const NeverLoseWorkTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setStep(0);
        await wait(700);
        if (cancelled) return;
        setStep(1);
        await wait(1600);
        if (cancelled) return;
        setStep(2);
        await wait(1200);
        if (cancelled) return;
        setStep(3);
        await wait(1400);
        if (cancelled) return;
        setStep(4);
        await wait(2000);
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
      <TileHeader title="Never lose work" icon={<Undo2 className="h-3.5 w-3.5" />} />
      <div className="mt-4 min-h-[180px]">
        <AnimatePresence mode="wait">
          {step <= 1 && (
            <motion.div
              key="task"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -8 }}
            >
              <div
                className={
                  'rounded-md border border-line bg-raised px-2.5 py-2 transition-all ' +
                  (step === 1 ? 'line-through opacity-40' : '')
                }
              >
                <p className="text-[12px] text-ink">Delete Q4 board</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {step >= 1 && step <= 2 && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              className="mt-3 flex items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-2 shadow-lg"
            >
              <Undo2 className="h-3 w-3 shrink-0 text-brand" />
              <span className="min-w-0 flex-1 truncate text-[11px] text-ink">
                Deleted &ldquo;Q4 board&rdquo;
              </span>
              <span className="shrink-0 rounded-sm bg-brand px-1.5 py-0.5 text-[10px] font-semibold text-ink-inverse">
                Undo
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {step >= 2 && (
            <motion.div
              key="status"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 flex items-center gap-2 rounded-md border border-line bg-raised px-2.5 py-2"
            >
              {step === 2 && (
                <>
                  <WifiOff className="h-3 w-3 shrink-0 text-amber-400" />
                  <span className="text-[11px] text-ink-muted">
                    Offline — 1 change queued
                  </span>
                </>
              )}
              {step === 3 && (
                <>
                  <motion.span
                    className="h-3 w-3 shrink-0 rounded-full border-2 border-brand border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                  />
                  <span className="text-[11px] text-ink-muted">Syncing…</span>
                </>
              )}
              {step === 4 && (
                <>
                  <CheckCircle2 className="h-3 w-3 shrink-0 text-brand" />
                  <span className="text-[11px] font-medium text-ink">
                    Synced — deleted task restored
                  </span>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-3 border-t border-line-subtle pt-3 text-[10px] text-ink-faint">
        Soft delete + offline queue + auto-sync
      </p>
    </motion.div>
  );
};

const COLORS = ['#8B5CF6', '#F5A524', '#22C55E', '#EF4444', '#3B82F6'];
const TEMPLATES = ['Sprint', 'Bug Fix', 'Content'];

export const BoardsThatFitTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [active, setActive] = useState(0);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        for (let i = 0; i < COLORS.length; i += 1) {
          if (cancelled) return;
          setActive(i);
          await wait(700);
        }
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [inView]);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        for (const t of TEMPLATES) {
          if (cancelled) return;
          setInstalling(t);
          await wait(1000);
        }
        setInstalling(null);
        await wait(600);
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
      <TileHeader title="Boards that fit you" icon={<Palette className="h-3.5 w-3.5" />} />
      <div className="mt-4 flex items-center gap-1.5">
        {COLORS.map((c, i) => (
          <motion.span
            key={c}
            className="h-4 w-4 rounded-full"
            style={{ backgroundColor: c }}
            animate={{ scale: active === i ? 1.35 : 1, opacity: active === i ? 1 : 0.5 }}
            transition={{ duration: 0.25 }}
          />
        ))}
      </div>
      <div className="mt-4 rounded-md border border-line bg-raised p-2">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
            Doing
          </span>
          <span className="rounded-sm bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-red-400">
            3/3
          </span>
        </div>
        <div className="mt-2 space-y-1">
          {['Card one', 'Card two', 'Card three'].map((t) => (
            <div
              key={t}
              className="rounded-sm border border-line-subtle bg-surface px-2 py-1 text-[11px] text-ink"
            >
              {t}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1.5 text-[10px] text-ink-faint">Templates</p>
        <div className="flex flex-wrap gap-1.5">
          {TEMPLATES.map((t) => (
            <span
              key={t}
              className={
                'rounded-sm border px-1.5 py-0.5 text-[10px] font-medium transition-colors ' +
                (installing === t
                  ? 'border-brand bg-brand text-ink-inverse'
                  : 'border-line bg-raised text-ink-muted')
              }
            >
              {installing === t ? '✓ ' : ''}
              {t}
            </span>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export const KeyboardFirstTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [phase, setPhase] = useState<'idle' | 'n' | 'b' | 'bar'>('idle');

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setPhase('idle');
        await wait(600);
        if (cancelled) return;
        setPhase('n');
        await wait(1400);
        if (cancelled) return;
        setPhase('b');
        await wait(900);
        if (cancelled) return;
        setPhase('bar');
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
      <TileHeader
        title="Keyboard-first"
        icon={<Terminal className="h-3.5 w-3.5" />}
        hint="n · b · ⌘K"
      />
      <div className="mt-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <motion.span
            animate={{ scale: phase === 'n' ? 1.15 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-sm font-semibold transition-colors ' +
              (phase === 'n'
                ? 'border-brand bg-brand text-ink-inverse'
                : 'border-line bg-raised text-ink-muted')
            }
          >
            n
          </motion.span>
          <span className="text-[11px] text-ink-muted">New task</span>
          <AnimatePresence>
            {phase === 'n' && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="ml-auto rounded-sm border border-line bg-raised px-2 py-0.5 text-[10px] text-ink-muted"
              >
                composer opened
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <div className="flex items-center gap-3">
          <motion.span
            animate={{ scale: phase === 'b' || phase === 'bar' ? 1.15 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className={
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border font-mono text-sm font-semibold transition-colors ' +
              (phase === 'b' || phase === 'bar'
                ? 'border-brand bg-brand text-ink-inverse'
                : 'border-line bg-raised text-ink-muted')
            }
          >
            b
          </motion.span>
          <span className="text-[11px] text-ink-muted">Bulk select</span>
        </div>
        <div className="relative h-9">
          <AnimatePresence>
            {phase === 'bar' && (
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.2, 0, 0, 1] }}
                className="absolute inset-x-0 flex items-center gap-2 rounded-md border border-line bg-raised px-2 py-1.5 text-[10px]"
              >
                <span className="font-medium text-ink">3 selected</span>
                <span className="ml-auto rounded-sm border border-line bg-surface px-1.5 py-0.5 text-ink-muted">
                  Done
                </span>
                <span className="rounded-sm border border-line bg-surface px-1.5 py-0.5 text-ink-muted">
                  Delete
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export const WorkspacesTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setRevealed(0);
        for (let i = 1; i <= 3; i += 1) {
          if (cancelled) return;
          setRevealed(i);
          await wait(350);
        }
        await wait(2000);
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
      <TileHeader title="Workspaces & roles" icon={<Users className="h-3.5 w-3.5" />} />
      <div className="mt-4 rounded-md border border-line bg-raised p-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-ink">Sprint 12</span>
          <span className="rounded-sm bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-brand">
            Admin
          </span>
        </div>
        <div className="mt-2 flex -space-x-1.5">
          {['A', 'B', 'C'].map((i, idx) => (
            <motion.span
              key={i}
              animate={{
                opacity: idx < revealed ? 1 : 0.2,
                scale: idx < revealed ? 1 : 0.9,
              }}
              transition={{ duration: 0.3 }}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-brand text-[10px] font-semibold text-ink-inverse"
            >
              {i}
            </motion.span>
          ))}
          <span className="ml-2 flex h-6 items-center text-[10px] text-ink-faint">
            3 members
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-1">
        <p className="text-[10px] uppercase tracking-wider text-ink-faint">
          Shared lists
        </p>
        <div className="flex items-center justify-between rounded-sm border border-line-subtle bg-raised px-2 py-1 text-[11px]">
          <span className="text-ink">Design backlog</span>
          <span className="text-ink-faint">edit</span>
        </div>
        <div className="flex items-center justify-between rounded-sm border border-line-subtle bg-raised px-2 py-1 text-[11px]">
          <span className="text-ink">Q4 roadmap</span>
          <span className="text-ink-faint">view</span>
        </div>
      </div>
    </motion.div>
  );
};