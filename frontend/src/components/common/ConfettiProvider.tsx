import React, {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from 'react';
import confetti from 'canvas-confetti';
import { useNotificationPreferences } from '../../hooks/useNotifications';

/** The names the celebrate() method understands. Mirrors useMilestones. */
export type CelebrationName =
  | 'task-complete'
  | 'ten-tasks'
  | 'hundred-tasks'
  | 'first-teammate'
  | 'board-cleared';

interface ConfettiContextValue {
  /** The original single-shot burst. Kept for existing callers. */
  burst: () => void;
  /** A themed burst for a milestone; larger and layered for the big ones. */
  celebrate: (name: CelebrationName) => void;
}

const ConfettiContext = createContext<ConfettiContextValue | null>(null);

/**
 * Respect the OS "reduce motion" setting.
 *
 * `prefers-reduced-motion: reduce` is a user preference, not a courtesy:
 * ignoring it can be actively uncomfortable for people with vestibular
 * disorders. When it is set, every confetti call becomes a no-op.
 */
const prefersReducedMotion = (): boolean => {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/**
 * Particle counts per milestone. Small for routine wins, larger for the
 * ones that should feel like an event. Keeping them as constants makes
 * the whole intensity scale adjustable from one place.
 */
const PARTICLE_COUNT = {
  routine: 80,
  milestone: 140,
  big: 200,
} as const;

export const ConfettiProvider = ({ children }: { children: ReactNode }) => {
  const { data: prefs } = useNotificationPreferences();
  // Default to on when the preference has not loaded yet, so the first
  // task completion on a fresh account still celebrates.
  const enabled = prefs?.celebrations ?? true;

  const burst = useCallback(() => {
    if (!enabled || prefersReducedMotion()) return;
    confetti({
      particleCount: PARTICLE_COUNT.routine,
      spread: 70,
      origin: { y: 0.6 },
    });
  }, [enabled]);

  const celebrate = useCallback(
    (name: CelebrationName) => {
      if (!enabled || prefersReducedMotion()) return;
      switch (name) {
        case 'task-complete':
          burst();
          return;
        case 'ten-tasks':
        case 'first-teammate':
          confetti({
            particleCount: PARTICLE_COUNT.milestone,
            spread: 90,
            origin: { y: 0.65 },
          });
          return;
        case 'hundred-tasks':
        case 'board-cleared':
          // Two bursts, right and left, after a beat. Reads as a small
          // event rather than a single pop.
          confetti({
            particleCount: PARTICLE_COUNT.big,
            spread: 100,
            origin: { y: 0.6 },
          });
          window.setTimeout(() => {
            confetti({
              particleCount: PARTICLE_COUNT.big,
              angle: 60,
              spread: 55,
              origin: { x: 0 },
            });
            confetti({
              particleCount: PARTICLE_COUNT.big,
              angle: 120,
              spread: 55,
              origin: { x: 1 },
            });
          }, 200);
          return;
      }
    },
    [burst, enabled]
  );

  return (
    <ConfettiContext.Provider value={{ burst, celebrate }}>
      {children}
    </ConfettiContext.Provider>
  );
};

export const useConfetti = (): ConfettiContextValue => {
  const ctx = useContext(ConfettiContext);
  // A missing provider is a no-op, not an error. A component that calls
  // useConfetti outside the provider simply never celebrates; the tree
  // stays mounted and one missing wrapper does not blank the page.
  if (!ctx) return { burst: () => {}, celebrate: () => {} };
  return ctx;
};
