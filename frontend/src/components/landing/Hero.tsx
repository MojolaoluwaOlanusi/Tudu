import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play } from 'lucide-react';
import BrushButton from '../ui/BrushButton';
import LiveBoardHero from './LiveBoardHero';

interface HeroProps {
  onTryDemo: () => void;
  onStartFree: () => void;
  starting?: boolean;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      delay: i * 0.1,
      ease: [0.2, 0, 0, 1] as [number, number, number, number],
    },
  }),
};

/**
 * Landing hero. Uses the mockup's exact copy and visual treatment.
 *
 * CTA behaviour is unchanged from the pre-Step-8 landing:
 *   - "Start for free" (primary) -> onStartFree -> navigate('/login')
 *   - "See live demo"  (secondary) -> onTryDemo -> creates a real demo
 *     account via publicService.startDemo() and lands the visitor on
 *     /board with a seeded board. NOT a static /demo preview page.
 *
 * LiveBoardHero now renders inline (id="hero-board") like the mockup,
 * instead of in a sibling block inside Landing.tsx.
 *
 * `prefers-reduced-motion` skips the entrance animation so the copy is
 * immediately readable.
 */
const Hero: React.FC<HeroProps> = ({ onTryDemo, onStartFree, starting = false }) => {
  const prefersReduced = useReducedMotion();
  const initial = prefersReduced ? false : 'hidden';

  return (
    <section className="relative mx-auto max-w-7xl px-6 pt-16 pb-12 lg:pt-24 lg:pb-16">
      <div className="grid grid-cols-12 gap-x-6 gap-y-8">
        <motion.h1
          initial={initial}
          animate="show"
          variants={fadeUp}
          custom={0}
          className="col-span-12 text-balance text-4xl font-semibold leading-[1.05] tracking-tight text-ink sm:text-5xl lg:col-span-9 lg:text-6xl"
        >
          Where simple boards become{' '}
          <span className="relative inline-block text-ink">
            serious work
            <svg
              aria-hidden="true"
              viewBox="0 0 200 12"
              className="absolute -bottom-1 left-0 h-2.5 w-full text-brand"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              preserveAspectRatio="none"
            >
              <path d="M2 8 Q 50 2, 100 6 T 198 4" />
            </svg>
          </span>
          .
        </motion.h1>

        <motion.p
          initial={initial}
          animate="show"
          variants={fadeUp}
          custom={1}
          className="col-span-12 max-w-2xl text-base leading-relaxed text-ink-muted lg:col-span-7"
        >
          Tudu is the fast, offline-capable Kanban for teams tired of Trello&apos;s limits
          and Jira&apos;s chaos. Free for personal use, scales when you do.
        </motion.p>

        <motion.div
          initial={initial}
          animate="show"
          variants={fadeUp}
          custom={2}
          className="col-span-12 flex flex-wrap gap-3 lg:col-span-5 lg:justify-end"
        >
          <BrushButton
            onClick={onStartFree}
            size="md"
            className="h-10 px-5"
          >
            Start for free
            <ArrowRight className="ml-1 h-4 w-4" />
          </BrushButton>
          <button
            type="button"
            onClick={onTryDemo}
            disabled={starting}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line px-5 text-sm font-medium text-ink transition-colors hover:bg-subtle disabled:opacity-60"
          >
            <Play className="h-4 w-4" />
            {starting ? 'Setting up your board…' : 'See live demo'}
          </button>
        </motion.div>
      </div>

      <motion.div
        initial={prefersReduced ? false : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: [0.2, 0, 0, 1] }}
        className="mt-12 lg:mt-16"
      >
        <div id="hero-board">
          <LiveBoardHero />
        </div>
      </motion.div>
    </section>
  );
};

export default Hero;