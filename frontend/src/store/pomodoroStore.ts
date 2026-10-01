import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PomodoroMode, FOCUS_MINUTES, BREAK_MINUTES } from '../types/pomodoro';

/**
 * The running Pomodoro.
 *
 * Persisted so a page refresh (or a navigation) does not lose the session - and
 * so the header can show the timer on every screen. Only `PomodoroRunner` ever
 * ticks this store, so there is exactly one countdown for the whole app.
 */
interface PomodoroStore {
  /** Backend row for the in-flight session, or null when idle. */
  sessionId: string | null;
  taskId: string | null;
  taskTitle: string | null;
  mode: PomodoroMode;
  durationMinutes: number;
  /** Seconds left on the clock. */
  remaining: number;
  running: boolean;
  /** Set the moment the countdown reaches zero, so it is logged exactly once. */
  justFinished: boolean;

  begin: (params: {
    sessionId: string;
    taskId: string | null;
    taskTitle: string | null;
    mode: PomodoroMode;
    durationMinutes: number;
  }) => void;
  pause: () => void;
  resume: () => void;
  /** Abandon the current session (the backend row stays uncompleted). */
  abandon: () => void;
  tick: () => void;
  clearFinished: () => void;
}

export const usePomodoroStore = create<PomodoroStore>()(
  persist(
    (set) => ({
      sessionId: null,
      taskId: null,
      taskTitle: null,
      mode: 'focus',
      durationMinutes: FOCUS_MINUTES,
      remaining: FOCUS_MINUTES * 60,
      running: false,
      justFinished: false,

      begin: ({ sessionId, taskId, taskTitle, mode, durationMinutes }) =>
        set({
          sessionId,
          taskId,
          taskTitle,
          mode,
          durationMinutes,
          remaining: durationMinutes * 60,
          running: true,
          justFinished: false,
        }),

      pause: () => set({ running: false }),
      resume: () => set({ running: true }),

      abandon: () =>
        set({
          sessionId: null,
          taskId: null,
          taskTitle: null,
          running: false,
          justFinished: false,
          remaining: FOCUS_MINUTES * 60,
        }),

      tick: () =>
        set((state) => {
          if (!state.running || state.remaining <= 0) return state;
          const remaining = state.remaining - 1;
          return remaining <= 0
            ? { remaining: 0, running: false, justFinished: true }
            : { remaining };
        }),

      clearFinished: () => set({ justFinished: false }),
    }),
    {
      name: 'pomodoro-storage',
      partialize: (state) => ({
        sessionId: state.sessionId,
        taskId: state.taskId,
        taskTitle: state.taskTitle,
        mode: state.mode,
        durationMinutes: state.durationMinutes,
        remaining: state.remaining,
        running: state.running,
        justFinished: state.justFinished,
      }),
    }
  )
);

/** Seconds left, formatted as mm:ss. */
export const formatCountdown = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
};

export const modeLabel = (mode: PomodoroMode): string =>
  mode === 'break' ? 'Break' : 'Focus';

export { BREAK_MINUTES, FOCUS_MINUTES };