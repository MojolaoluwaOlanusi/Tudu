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
  /**
   * Epoch ms at which the running countdown reaches zero, or null while idle or
   * paused. Ticks derive `remaining` from this and `Date.now()`, so a throttled
   * (or suspended) background tab still catches up - and finishes - on the
   * right wall clock instead of falling behind one second per missed tick.
   */
  endsAt: number | null;
  /** Whether the finish alarm plays (toggle on the timer pill). */
  soundEnabled: boolean;
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
  toggleSound: () => void;
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
      endsAt: null,
      soundEnabled: true,
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
          endsAt: Date.now() + durationMinutes * 60_000,
          justFinished: false,
        }),

      pause: () =>
        set((state) => {
          if (!state.running) return state;
          const remaining =
            state.endsAt === null
              ? state.remaining
              : Math.max(0, Math.ceil((state.endsAt - Date.now()) / 1000));
          // Pausing on the exact final second still counts as finishing.
          return remaining <= 0
            ? { remaining: 0, running: false, endsAt: null, justFinished: true }
            : { running: false, remaining, endsAt: null };
        }),

      resume: () =>
        set((state) => {
          if (state.running || state.remaining <= 0) return state;
          return { running: true, endsAt: Date.now() + state.remaining * 1000 };
        }),

      abandon: () =>
        set({
          sessionId: null,
          taskId: null,
          taskTitle: null,
          running: false,
          endsAt: null,
          justFinished: false,
          remaining: FOCUS_MINUTES * 60,
        }),

      toggleSound: () => set((state) => ({ soundEnabled: !state.soundEnabled })),

      tick: () =>
        set((state) => {
          if (!state.running) return state;
          if (state.endsAt === null) {
            // A session persisted before the wall-clock fix has no end
            // timestamp; anchor one now and from here on ticks are drift-free.
            if (state.remaining <= 0) {
              return { running: false, justFinished: true };
            }
            return { endsAt: Date.now() + state.remaining * 1000 };
          }
          // Derive from the wall clock: ticks missed while the tab was
          // throttled are caught up in one go instead of being dropped.
          const remaining = Math.max(
            0,
            Math.ceil((state.endsAt - Date.now()) / 1000)
          );
          if (remaining <= 0) {
            return { remaining: 0, running: false, endsAt: null, justFinished: true };
          }
          return remaining === state.remaining ? state : { remaining };
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
        endsAt: state.endsAt,
        soundEnabled: state.soundEnabled,
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