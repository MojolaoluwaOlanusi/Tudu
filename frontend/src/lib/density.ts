/**
 * Density — compact vs comfortable layout.
 *
 * Mirrors the mockup's `src/lib/density.js`. The CSS contract lives in
 * `frontend/src/styles/density.css`: every rule is gated behind both
 * `[data-density="compact"]` and `[data-app-shell]`, so the attribute is set
 * on <html> and the shell opts in automatically.
 */
const DENSITY_KEY = 'tudu-density';

export type Density = 'comfortable' | 'compact';

export function getDensity(): Density {
  if (typeof window === 'undefined') return 'comfortable';
  try {
    return localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'comfortable';
  } catch {
    return 'comfortable';
  }
}

export function applyDensity(density: Density): void {
  if (typeof document === 'undefined') return;
  const d: Density = density === 'compact' ? 'compact' : 'comfortable';
  document.documentElement.setAttribute('data-density', d);
  try {
    localStorage.setItem(DENSITY_KEY, d);
  } catch {
    /* quota or private mode — cosmetic */
  }
}

export function toggleDensity(): Density {
  const next: Density = getDensity() === 'compact' ? 'comfortable' : 'compact';
  applyDensity(next);
  return next;
}
