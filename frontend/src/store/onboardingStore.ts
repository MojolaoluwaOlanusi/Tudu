import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Where the user stands with the onboarding tour.
 *
 * - `unseen`    - never prompted; the welcome modal is offered.
 * - `snoozed`   - they tapped outside or bailed early; offer it again in a week.
 * - `completed` - they finished the whole tour; stop offering it.
 * - `opted-out` - they explicitly asked to never see it again.
 */
export type OnboardingStatus = 'unseen' | 'snoozed' | 'completed' | 'opted-out';

/** How long a dismissed prompt stays hidden before we ask again. */
export const SNOOZE_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

interface OnboardingState {
  status: OnboardingStatus;
  /** When the prompt was last dismissed, used for the week-long snooze. */
  snoozedAt: number | null;
  /** True while the spotlight tour is running. */
  isTourOpen: boolean;

  /** Start the tour (from the welcome modal or the "Take a tour" button). */
  startTour: () => void;
  /** Tapping outside the welcome modal, or leaving the tour early. Ask again in a week. */
  snoozePrompt: () => void;
  /** "Don't show again" - never offer the prompt again. */
  optOut: () => void;
  /** Reached the final step. */
  completeTour: () => void;
  /** Close the tour without finishing it. */
  endTour: () => void;
  /** Wipe progress so the tour can be replayed from the header. */
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      status: 'unseen',
      snoozedAt: null,
      isTourOpen: false,

      startTour: () => set({ isTourOpen: true }),
      snoozePrompt: () => set({ status: 'snoozed', snoozedAt: Date.now(), isTourOpen: false }),
      optOut: () => set({ status: 'opted-out', isTourOpen: false }),
      completeTour: () => set({ status: 'completed', isTourOpen: false }),
      endTour: () => set({ status: 'snoozed', snoozedAt: Date.now(), isTourOpen: false }),
      reset: () => set({ status: 'unseen', snoozedAt: null, isTourOpen: false }),
    }),
    {
      name: 'onboarding-storage',
      // `isTourOpen` is deliberately not persisted: a refresh mid-tour should
      // drop back to the welcome prompt, not re-enter the tour from nowhere.
      partialize: (state) => ({
        status: state.status,
        snoozedAt: state.snoozedAt,
        isTourOpen: false,
      }),
    }
  )
);

/**
 * Whether the welcome modal should be offered right now.
 *
 * Exported as a plain function so the rule is testable without mounting React.
 */
export const shouldOfferOnboarding = (
  state: Pick<OnboardingState, 'status' | 'snoozedAt' | 'isTourOpen'>,
  now: number = Date.now()
): boolean => {
  if (state.isTourOpen) return false;
  if (state.status === 'unseen') return true;
  if (state.status === 'snoozed') {
    // A missing timestamp means we cannot prove a week has passed, so stay quiet
    // rather than nagging someone on every page load.
    if (state.snoozedAt === null) return false;
    return now - state.snoozedAt >= SNOOZE_DURATION_MS;
  }
  return false;
};
