import React from 'react';
import { motion } from 'framer-motion';

interface Tool {
  name: string;
  initial: string;
}

// Previously this strip showed logos of eight real Nigerian startups
// (Paystack, Flutterwave, Kuda, Piggyvest, Andela, Mono, Termii,
// Cowrywise) under the caption "Trusted by builders who outgrew Trello",
// implying all eight use Tudu. None of them do. Replaced with the actual
// stack, verifiable from package.json.
const STACK: Tool[] = [
  { name: 'PostgreSQL', initial: 'PG' },
  { name: 'React', initial: 'R' },
  { name: 'TypeScript', initial: 'TS' },
  { name: 'Vite', initial: 'V' },
  { name: 'Tailwind', initial: 'TW' },
  { name: 'Socket.IO', initial: 'IO' },
  { name: 'Express', initial: 'E' },
  { name: 'Chart.js', initial: 'C' },
];

const ToolBadge: React.FC<Tool> = ({ name, initial }) => (
  <div className="group flex shrink-0 items-center gap-2.5 opacity-55 transition-opacity duration-300 hover:opacity-100">
    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-line bg-raised text-[11px] font-semibold text-brand">
      {initial}
    </span>
    <span className="whitespace-nowrap text-[15px] font-medium tracking-tight text-ink-muted transition-colors group-hover:text-ink">
      {name}
    </span>
  </div>
);

const LogoStrip: React.FC = () => (
  <section className="relative border-y border-line-subtle bg-canvas py-10 lg:py-12">
    <div className="mx-auto max-w-7xl px-6">
      <p className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
        Built with the same tools you use
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
            {STACK.map((t) => (
              <ToolBadge key={t.name} {...t} />
            ))}
          </div>
          <div className="flex gap-14 pr-14" aria-hidden="true">
            {STACK.map((t) => (
              <ToolBadge key={t.name + '-dup'} {...t} />
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  </section>
);

export default LogoStrip;