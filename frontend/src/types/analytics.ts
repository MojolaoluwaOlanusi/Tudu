export type AnalyticsRange = 'week' | 'month' | 'quarter';

/** A single bar/point on the productivity trend chart. */
export interface TrendBucket {
  key: string;
  label: string;
  count: number;
}

export interface AnalyticsOverview {
  tasks: {
    total: number;
    todo: number;
    doing: number;
    done: number;
    overdue: number;
  };
  /** 0-100 across every task the user owns. */
  completionRate: number;
  byPriority: { high: number; medium: number; low: number; none: number };
  byCategory: { work: number; personal: number; study: number; none: number };
  focus: { minutes: number; sessions: number };
}

export interface CompletedTasksAnalytics {
  range: AnalyticsRange;
  granularity: 'day' | 'week';
  total: number;
  previousTotal: number;
  /** null when the previous period was empty and there is nothing to compare. */
  changePercent: number | null;
  buckets: TrendBucket[];
  bestBucket: TrendBucket | null;
}

export interface CategorySlice {
  category: string;
  label: string;
  minutes: number;
  sessions: number;
  /** 0-100. */
  share: number;
}

export interface TimeSpentAnalytics {
  totalMinutes: number;
  totalSessions: number;
  byCategory: CategorySlice[];
  byTask: {
    taskId: string | null;
    title: string | null;
    minutes: number;
    sessions: number;
  }[];
}