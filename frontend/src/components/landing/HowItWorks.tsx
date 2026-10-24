import React, { useEffect, useRef, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from 'framer-motion';
import {
  CaptureDemo,
  OrganizeDemo,
  FocusDemo,
  ShipDemo,
} from './howitworks/StepDemos';

interface StepDef {
  id: string;
  short: string;
  title: string;
  body: string;
  Component: React.FC;
}

const STEPS: StepDef[] = [
  {
    id: 'capture',
    short: 'Capture',
    title: 'Capture in seconds',
    body:
      "Type it like you'd say it. Tudu parses the date, the category, and the priority from plain language — auto-creating a task with everything already filled in.",
    Component: CaptureDemo,
  },
  {
    id: 'organize',
    short: 'Organize',
    title: 'Organize with flow',
    body:
      'Drag with @dnd-kit. Multi-select and bulk-move without a modal. Every change broadcasts to every open tab over sockets.',
    Component: OrganizeDemo,
  },
  {
    id: 'focus',
    short: 'Focus',
    title: 'Stay in focus',
    body:
      'Pomodoro sessions and time logs roll up into your stats automatically. No separate timer app, no manual entry, no double counting.',
    Component: FocusDemo,
  },
  {
    id: 'ship',
    short: 'Ship & measure',
    title: 'Ship & measure',
    body:
      'Analytics animate from 0 → 100% completion. See what shipped, what’s stuck, and what’s overdue — at a glance.',
    Component: ShipDemo,
  },
];

const useIsDesktop = (): boolean => {
  const [desktop, setDesktop] = useState<boolean>(
    typeof window !== 'undefined' &&
      window.matchMedia('(min-width: 1024px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const handler = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return desktop;
};

interface StepIndicatorProps {
  step: StepDef;
  current: StepDef;
  onClick: () => void;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ step, current, onClick }) => {
  const active = step.id === current.id;
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 text-left transition-opacity hover:opacity-100"
      style={{ opacity: active ? 1 : 0.55 }}
    >
      <span
        className={
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ' +
          (active
            ? 'bg-brand text-ink-inverse'
            : 'border border-line text-ink-faint')
        }
      >
        {STEPS.indexOf(step) + 1}
      </span>
      <span
        className={
          'text-[13px] ' +
          (active ? 'font-medium text-ink' : 'text-ink-muted')
        }
      >
        {step.short}
      </span>
    </button>
  );
};

const DesktopHowItWorks: React.FC = () => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const s = Math.min(
      STEPS.length - 1,
      Math.max(0, Math.floor(v * STEPS.length)),
    );
    if (s !== stepRef.current) {
      stepRef.current = s;
      setStep(s);
    }
  });

  const scrollToStep = (i: number) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const target =
      top + (i / STEPS.length) * trackRef.current.clientHeight + 60;
    window.scrollTo({ top: target, behavior: 'smooth' });
  };

  const Current = STEPS[step];
  const CurrentComponent = Current.Component;

  return (
    <div ref={trackRef} className="relative" style={{ height: '400vh' }}>
      <div className="sticky top-0 flex h-screen items-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-7xl grid-cols-2 gap-16 px-6">
          <div className="flex flex-col justify-center">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
              How it works
            </p>
            <AnimatePresence mode="wait">
              <motion.div
                key={Current.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
              >
                <h2 className="text-balance text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                  {Current.title}
                </h2>
                <p className="mt-4 max-w-md text-base leading-relaxed text-ink-muted">
                  {Current.body}
                </p>
              </motion.div>
            </AnimatePresence>

            <ol className="mt-10 flex flex-col gap-3">
              {STEPS.map((s, i) => (
                <li key={s.id}>
                  <StepIndicator
                    step={s}
                    current={Current}
                    onClick={() => scrollToStep(i)}
                  />
                </li>
              ))}
            </ol>
          </div>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-md">
              <AnimatePresence mode="wait">
                <motion.div
                  key={Current.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35, ease: [0.2, 0, 0, 1] }}
                >
                  <CurrentComponent />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MobileHowItWorks: React.FC = () => (
  <div className="mx-auto max-w-3xl px-6 py-16">
    <div className="mb-10">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        How it works
      </p>
      <h2 className="text-balance text-3xl font-semibold leading-tight text-ink">
        Four steps from idea to shipped
      </h2>
    </div>

    <div className="space-y-12">
      {STEPS.map((s, i) => {
        const C = s.Component;
        return (
          <motion.div
            key={s.id}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
          >
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand text-[10px] font-semibold text-ink-inverse">
                {i + 1}
              </span>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                {s.short}
              </p>
            </div>
            <h3 className="text-2xl font-semibold text-ink">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted">{s.body}</p>
            <div className="mt-5">
              <C />
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
);

const HowItWorks: React.FC = () => {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopHowItWorks /> : <MobileHowItWorks />;
};

export default HowItWorks;