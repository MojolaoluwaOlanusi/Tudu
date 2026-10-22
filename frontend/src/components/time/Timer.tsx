import React, { useEffect, useState } from 'react';
import { useActiveTimer, useStopTimer, formatElapsed } from '../../hooks/useTime';
import { useUiStore } from '../../store/uiStore';

/**
 * Compact pill in the header that shows the current running timer.
 * Renders nothing when idle, matching PomodoroTimerHeader.
 */
const Timer: React.FC = () => {
  const { data: active } = useActiveTimer();
  const stop = useStopTimer();
  const pushToast = useUiStore((s) => s.pushToast);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [active]);

  if (!active) return null;

  const startedMs = new Date(active.started_at).getTime();
  const elapsed = Math.max(0, Math.floor((now - startedMs) / 1000));

  const handleStop = () => {
    stop.mutate(undefined, {
      onSuccess: () => pushToast('Timer stopped', 'success'),
      onError: () => pushToast('Could not stop the timer', 'error'),
    });
  };

  return (
    <div
      className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-2.5 py-1"
      title={active.task_title ?? 'Time tracking'}
    >
      <svg
        className="h-3.5 w-3.5 text-accent-strong"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span className="tabular-nums text-xs font-semibold text-ink">
        {formatElapsed(elapsed)}
      </span>
      <button
        type="button"
        onClick={handleStop}
        disabled={stop.isPending}
        aria-label="Stop timer"
        className="rounded-full p-1 text-ink-muted transition-colors hover:bg-surface hover:text-red-500"
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>
  );
};

export default Timer;
