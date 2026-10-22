import React from 'react';
import { useActiveTimer, useStartTimer, useStopTimer } from '../../hooks/useTime';
import { useUiStore } from '../../store/uiStore';

interface Props {
  taskId: string;
  taskTitle: string;
}

/** Start/stop button for the timer, sitting next to StartPomodoroButton. */
const StartTimerButton: React.FC<Props> = ({ taskId, taskTitle }) => {
  const { data: active } = useActiveTimer();
  const start = useStartTimer();
  const stop = useStopTimer();
  const pushToast = useUiStore((s) => s.pushToast);

  const running = active?.task_id === taskId;
  const otherRunning = !!active && !running;

  const handleStart = () => {
    start.mutate(
      { taskId, description: null, billable: false },
      {
        onSuccess: () => pushToast(`Timer started: ${taskTitle}`, 'success'),
        onError: (err) => {
          const detail = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
          pushToast(detail || 'Could not start the timer', 'error');
        },
      }
    );
  };

  const handleStop = () => {
    stop.mutate(undefined, {
      onSuccess: () => pushToast('Timer stopped', 'success'),
      onError: () => pushToast('Could not stop the timer', 'error'),
    });
  };

  if (running) {
    return (
      <button
        type="button"
        onClick={handleStop}
        disabled={stop.isPending}
        className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent-strong transition-colors hover:bg-accent/20 disabled:opacity-50"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <rect x="6" y="6" width="12" height="12" rx="1" />
        </svg>
        Stop timer
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleStart}
      disabled={start.isPending || otherRunning}
      title={otherRunning ? 'A timer is already running on another task' : 'Start tracking time'}
      className="inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface-2 px-2.5 py-1.5 text-xs font-medium text-ink-muted transition-colors hover:border-accent hover:text-accent-strong disabled:opacity-50"
    >
      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      {otherRunning ? 'Timer busy' : 'Start timer'}
    </button>
  );
};

export default StartTimerButton;
