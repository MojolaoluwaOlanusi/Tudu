import pool from '../config/database';

/**
 * Read-only aggregation for the analytics dashboard.
 *
 * Two timezone rules apply throughout:
 *  - `activity_log.created_at` and `pomodoro_sessions.completed_at` are naive
 *    UTC, so they are shifted onto the user's wall clock before grouping.
 *  - `tasks.due_date` is naive *local* wall time (that is what the browser's
 *    datetime-local input sends), so it is shifted the other way, onto UTC,
 *    before being compared with NOW().
 */

export type AnalyticsRange = 'week' | 'month' | 'quarter';
export type Granularity = 'day' | 'week';

export interface RangeSpec {
  range: AnalyticsRange;
  granularity: Granularity;
  /** How many buckets the chart shows. */
  buckets: number;
  /** How far back the period reaches. */
  periodDays: number;
}

export const RANGE_SPECS: Record<AnalyticsRange, RangeSpec> = {
  week: { range: 'week', granularity: 'day', buckets: 7, periodDays: 7 },
  month: { range: 'month', granularity: 'day', buckets: 30, periodDays: 30 },
  quarter: { range: 'quarter', granularity: 'week', buckets: 12, periodDays: 84 },
};

export const parseRange = (value: unknown): AnalyticsRange =>
  value === 'month' || value === 'quarter' ? value : 'week';

/**
 * Minutes to ADD to a naive UTC timestamp to reach the user's wall clock.
 * `getTimezoneOffset()` is (UTC - local), so this is its negation.
 */
export const utcToLocalShift = (timezoneOffset: number): string =>
  `${-timezoneOffset} minutes`;

/**
 * Minutes to ADD to a naive *local* `due_date` to reach the UTC instant it
 * refers to - the same conversion the browser performs when it builds a Date.
 */
export const localToUtcShift = (timezoneOffset: number): string =>
  `${timezoneOffset} minutes`;

export interface OverviewResult {
  tasks: {
    total: number;
    todo: number;
    doing: number;
    done: number;
    overdue: number;
  };
  completionRate: number;
  byPriority: { high: number; medium: number; low: number; none: number };
  byCategory: { work: number; personal: number; study: number; none: number };
  focus: { minutes: number; sessions: number };
}

export const getOverview = async (
  userId: string,
  timezoneOffset: number
): Promise<OverviewResult> => {
  const dueShift = localToUtcShift(timezoneOffset);

  const [taskRows, focusRows] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'todo')::int  AS todo,
         COUNT(*) FILTER (WHERE status = 'doing')::int AS doing,
         COUNT(*) FILTER (WHERE status = 'done')::int  AS done,
         COUNT(*) FILTER (
           WHERE due_date IS NOT NULL
             AND (due_date + $2::interval) < NOW()
             AND status <> 'done'
         )::int AS overdue,
         COUNT(*) FILTER (WHERE priority = 'high')::int   AS p_high,
         COUNT(*) FILTER (WHERE priority = 'medium')::int AS p_medium,
         COUNT(*) FILTER (WHERE priority = 'low')::int    AS p_low,
         COUNT(*) FILTER (WHERE priority IS NULL)::int    AS p_none,
         COUNT(*) FILTER (WHERE category = 'work')::int     AS c_work,
         COUNT(*) FILTER (WHERE category = 'personal')::int AS c_personal,
         COUNT(*) FILTER (WHERE category = 'study')::int    AS c_study,
         COUNT(*) FILTER (WHERE category IS NULL)::int      AS c_none
       FROM tasks WHERE user_id = $1`,
      [userId, dueShift]
    ),
    pool.query(
      `SELECT COALESCE(SUM(duration), 0)::int AS minutes,
              COUNT(*)::int AS sessions
       FROM pomodoro_sessions
       WHERE user_id = $1 AND completed_at IS NOT NULL`,
      [userId]
    ),
  ]);

  const row = taskRows.rows[0];
  const total = row.total;

  return {
    tasks: {
      total,
      todo: row.todo,
      doing: row.doing,
      done: row.done,
      overdue: row.overdue,
    },
    // A brand new account has nothing to complete; 0 reads better than NaN.
    completionRate: total === 0 ? 0 : Math.round((row.done / total) * 100),
    byPriority: {
      high: row.p_high,
      medium: row.p_medium,
      low: row.p_low,
      none: row.p_none,
    },
    byCategory: {
      work: row.c_work,
      personal: row.c_personal,
      study: row.c_study,
      none: row.c_none,
    },
    focus: { minutes: focusRows.rows[0].minutes, sessions: focusRows.rows[0].sessions },
  };
};
export interface TrendBucket {
  key: string;
  label: string;
  count: number;
}

export interface CompletedTasksResult {
  range: AnalyticsRange;
  granularity: Granularity;
  total: number;
  previousTotal: number;
  /** Percentage change vs the previous period; null when there is no base. */
  changePercent: number | null;
  buckets: TrendBucket[];
  bestBucket: TrendBucket | null;
}

/**
 * Completions come from `activity_log` rather than `tasks.updated_at`,
 * because the tasks table has no completed_at column - updated_at also changes
 * for ordinary edits, which would inflate the numbers.
 */
export const getCompletedTasks = async (
  userId: string,
  timezoneOffset: number,
  spec: RangeSpec
): Promise<CompletedTasksResult> => {
  const shift = utcToLocalShift(timezoneOffset);

  // The user's local now, so bucket labels and bucket keys agree.
  const localNow = new Date(Date.now() - timezoneOffset * 60_000);

  // Bucket keys are built here rather than in SQL so the labels and the keys
  // the GROUP BY produces are guaranteed to use the same wall clock.
  const keys: { key: string; label: string }[] = [];

  const pushDay = (day: Date) => {
    keys.push({
      key: day.toISOString().slice(0, 10),
      label: day.toLocaleDateString(undefined, {
        weekday: 'short',
        day: 'numeric',
        timeZone: 'UTC',
      }),
    });
  };

  const pushWeek = (monday: Date) => {
    keys.push({
      key: monday.toISOString().slice(0, 10),
      label: monday.toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        timeZone: 'UTC',
      }),
    });
  };

  if (spec.granularity === 'day') {
    for (let i = spec.buckets - 1; i >= 0; i--) {
      const day = new Date(localNow.getTime());
      day.setUTCDate(day.getUTCDate() - i);
      pushDay(day);
    }
  } else {
    // Step back a whole week at a time from this week's Monday. Walking back
    // day by day and flooring to the Monday would emit the same week key
    // repeatedly, so a 12-week chart showed one week seven times over.
    const thisMonday = new Date(localNow.getTime());
    thisMonday.setUTCDate(
      thisMonday.getUTCDate() - ((thisMonday.getUTCDay() + 6) % 7)
    );
    for (let i = spec.buckets - 1; i >= 0; i--) {
      const monday = new Date(thisMonday.getTime());
      monday.setUTCDate(monday.getUTCDate() - i * 7);
      pushWeek(monday);
    }
  }

  const rows = await pool.query(
    `SELECT (created_at + $2::interval)::date::text AS bucket,
            COUNT(*)::int AS count
     FROM activity_log
     WHERE user_id = $1
       AND action = 'task_completed'
       AND (created_at + $2::interval)::date >= $3::date
     GROUP BY 1`,
    [userId, shift, keys[0].key]
  );

  // With weekly buckets SQL groups by the real completion date, but the chart
  // looks values up by the Monday that starts the week, so fold each row onto
  // its Monday before matching. Without this every weekly bucket reads zero.
  const toMonday = (isoDate: string): string => {
    const d = new Date(`${isoDate}T00:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  };

  const counts = new Map<string, number>();
  for (const row of rows.rows) {
    const raw = String(row.bucket);
    const key = spec.granularity === 'week' ? toMonday(raw) : raw;
    counts.set(key, (counts.get(key) ?? 0) + row.count);
  }

  const buckets: TrendBucket[] = keys.map((entry) => ({
    key: entry.key,
    label: entry.label,
    count: counts.get(entry.key) ?? 0,
  }));

  const total = buckets.reduce((sum, b) => sum + b.count, 0);

  const bestBucket = buckets.reduce<TrendBucket | null>(
    (top, bucket) => (top === null || bucket.count > top.count ? bucket : top),
    null
  );

  const periodStart = new Date(localNow.getTime());
  periodStart.setUTCDate(periodStart.getUTCDate() - (spec.periodDays - 1));
  const previousEnd = new Date(periodStart.getTime());
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd.getTime());
  previousStart.setUTCDate(previousStart.getUTCDate() - (spec.periodDays - 1));

  const previous = await pool.query(
    `SELECT COUNT(*)::int AS count
     FROM activity_log
     WHERE user_id = $1
       AND action = 'task_completed'
       AND (created_at + $2::interval)::date BETWEEN $3::date AND $4::date`,
    [
      userId,
      shift,
      previousStart.toISOString().slice(0, 10),
      previousEnd.toISOString().slice(0, 10),
    ]
  );

  const previousTotal = previous.rows[0].count;

  return {
    range: spec.range,
    granularity: spec.granularity,
    total,
    previousTotal,
    // No base to compare against, so "no change" would be a lie - report null.
    changePercent:
      previousTotal === 0
        ? total === 0
          ? 0
          : null
        : Math.round(((total - previousTotal) / previousTotal) * 100),
    buckets,
    bestBucket: bestBucket && bestBucket.count > 0 ? bestBucket : null,
  };
};
export interface CategorySlice {
  category: string;
  label: string;
  minutes: number;
  sessions: number;
  /** 0-100, for the pie chart. */
  share: number;
}

export interface TimeSpentResult {
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

const CATEGORY_LABELS: Record<string, string> = {
  work: 'Work',
  personal: 'Personal',
  study: 'Study',
  none: 'Uncategorised',
};

/** Focus minutes joined to each task's category. */
export const getTimeSpent = async (
  userId: string,
  timezoneOffset: number,
  spec: RangeSpec
): Promise<TimeSpentResult> => {
  const shift = utcToLocalShift(timezoneOffset);
  const fromDate = new Date(Date.now() - timezoneOffset * 60_000);
  fromDate.setUTCDate(fromDate.getUTCDate() - (spec.periodDays - 1));
  const from = fromDate.toISOString().slice(0, 10);

  const [byCategory, byTask, totals] = await Promise.all([
    pool.query(
      `SELECT COALESCE(t.category, 'none') AS category,
              COALESCE(SUM(ps.duration), 0)::int AS minutes,
              COUNT(*)::int AS sessions
       FROM pomodoro_sessions ps
       LEFT JOIN tasks t ON t.id = ps.task_id
       WHERE ps.user_id = $1
         AND ps.completed_at IS NOT NULL
         AND (ps.completed_at + $2::interval)::date >= $3::date
       GROUP BY 1 ORDER BY minutes DESC`,
      [userId, shift, from]
    ),
    pool.query(
      `SELECT ps.task_id, t.title,
              COALESCE(SUM(ps.duration), 0)::int AS minutes,
              COUNT(*)::int AS sessions
       FROM pomodoro_sessions ps
       LEFT JOIN tasks t ON t.id = ps.task_id
       WHERE ps.user_id = $1
         AND ps.completed_at IS NOT NULL
         AND (ps.completed_at + $2::interval)::date >= $3::date
       GROUP BY ps.task_id, t.title
       ORDER BY minutes DESC
       LIMIT 8`,
      [userId, shift, from]
    ),
    pool.query(
      `SELECT COALESCE(SUM(duration), 0)::int AS minutes,
              COUNT(*)::int AS sessions
       FROM pomodoro_sessions
       WHERE user_id = $1
         AND completed_at IS NOT NULL
         AND (completed_at + $2::interval)::date >= $3::date`,
      [userId, shift, from]
    ),
  ]);

  const totalMinutes = totals.rows[0].minutes;

  return {
    totalMinutes,
    totalSessions: totals.rows[0].sessions,
    byCategory: byCategory.rows.map((row: any) => ({
      category: row.category,
      label: CATEGORY_LABELS[row.category] ?? row.category,
      minutes: row.minutes,
      sessions: row.sessions,
      share:
        totalMinutes === 0 ? 0 : Math.round((row.minutes / totalMinutes) * 100),
    })),
    byTask: byTask.rows.map((row: any) => ({
      taskId: row.task_id,
      title: row.title,
      minutes: row.minutes,
      sessions: row.sessions,
    })),
  };
};