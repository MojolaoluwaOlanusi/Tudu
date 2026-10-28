import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import BrushButton from '../ui/BrushButton';

interface FinalCTAProps {
  onStartFree: () => void;
}

/** Closing CTA band. Wires into the same onStartFree handler as the Hero. */
const FinalCTA: React.FC<FinalCTAProps> = ({ onStartFree }) => (
  <section className="mx-auto max-w-3xl px-6 py-24 text-center lg:py-32">
    <motion.h2
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6 }}
      className="text-balance text-4xl font-semibold leading-tight text-ink sm:text-5xl"
    >
      Your board should work as fast as you do.
    </motion.h2>
    <motion.p
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay: 0.1 }}
      className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink-muted"
    >
      Open source, self-hostable, and free forever for personal use.
    </motion.p>
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-100px' }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="mt-8"
    >
      <BrushButton onClick={onStartFree} className="h-12 px-6 text-base">
        Start for free — takes 30 seconds
        <ArrowRight className="ml-1 h-4 w-4" />
      </BrushButton>
    </motion.div>
    <motion.p
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="mt-4 text-xs text-ink-faint"
    >
      No credit card required.
    </motion.p>
  </section>
);

export default FinalCTA;