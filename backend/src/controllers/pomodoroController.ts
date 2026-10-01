import { Request, Response } from 'express';
import pool from '../config/database';
import { logActivity } from '../services/activityService';
import { PomodoroSession, DEFAULT_FOCUS_MINUTES, MAX_SESSION_MINUTES } from '../types/pomodoro';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

const parseDuration = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return null;
  const rounded = Math.trunc(parsed);
  if (rounded < 1 || rounded > MAX_SESSION_MINUTES) return null;
  return rounded;
};

/**
 * created_at / completed_at are naive UTC timestamps. Cast them to timestamptz
 * so the driver reads an absolute instant instead of applying the server's
 * local offset (which previously made activity timestamps an hour stale).
 */
const SESSION_COLUMNS = `
  ps.id, ps.user_id, ps.task_id, ps.duration,
  ps.completed_at AT TIME ZONE 'UTC' AS completed_at,
  ps.created_at  AT TIME ZONE 'UTC' AS created_at,
  t.title AS task_title
`;

/**
 * Confirm the task belongs to this user before starting a session against it,
 * so a Pomodoro can never be attached to somebody else's task.
 */
const resolveTaskId = async (
  userId: string,
  value: unknown
): Promise<{ taskId: string | null; error?: string }> => {
  if (value === undefined || value === null || value === '') {
    return { taskId: null };
  }
  if (!isValidUuid(value)) {
    return { taskId: null, error: 'taskId must be a valid UUID' };
  }

  const result = await pool.query('SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2', [
    value,
    userId,
  ]);
  if (result.rows.length === 0) {
    return { taskId: null, error: 'Task not found' };
  }
  return { taskId: value };
};

/** POST /api/pomodoro/start */
export const startSession = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { taskId: rawTaskId, duration: rawDuration } = req.body as {
    taskId?: unknown;
    duration?: unknown;
  };

  const duration =
    rawDuration === undefined ? DEFAULT_FOCUS_MINUTES : parseDuration(rawDuration);
  if (duration === null) {
    return res
      .status(400)
      .json({ error: `duration must be between 1 and ${MAX_SESSION_MINUTES} minutes` });
  }

  const { taskId, error } = await resolveTaskId(userId, rawTaskId);
  if (error) return res.status(404).json({ error });

  const result = await pool.query(
    `INSERT INTO pomodoro_sessions (user_id, task_id, duration)
     VALUES ($1, $2, $3)
     RETURNING id, user_id, task_id, duration, completed_at, created_at`,
    [userId, taskId, duration]
  );

  const row = result.rows[0];
  res.status(201).json({
    ...row,
    completed_at: row.completed_at,
    created_at: row.created_at,
    task_title: null,
  } as PomodoroSession);
};

/** POST /api/pomodoro/complete */
export const completeSession = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { sessionId } = req.body as { sessionId?: unknown };
  if (!isValidUuid(sessionId)) {
    return res.status(400).json({ error: 'sessionId must be a valid UUID' });
  }

  const result = await pool.query(
    `UPDATE pomodoro_sessions
     SET completed_at = NOW()
     WHERE id = $1 AND user_id = $2 AND completed_at IS NULL
     RETURNING id, user_id, task_id, duration,
               completed_at AT TIME ZONE 'UTC' AS completed_at,
               created_at  AT TIME ZONE 'UTC' AS created_at`,
    [sessionId, userId]
  );

  if (result.rows.length === 0) {
    // Distinguish "not yours / never existed" from "already completed".
    const existing = await pool.query(
      `SELECT completed_at AT TIME ZONE 'UTC' AS completed_at
       FROM pomodoro_sessions WHERE id = $1 AND user_id = $2`,
      [sessionId, userId]
    );
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Session not found' });
    return res.status(409).json({ error: 'Session was already completed' });
  }

  const row = result.rows[0];

  await logActivity(userId, 'pomodoro_completed', row.task_id, {
    duration: row.duration,
  });

  res.json({ ...row, task_title: null } as PomodoroSession);
};
/**
 * GET /api/pomodoro/active
 * The in-flight session for this user, so a page refresh does not lose the
 * running timer (or accidentally start a second one).
 */
export const getActiveSession = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const result = await pool.query(
    `SELECT ${SESSION_COLUMNS}
     FROM pomodoro_sessions ps
     LEFT JOIN tasks t ON t.id = ps.task_id
     WHERE ps.user_id = $1 AND ps.completed_at IS NULL
     ORDER BY ps.created_at DESC
     LIMIT 1`,
    [userId]
  );

  res.json(result.rows[0] ?? null);
};

/** GET /api/pomodoro/stats?timezoneOffset=&days= */
export const getStats = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // getTimezoneOffset() is (UTC - local), so negating it gives the user's UTC
  // offset, which is ADDED to a naive UTC timestamp to reach their wall clock.
  const rawOffset = (req.query as { timezoneOffset?: unknown }).timezoneOffset;
  const offset = Number.isFinite(Number(rawOffset)) ? Math.trunc(Number(rawOffset)) : 0;
  const shift = `${-offset} minutes`;

  const rawDays = Number((req.query as { days?: unknown }).days);
  const days = Math.min(Math.max(Number.isFinite(rawDays) ? rawDays : 7, 1), 90);

  const [totals, today, week, daily, byTask, recent] = await Promise.all([
    pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE completed_at IS NOT NULL)::int AS sessions,
         COALESCE(SUM(duration) FILTER (WHERE completed_at IS NOT NULL), 0)::int AS minutes,
         COUNT(*)::int AS started_sessions,
         COUNT(*) FILTER (WHERE completed_at IS NULL)::int AS abandoned
       FROM pomodoro_sessions WHERE user_id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS sessions, COALESCE(SUM(duration), 0)::int AS minutes
       FROM pomodoro_sessions
       WHERE user_id = $1 AND completed_at IS NOT NULL
         AND (completed_at + $2::interval)::date = (NOW() + $2::interval)::date`,
      [userId, shift]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS sessions, COALESCE(SUM(duration), 0)::int AS minutes
       FROM pomodoro_sessions
       WHERE user_id = $1 AND completed_at IS NOT NULL
         AND (completed_at + $2::interval)::date
             BETWEEN (NOW() + $2::interval)::date - INTERVAL '6 days'
                 AND (NOW() + $2::interval)::date`,
      [userId, shift]
    ),
    pool.query(
      `SELECT (completed_at + $2::interval)::date::text AS date,
              COUNT(*)::int AS sessions,
              COALESCE(SUM(duration), 0)::int AS minutes
       FROM pomodoro_sessions
       WHERE user_id = $1 AND completed_at IS NOT NULL
         AND (completed_at + $2::interval)::date
             BETWEEN (NOW() + $2::interval)::date - ($3::int - 1)
                 AND (NOW() + $2::interval)::date
       GROUP BY 1 ORDER BY 1`,
      [userId, shift, days]
    ),
    pool.query(
      `SELECT ps.task_id, t.title, t.status,
              COUNT(*)::int AS sessions,
              COALESCE(SUM(ps.duration), 0)::int AS minutes
       FROM pomodoro_sessions ps
       LEFT JOIN tasks t ON t.id = ps.task_id
       WHERE ps.user_id = $1 AND ps.completed_at IS NOT NULL
       GROUP BY ps.task_id, t.title, t.status
       ORDER BY minutes DESC, sessions DESC
       LIMIT 10`,
      [userId]
    ),
    pool.query(
      `SELECT ${SESSION_COLUMNS}
       FROM pomodoro_sessions ps
       LEFT JOIN tasks t ON t.id = ps.task_id
       WHERE ps.user_id = $1 AND ps.completed_at IS NOT NULL
       ORDER BY ps.completed_at DESC
       LIMIT 10`,
      [userId]
    ),
  ]);

  // Fill gaps so a chart always has one point per day. The labels must use the
  // same wall clock as the SQL above, otherwise they line up with the wrong
  // buckets for anyone not on UTC.
  const dailyMap = new Map<string, { sessions: number; minutes: number }>(
    daily.rows.map((row: any) => [
      String(row.date).slice(0, 10),
      { sessions: row.sessions, minutes: row.minutes },
    ])
  );

  const localNow = new Date(Date.now() - offset * 60_000);
  const filled: { date: string; sessions: number; minutes: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = new Date(localNow.getTime());
    day.setUTCDate(day.getUTCDate() - i);
    const key = day.toISOString().slice(0, 10);
    const hit = dailyMap.get(key);
    filled.push({ date: key, sessions: hit?.sessions ?? 0, minutes: hit?.minutes ?? 0 });
  }

  res.json({
    totals: {
      sessions: totals.rows[0].sessions,
      minutes: totals.rows[0].minutes,
      startedSessions: totals.rows[0].started_sessions,
      abandoned: totals.rows[0].abandoned,
    },
    today: today.rows[0],
    week: week.rows[0],
    daily: filled,
    byTask: byTask.rows.map((row: any) => ({
      taskId: row.task_id,
      title: row.title,
      status: row.status,
      sessions: row.sessions,
      minutes: row.minutes,
    })),
    recent: recent.rows,
  });
};