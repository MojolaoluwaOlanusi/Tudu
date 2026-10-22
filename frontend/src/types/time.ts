/** Feature 5.12 - time tracking. */

export interface TimeEntry {
  id: string;
  user_id: string;
  task_id: string | null;
  task_title: string | null;
  description: string | null;
  billable: boolean;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  created_at: string;
}

export interface TimeReportDay {
  date: string;
  seconds: number;
  entries: number;
}

export interface TimeReportTask {
  taskId: string | null;
  title: string | null;
  seconds: number;
  entries: number;
}

export interface TimeReport {
  range: 'week' | 'month' | 'quarter';
  totalSeconds: number;
  totalEntries: number;
  billableSeconds: number;
  byDay: TimeReportDay[];
  byTask: TimeReportTask[];
}

export interface CreateManualEntry {
  startedAt: string;
  endedAt: string;
  taskId?: string | null;
  description?: string | null;
  billable?: boolean;
}
