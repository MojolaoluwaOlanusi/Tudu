import React from 'react';
import { useOnboardingStore } from '../../store/onboardingStore';
import { usePomodoroStore } from '../../store/pomodoroStore';

/**
 * Always-available entry point to the tour.
 *
 * The welcome prompt can be snoozed or declined, so there has to be a way back
 * in later - otherwise opting out would be permanent with no escape hatch.
 *
 * Hidden when a pomodoro timer is active to keep the header clean during focus sessions.
 */
const TourButton: React.FC = () => {
  const startTour = useOnboardingStore((state) => state.startTour);
  const isTourOpen = useOnboardingStore((state) => state.isTourOpen);
  const pomodoroSessionId = usePomodoroStore((state) => state.sessionId);

  // Hide during active pomodoro sessions
  if (isTourOpen || pomodoroSessionId) return null;

  return (
    <button
      type="button"
      onClick={startTour}
      title="Take the tour"
      aria-label="Take the tour"
      data-testid="tour-button"
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-hairline bg-surface text-ink shadow-sm transition-all duration-200 hover:text-accent-strong hover:shadow-md"
    >
      <span aria-hidden="true" className="text-base font-bold leading-none">
        ?
      </span>
    </button>
  );
};

export default TourButton;
