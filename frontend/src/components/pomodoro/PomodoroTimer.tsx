import React from 'react';
import {
  usePomodoroStore,
  formatCountdown,
  modeLabel,
} from '../../store/pomodoroStore';
import { useCompletePomodoro } from '../../hooks/usePomodoro';

interface PomodoroTimerProps {
  /** Shown in the header: a compact pill with no controls. */
  compact?: boolean;
}

const tomatoClass =
  'inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white';

const TomatoIcon: React.FC = () => (
  <svg
    className="h-5 w-5"
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

const PlayIcon: React.FC = () => (
  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const PauseIcon: React.FC = () => (
  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
    <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
  </svg>
);

const StopIcon: React.FC = () => (
  <svg
    className="h-3.5 w-3.5"
    fill="none"
    stroke="currentColor"
    strokeWidth={2.5}
    strokeLinecap="round"
    viewBox="0 0 24 24"
  >
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

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

/**
 * Reads the shared Pomodoro state. Renders nothing when idle, so the header only
 * shows the timer while a session is actually in flight.
 */
const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ compact }) => {
  const sessionId = usePomodoroStore((state) => state.sessionId);
  const mode = usePomodoroStore((state) => state.mode);
  const remaining = usePomodoroStore((state) => state.remaining);
  const running = usePomodoroStore((state) => state.running);
  const soundEnabled = usePomodoroStore((state) => state.soundEnabled);
  const pause = usePomodoroStore((state) => state.pause);
  const resume = usePomodoroStore((state) => state.resume);
  const abandon = usePomodoroStore((state) => state.abandon);
  const toggleSound = usePomodoroStore((state) => state.toggleSound);
  const { mutate: logSession } = useCompletePomodoro();

  if (!sessionId) return null;

  const finished = remaining <= 0;

  return (
    <div
      className={`inline-flex max-w-full items-center gap-2 rounded-full border border-hairline bg-surface-2 ${
        compact ? 'px-2 py-1 sm:px-2.5' : 'px-3 py-2'
      }`}
      data-tour={compact ? 'pomodoro' : undefined}
      title={finished ? 'Session finished' : `${modeLabel(mode)} session in progress`}
    >
      <span className={tomatoClass.replace('h-10 w-10', compact ? 'h-6 w-6' : 'h-9 w-9')}>
        <TomatoIcon />
      </span>

      <span className="min-w-0 truncate tabular-nums text-xs font-semibold text-ink sm:text-sm">
        {formatCountdown(remaining)}
      </span>

      {!compact && (
        <span className="text-xs font-medium text-ink-muted">{modeLabel(mode)}</span>
      )}

      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={toggleSound}
          aria-label={soundEnabled ? 'Mute finish alarm' : 'Unmute finish alarm'}
          aria-pressed={soundEnabled}
          title={soundEnabled ? 'Mute alarm' : 'Unmute alarm'}
          className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-accent-strong"
        >
          {soundEnabled ? <SoundOnIcon /> : <SoundOffIcon />}
        </button>
        {finished ? (
          <button
            type="button"
            onClick={() => logSession(sessionId)}
            className="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-white"
          >
            Log it
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={running ? pause : resume}
              aria-label={running ? 'Pause' : 'Resume'}
              className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-accent-strong"
            >
              {running ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button
              type="button"
              onClick={abandon}
              aria-label="Discard session"
              className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface hover:text-red-500"
            >
              <StopIcon />
            </button>
          </>
        )}
      </span>
    </div>
  );
};

export default PomodoroTimer;