import React from 'react';
import { HelpCircle } from 'lucide-react';
import { useOnboardingStore } from '../../store/onboardingStore';
import { usePomodoroStore } from '../../store/pomodoroStore';

/**
 * Always-available entry point to the tour.
 *
 * Styled as a normal header icon (h-8 w-8, rounded-md) to match the mockup's
 * HelpCircle icon button. Hidden when a pomodoro session is active to keep
 * the header clean during focus sessions.
 */
const TourButton: React.FC = () => {
  const startTour = useOnboardingStore((state) => state.startTour);
  const isTourOpen = useOnboardingStore((state) => state.isTourOpen);
  const pomodoroSessionId = usePomodoroStore((state) => state.sessionId);

  if (isTourOpen || pomodoroSessionId) return null;

  return (
    <button
      type="button"
      onClick={startTour}
      title="Take the tour"
      aria-label="Take the tour"
      data-testid="tour-button"
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-ink-muted transition-colors hover:bg-subtle hover:text-ink"
    >
      <HelpCircle className="h-4 w-4" />
    </button>
  );
};

export default TourButton;
