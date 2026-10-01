import React from 'react';
import { useStartPomodoro } from '../../hooks/usePomodoro';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { FOCUS_MINUTES } from '../../types/pomodoro';

interface StartPomodoroButtonProps {
  taskId: string;
  /** Shown when another session is already running. */
  onBusy?: () => void;
}

const TomatoIcon: React.FC<{ className?: string }> = ({ className = 'h-3.5 w-3.5' }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    strokeWidth={1.8}
    strokeLinecap="round"
    strokeLinejoin="round"
    viewBox="0 0 24 24"
  >
    <circle cx="12" cy="13" r="7" />
    <path d="M12 6c0-1.5 1-2.5 2.5-2.5" />
  </svg>
);

/**
 * Starts a focus session against one task.
 *
 * Only one session can be in flight at a time, so the button explains that
 * rather than silently replacing a running timer.
 */
const StartPomodoroButton: React.FC<StartPomodoroButtonProps> = ({
  taskId,
  onBusy,
}) => {
  const { mutate: start, isPending } = useStartPomodoro();
  const activeSessionId = usePomodoroStore((state) => state.sessionId);
  const running = usePomodoroStore((state) => state.running);

  const busy = activeSessionId !== null;

  if (busy) {
    return (
      <button
        type="button"
        onClick={onBusy}
        className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-strong"
      >
        <TomatoIcon />
        {running ? 'Session in progress' : 'Session paused'}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => start({ taskId, duration: FOCUS_MINUTES })}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-strong disabled:opacity-50"
    >
      <TomatoIcon />
      {isPending ? 'Starting...' : `Start ${FOCUS_MINUTES}m`}
    </button>
  );
};

export default StartPomodoroButton;