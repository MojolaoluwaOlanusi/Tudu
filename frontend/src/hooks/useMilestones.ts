import { useCallback } from 'react';

/** The set of milestones we celebrate. String-literal names so a typo
 *  in a caller is a TypeScript error rather than a silent miss. */
export type MilestoneName =
  | 'first-task-completed'
  | 'ten-tasks-completed'
  | 'hundred-tasks-completed'
  | 'first-teammate-invited'
  | 'board-cleared';

const STORAGE_PREFIX = 'tudu.milestone.';

/**
 * Milestones live in localStorage rather than the database.
 *
 * Two reasons: they are cosmetic, and the database would need a row per
 * user per milestone plus an endpoint to read them back on every load.
 * A per-device flag is enough - if the user completes their hundredth
 * task on a new laptop, one extra round of fanfare is fine.
 */
const isCelebrated = (name: MilestoneName): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + name) === '1';
  } catch {
    // Private mode or SSR: treat as not yet celebrated, but do not crash.
    return true;
  }
};

const markCelebrated = (name: MilestoneName): void => {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + name, '1');
  } catch {
    // Swallow: a lost milestone flag is a cosmetic miss, not a bug.
  }
};

/**
 * The two functions a caller needs. Both are stable across renders, so
 * they can go straight into a useEffect dependency list.
 *
 * `shouldCelebrate(name)` returns true the first time, false ever after.
 * `consume(name)` records the flag; call it only after the animation has
 * actually fired, so a mid-transition reload does not lose the chance.
 */
export const useMilestones = () => {
  const shouldCelebrate = useCallback(
    (name: MilestoneName): boolean => !isCelebrated(name),
    []
  );

  const consume = useCallback((name: MilestoneName): void => {
    markCelebrated(name);
  }, []);

  return { shouldCelebrate, consume };
};
