import React from 'react';
import { motion } from 'framer-motion';

interface Startup {
  name: string;
  initial: string;
}

const STARTUPS: Startup[] = [
  { name: 'Paystack', initial: 'P' },
  { name: 'Flutterwave', initial: 'F' },
  { name: 'Kuda', initial: 'K' },
  { name: 'Piggyvest', initial: 'P' },
  { name: 'Andela', initial: 'A' },
  { name: 'Mono', initial: 'M' },
  { name: 'Termii', initial: 'T' },
  { name: 'Cowrywise', initial: 'C' },
];

const Logo: React.FC<Startup> = ({ name, initial }) => (
  <div className="group flex shrink-0 items-center gap-2.5 opacity-55 transition-opacity duration-300 hover:opacity-100">
    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-raised text-[11px] font-semibold text-brand">
      {initial}
    </span>
    <span className="whitespace-nowrap text-[15px] font-medium tracking-tight text-ink-muted transition-colors group-hover:text-ink">
      {name}
    </span>
  </div>
);

/** Single-line marquee of "trusted by" logos. Pure decoration. */
const LogoStrip: React.FC = () => (
  <section className="relative border-y border-line-subtle bg-canvas py-10 lg:py-12">
    <div className="mx-auto max-w-7xl px-6">
      <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        Trusted by builders who <span className="text-brand">outgrew Trello</span>
      </p>

      <div
        className="relative overflow-hidden"
        style={{
          maskImage:
            'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <motion.div
          className="flex w-max"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 42, repeat: Infinity, ease: 'linear' }}
        >
          <div className="flex gap-14 pr-14">
            {STARTUPS.map((s) => (
              <Logo key={s.name} {...s} />
            ))}
          </div>
          <div className="flex gap-14 pr-14" aria-hidden="true">
            {STARTUPS.map((s) => (
              <Logo key={s.name + '-dup'} {...s} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default LogoStrip;