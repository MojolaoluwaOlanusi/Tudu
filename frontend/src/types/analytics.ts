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


/* ------------------------------------------------------------------ */
/* Feature 5.11 - team analytics                                       */
/* ------------------------------------------------------------------ */

export type TeamRole = 'admin' | 'member' | 'viewer';

export interface TeamBoardRow {
  id: string;
  name: string;
  total: number;
  done: number;
}

export interface TeamOverview {
  tasks: { total: number; todo: number; doing: number; done: number; overdue: number };
  completionRate: number;
  boards: TeamBoardRow[];
}

export interface TeamMemberRow {
  userId: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  role: TeamRole;
  completed: number;
  inProgress: number;
  assigned: number;
}

export interface BurndownPoint {
  date: string;
  remaining: number;
  completed: number;
}

export interface TeamAnalytics {
  workspace: { id: string; name: string; role: TeamRole };
  range: AnalyticsRange;
  overview: TeamOverview;
  byMember: TeamMemberRow[];
  burndown: BurndownPoint[];
}
