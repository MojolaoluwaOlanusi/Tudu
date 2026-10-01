export type PomodoroMode = 'focus' | 'break';

export interface PomodoroSession {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title: string | null;
  /** Length of the session in minutes. */
  duration: number;
  /** ISO instant, or null while the session is still running. */
  completed_at: string | null;
  created_at: string;
}

export interface PeriodSummary {
  sessions: number;
  minutes: number;
}

export interface DailySummary extends PeriodSummary {
  /** Calendar date in the user's own timezone (YYYY-MM-DD). */
  date: string;
}

export interface TaskSummary extends PeriodSummary {
  taskId: string | null;
  title: string | null;
  status: string | null;
}

export interface PomodoroStats {
  totals: {
    /** Completed sessions only. */
    sessions: number;
    minutes: number;
    /** Every row ever started, completed or not. */
    startedSessions: number;
    /** Started but never completed. */
    abandoned: number;
  };
  today: PeriodSummary;
  week: PeriodSummary;
  /** The last seven days, oldest first, with gaps filled in. */
  daily: DailySummary[];
  byTask: TaskSummary[];
  recent: PomodoroSession[];
}

export const DEFAULT_FOCUS_MINUTES = 25;
export const DEFAULT_BREAK_MINUTES = 5;
export const MAX_SESSION_MINUTES = 180;