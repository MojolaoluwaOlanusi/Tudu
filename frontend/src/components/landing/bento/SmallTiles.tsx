import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  LayoutTemplate,
  KeyRound,
  Bell,
  Package,
  Github,
  BarChart3,
} from 'lucide-react';
import { TileHeader, useTileInView, wait } from './shared';
import { twMerge } from 'tailwind-merge';

const tileClass =
  'relative overflow-hidden rounded-xl border border-line bg-surface p-5 transition-colors duration-300 hover:border-line-strong';

const TplCard: React.FC<{ title: string; icon: React.ReactNode }> = ({ title, icon }) => (
  <TileHeader title={title} icon={icon} />
);

export const PwaTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setShow(false);
        await wait(500);
        if (cancelled) return;
        setShow(true);
        await wait(3000);
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
      <TplCard title="PWA install" icon={<Download className="h-3.5 w-3.5" />} />
      <div className="mt-4 flex min-h-[110px] items-center justify-center">
        <AnimatePresence>
          {show && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
              className="w-full rounded-md border border-line bg-raised p-2 shadow-lg"
            >
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand text-[10px] font-semibold text-ink-inverse">
                  T
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[11px] font-medium text-ink">
                    Install Tudu
                  </p>
                  <p className="truncate text-[9px] text-ink-faint">Works offline</p>
                </div>
                <span className="shrink-0 rounded-sm bg-brand px-1.5 py-0.5 text-[9px] font-semibold text-ink-inverse">
                  Install
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

const TPL_ITEMS = [
  { name: 'Sprint', hint: 'Backlog → Done' },
  { name: 'Bug Fix', hint: 'Triage → QA' },
  { name: 'Content', hint: 'Idea → Published' },
];

export const TemplatesTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const id = window.setInterval(
      () => setActive((a) => (a + 1) % TPL_ITEMS.length),
      1600,
    );
    return () => window.clearInterval(id);
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
      <TplCard title="Templates" icon={<LayoutTemplate className="h-3.5 w-3.5" />} />
      <div className="mt-4 space-y-1.5">
        {TPL_ITEMS.map((t, i) => (
          <motion.div
            key={t.name}
            animate={{ scale: active === i ? 1.02 : 1 }}
            transition={{ duration: 0.25 }}
            className={
              'flex items-center justify-between rounded-md border px-2 py-1.5 transition-colors ' +
              (active === i
                ? 'border-brand/40 bg-brand-subtle'
                : 'border-line-subtle bg-raised')
            }
          >
            <div className="min-w-0">
              <p className="text-[11px] font-medium text-ink">{t.name}</p>
              <p className="text-[9px] text-ink-faint">{t.hint}</p>
            </div>
            {active === i && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="shrink-0 text-[9px] font-semibold text-brand"
              >
                install →
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export const SelfHostingTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!inView) return;
    const id = window.setInterval(() => setPulse((p) => !p), 1400);
    return () => window.clearInterval(id);
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
      <TplCard title="Self-hosting" icon={<KeyRound className="h-3.5 w-3.5" />} />
      <div className="mt-4 flex min-h-[110px] flex-col items-center justify-center">
        <motion.div
          animate={{
            boxShadow: pulse
              ? '0 0 0 6px rgba(34,197,94,0.15)'
              : '0 0 0 0px rgba(34,197,94,0)',
          }}
          transition={{ duration: 1.2 }}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/15"
        >
          <span className="text-sm text-brand">✓</span>
        </motion.div>
        <p className="mt-2 text-[11px] font-medium text-ink">License verified</p>
        <p className="text-[9px] text-ink-faint">Pro tier · expires Nov 2027</p>
      </div>
    </motion.div>
  );
};

export const NotificationsTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [show, setShow] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setShow(0);
        await wait(600);
        if (cancelled) return;
        setShow(1);
        await wait(1400);
        if (cancelled) return;
        setShow(2);
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
      <TplCard title="Notifications" icon={<Bell className="h-3.5 w-3.5" />} />
      <div className="mt-4 min-h-[110px] space-y-1.5">
        <AnimatePresence>
          {show >= 1 && (
            <motion.div
              key="push"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-md border border-line-subtle bg-raised px-2 py-1.5"
            >
              <Bell className="h-3 w-3 shrink-0 text-brand" />
              <span className="min-w-0 flex-1 truncate text-[10px] text-ink">
                Task due in 1h
              </span>
              <span className="shrink-0 text-[9px] text-ink-faint">push</span>
            </motion.div>
          )}
        </AnimatePresence>
        <AnimatePresence>
          {show >= 2 && (
            <motion.div
              key="slack"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-md border border-line-subtle bg-raised px-2 py-1.5"
            >
              <span className="shrink-0 text-[10px] font-bold text-ink-muted">#</span>
              <span className="min-w-0 flex-1 truncate text-[10px] text-ink">
                @you assigned a task
              </span>
              <span className="shrink-0 text-[9px] text-ink-faint">slack</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const MarketplaceTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    if (!inView) return;
    setEarnings(0);
    const target = 45000;
    const duration = 2000;
    const t0 = Date.now();
    let raf: number | undefined;
    const step = () => {
      const p = Math.min(1, (Date.now() - t0) / duration);
      setEarnings(Math.round(target * p));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      if (raf) cancelAnimationFrame(raf);
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
        title="Sell templates"
        icon={<Package className="h-3.5 w-3.5" />}
        badge="Pro"
      />
      <div className="mt-4 rounded-md border border-line bg-raised p-2.5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-ink">Sprint template</p>
            <p className="text-[9px] text-ink-faint">₦500 · 12 installs</p>
          </div>
          <span className="shrink-0 rounded-sm bg-brand/15 px-1.5 py-0.5 text-[9px] font-semibold text-brand">
            v2
          </span>
        </div>
      </div>
      <div className="mt-3">
        <p className="text-[10px] text-ink-faint">This month</p>
        <p className="font-mono text-lg font-semibold text-brand">
          ₦{earnings.toLocaleString()}
        </p>
      </div>
    </motion.div>
  );
};

export const IntegrationsTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [revealed, setRevealed] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let cancelled = false;
    const run = async () => {
      while (!cancelled) {
        setRevealed(0);
        await wait(600);
        if (cancelled) return;
        setRevealed(1);
        await wait(700);
        if (cancelled) return;
        setRevealed(2);
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
      <TplCard title="Integrations" icon={<Github className="h-3.5 w-3.5" />} />
      <div className="mt-4 space-y-1.5">
        {[
          { name: 'GitHub', icon: <Github className="h-3 w-3" /> },
          { name: 'Slack', icon: <span className="text-[10px] font-bold">#</span> },
        ].map((item, i) => (
          <motion.div
            key={item.name}
            animate={{ opacity: revealed > i ? 1 : 0.3 }}
            className="flex items-center gap-2 rounded-md border border-line-subtle bg-raised px-2 py-1.5"
          >
            <span className="flex h-4 w-4 items-center justify-center rounded-sm bg-line-subtle text-ink-muted">
              {item.icon}
            </span>
            <span className="min-w-0 flex-1 text-[11px] text-ink">{item.name}</span>
            {revealed > i && (
              <motion.span
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-[10px] text-brand"
              >
                ✓
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const BAR_VALS = [40, 65, 48, 78, 90, 72, 85];

export const AnalyticsTile: React.FC<{ className?: string }> = ({ className }) => {
  const { ref, inView } = useTileInView();
  const [progress, setProgress] = useState(1);

  useEffect(() => {
    if (!inView) return;
    const t = window.setTimeout(() => {
      setProgress(0);
      const t0 = Date.now();
      const duration = 1600;
      let raf: number | undefined;
      const step = () => {
        const p = Math.min(1, (Date.now() - t0) / duration);
        setProgress(p);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, 400);
    return () => window.clearTimeout(t);
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
      <TplCard
        title="Analytics that ship"
        icon={<BarChart3 className="h-3.5 w-3.5" />}
      />
      <div className="mt-4 flex h-16 items-end gap-1.5">
        {BAR_VALS.map((v, i) => (
          <div key={i} className="flex-1">
            <motion.div
              animate={{ height: `${v * progress}%` }}
              transition={{ duration: 0.1 }}
              className="rounded-t-sm bg-brand"
              style={{ height: 0 }}
            />
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between text-[10px]">
        <span className="text-ink-faint">Completion</span>
        <span className="font-semibold text-brand">
          {Math.round(67 * progress)}%
        </span>
      </div>
    </motion.div>
  );
};