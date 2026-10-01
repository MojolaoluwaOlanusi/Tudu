export interface PeriodSummary {
  sessions: number;
  minutes: number;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title: string | null;
  /** Length of the session in minutes. */
  duration: number;
  completed_at: string | null;
  created_at: string;
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
    sessions: number;
    minutes: number;
    startedSessions: number;
    abandoned: number;
  };
  today: PeriodSummary;
  week: PeriodSummary;
  daily: DailySummary[];
  byTask: TaskSummary[];
  recent: PomodoroSession[];
}

export type PomodoroMode = 'focus' | 'break';

export const FOCUS_MINUTES = 25;
export const BREAK_MINUTES = 5;