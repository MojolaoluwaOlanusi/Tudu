import React from 'react';
import { usePomodoroStore, formatCountdown } from '../../store/pomodoroStore';

/**
 * A minimal timer display for the header that shows only the time and sound toggle.
 * All control buttons (play/pause/stop) are hidden and only available on the task card.
 */
const PomodoroTimerHeader: React.FC = () => {
  const sessionId = usePomodoroStore((state) => state.sessionId);
  const remaining = usePomodoroStore((state) => state.remaining);
  const soundEnabled = usePomodoroStore((state) => state.soundEnabled);
  const toggleSound = usePomodoroStore((state) => state.toggleSound);

  if (!sessionId) return null;

  const SoundOnIcon: React.FC = () => (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a8.5 8.5 0 0 1 0 12" />
    </svg>
  );

  const SoundOffIcon: React.FC = () => (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      viewBox="0 0 24 24"
    >
      <path d="M11 5 6 9H3v6h3l5 4V5z" />
      <path d="M16 9.5l5 5M21 9.5l-5 5" />
    </svg>
  );

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-hairline bg-surface-2 px-2.5 py-1 sm:px-3">
      <span className="tabular-nums text-xs font-semibold text-ink">
        {formatCountdown(remaining)}
      </span>
      <button
        type="button"
        onClick={toggleSound}
        aria-label={soundEnabled ? 'Mute finish alarm' : 'Unmute finish alarm'}
        aria-pressed={soundEnabled}
        title={soundEnabled ? 'Mute alarm' : 'Unmute alarm'}
        className="rounded-full p-1 text-ink-muted transition-colors hover:text-accent-strong"
      >
        {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
      </button>
    </div>
  );
};

export default PomodoroTimerHeader;
