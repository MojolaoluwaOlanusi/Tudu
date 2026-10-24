import React from 'react';
import { Link } from 'react-router-dom';
import Wordmark from '../common/Wordmark';
import BrushButton from '../ui/BrushButton';

interface ComingSoonProps {
  title?: string;
}

/**
 * Friendly placeholder for the marketing routes the mockup links to but the
 * live app does not yet implement. Registered in App.tsx so a click from the
 * new landing navbar lands on a real page instead of the catch-all redirect.
 *
 * This is a stub, not a ship — the copy is deliberately honest about that.
 */
const ComingSoon: React.FC<ComingSoonProps> = ({ title = 'Coming soon' }) => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-canvas px-6 text-center">
    <Wordmark size="md" className="mb-8" />
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
      Not quite there yet
    </p>
    <h1 className="mt-3 text-balance text-3xl font-semibold text-ink sm:text-4xl">
      {title}
    </h1>
    <p className="mt-3 max-w-md text-sm leading-relaxed text-ink-muted">
      This page is in the mockup but has not been ported to the live app yet.
      The working app is where the value is — everything else is roadmap.
    </p>
    <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
      <Link to="/">
        <BrushButton size="md">Back to home</BrushButton>
      </Link>
    </div>
  </div>
);

export default ComingSoon;