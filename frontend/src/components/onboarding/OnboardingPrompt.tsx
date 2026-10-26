import React, { useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useOnboardingStore } from '../../store/onboardingStore';

const buttonRow = 'flex flex-wrap items-center gap-2';

/**
 * The "would you like a tour?" prompt shown to new accounts.
 *
 * Step 11 polish: the emoji badge uses `bg-brand/15` (brand tint) instead
 * of the older `bg-accent-soft`, the "Don't show again" link is quieter,
 * and the helper line at the bottom reads at `text-ink-faint`.
 *
 * Behaviour unchanged: three ways out are still
 *   - "Show me around" → startTour
 *   - "Maybe later" / backdrop → snoozePrompt (7-day snooze)
 *   - "Don't show again" → optOut (permanent)
 * The `data-testid="onboarding-prompt"` contract is preserved.
 */
const OnboardingPrompt: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const startTour = useOnboardingStore((state) => state.startTour);
  const snoozePrompt = useOnboardingStore((state) => state.snoozePrompt);
  const optOut = useOnboardingStore((state) => state.optOut);
  const cardRef = useRef<HTMLDivElement>(null);

  const firstName = user?.name?.trim().split(/\s+/)[0];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') snoozePrompt();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [snoozePrompt]);

  return (
    <div
      className="scrim fixed inset-0 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-prompt-title"
      data-testid="onboarding-prompt"
      onClick={snoozePrompt}
    >
      <div
        ref={cardRef}
        onClick={(event) => event.stopPropagation()}
        className="animate-pop-in w-full max-w-md rounded-2xl border border-hairline bg-surface p-6 text-center shadow-xl sm:p-7"
      >
        <div
          aria-hidden="true"
          className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand/15 text-3xl"
        >
          👋
        </div>

        <h2
          id="onboarding-prompt-title"
          className="font-handwritten text-3xl leading-tight text-ink"
        >
          {firstName ? `Welcome to Tudu, ${firstName}!` : 'Welcome to Tudu!'}
        </h2>

        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-muted">
          We&apos;ve put a short guided tour together to show you around — every
          feature, in a couple of minutes.
        </p>

        <div className={`mt-6 ${buttonRow} justify-center`}>
          <button
            type="button"
            onClick={startTour}
            autoFocus
            className="btn-accent brush-stroke"
            data-testid="onboarding-start"
          >
            Show me around
          </button>
          <button type="button" onClick={snoozePrompt} className="btn-ghost">
            Maybe later
          </button>
        </div>

        <button
          type="button"
          onClick={optOut}
          className="mt-4 text-[11px] font-medium text-ink-faint underline-offset-2 transition-colors hover:text-ink hover:underline"
        >
          Don&apos;t show again
        </button>

        <p className="mt-3 text-[11px] text-ink-faint">
          No rush — we&apos;ll offer the tour again in a week if you tap away.
        </p>
      </div>
    </div>
  );
};

export default OnboardingPrompt;