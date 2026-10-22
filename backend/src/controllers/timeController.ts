import { Request, Response } from 'express';
import pool from '../config/database';
import { taskVisibleSql } from '../services/boardAccess';
import { logActivity } from '../services/activityService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

const MAX_DESCRIPTION = 500;
const MAX_MANUAL_DURATION_SECONDS = 24 * 3600;

/** Include the task title via a LEFT JOIN for read queries. */
const ENTRY_SELECT = `
  te.id, te.user_id, te.task_id, te.description, te.billable,
  te.started_at AT TIME ZONE 'UTC' AS started_at,
  te.ended_at AT TIME ZONE 'UTC' AS ended_at,
  te.duration_seconds, te.created_at,
  t.title AS task_title
`;

/** Fetch one entry by id, joined to task title, scoped to a user. */
const fetchOne = async (id: string, userId: string) => {
  const result = await pool.query(
    `SELECT ${ENTRY_SELECT}
       FROM time_entries te
       LEFT JOIN tasks t ON t.id = te.task_id
      WHERE te.id = $1 AND te.user_id = $2`,
    [id, userId]
  );
  return result.rows[0] ?? null;
};

/** GET /api/time/active - the caller's running timer, or null. */
export const getActive = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT ${ENTRY_SELECT}
         FROM time_entries te
         LEFT JOIN tasks t ON t.id = te.task_id
        WHERE te.user_id = $1 AND te.ended_at IS NULL
        ORDER BY te.started_at DESC
        LIMIT 1`,
      [userId]
    );
    res.json(result.rows[0] ?? null);
  } catch (error) {
    console.error('Error fetching active timer:', error);
    res.status(500).json({ error: 'Failed to fetch the active timer' });
  }
};

/** POST /api/time/start - body: { taskId?, description?, billable? } */
export const start = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { taskId, description, billable } = (req.body ?? {}) as {
      taskId?: unknown;
      description?: unknown;
      billable?: unknown;
    };

    let finalTaskId: string | null = null;
    if (taskId !== undefined && taskId !== null && taskId !== '') {
      if (!isValidUuid(taskId)) {
        return res.status(400).json({ error: 'Invalid task id' });
      }
      const visible = await pool.query(
        `SELECT 1 FROM tasks t WHERE t.id = $1 AND ${taskVisibleSql('$2')}`,
        [taskId, userId]
      );
      if (visible.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      finalTaskId = taskId;
    }

    const desc =
      typeof description === 'string'
        ? description.trim().slice(0, MAX_DESCRIPTION) || null
        : null;

    try {
      const inserted = await pool.query(
        `INSERT INTO time_entries (user_id, task_id, description, billable)
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [userId, finalTaskId, desc, billable === true]
      );
      const row = await fetchOne(inserted.rows[0].id, userId);
      await logActivity(userId, 'timer_started', finalTaskId, {
        entryId: inserted.rows[0].id,
        taskTitle: row?.task_title ?? null,
      });
      res.status(201).json(row);
    } catch (err) {
      if ((err as { code?: string }).code === '23505') {
        const active = await pool.query(
          `SELECT ${ENTRY_SELECT}
             FROM time_entries te
             LEFT JOIN tasks t ON t.id = te.task_id
            WHERE te.user_id = $1 AND te.ended_at IS NULL
            LIMIT 1`,
          [userId]
        );
        return res.status(409).json({
          error: 'A timer is already running',
          active: active.rows[0] ?? null,
        });
      }
      throw err;
    }
  } catch (error) {
    console.error('Error starting timer:', error);
    res.status(500).json({ error: 'Failed to start the timer' });
  }
};

/** POST /api/time/stop - stops the caller's running timer. */
export const stop = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `UPDATE time_entries
          SET ended_at = NOW(),
              duration_seconds = GREATEST(1, EXTRACT(EPOCH FROM (NOW() - started_at))::int),
              updated_at = NOW()
        WHERE user_id = $1 AND ended_at IS NULL
        RETURNING id`,
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No running timer' });
    }
    const row = await fetchOne(result.rows[0].id, userId);
    await logActivity(userId, 'timer_stopped', row?.task_id ?? null, {
      entryId: row?.id,
      duration: row?.duration_seconds ?? 0,
    });
    res.json(row);
  } catch (error) {
    console.error('Error stopping timer:', error);
    res.status(500).json({ error: 'Failed to stop the timer' });
  }
};

/**
 * POST /api/time/entries - a manual entry for past work.
 * Body: { startedAt, endedAt, taskId?, description?, billable? }
 */
export const createManual = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { startedAt, endedAt, taskId, description, billable } = (
      req.body ?? {}
    ) as {
      startedAt?: unknown;
      endedAt?: unknown;
      taskId?: unknown;
      description?: unknown;
      billable?: unknown;
    };

    if (typeof startedAt !== 'string' || typeof endedAt !== 'string') {
      return res.status(400).json({ error: 'startedAt and endedAt are required' });
    }
    const startDate = new Date(startedAt);
    const endDate = new Date(endedAt);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }
    if (endDate.getTime() <= startDate.getTime()) {
      return res.status(400).json({ error: 'endedAt must be after startedAt' });
    }
    const durationSeconds = Math.round(
      (endDate.getTime() - startDate.getTime()) / 1000
    );
    if (durationSeconds > MAX_MANUAL_DURATION_SECONDS) {
      return res
        .status(400)
        .json({ error: 'Manual entries cannot exceed 24 hours' });
    }

    let finalTaskId: string | null = null;
    if (taskId !== undefined && taskId !== null && taskId !== '') {
      if (!isValidUuid(taskId)) {
        return res.status(400).json({ error: 'Invalid task id' });
      }
      const visible = await pool.query(
        `SELECT 1 FROM tasks t WHERE t.id = $1 AND ${taskVisibleSql('$2')}`,
        [taskId, userId]
      );
      if (visible.rows.length === 0) {
        return res.status(404).json({ error: 'Task not found' });
      }
      finalTaskId = taskId;
    }

    const desc =
      typeof description === 'string'
        ? description.trim().slice(0, MAX_DESCRIPTION) || null
        : null;

    const inserted = await pool.query(
      `INSERT INTO time_entries
         (user_id, task_id, description, billable, started_at, ended_at, duration_seconds)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [
        userId,
        finalTaskId,
        desc,
        billable === true,
        startDate.toISOString(),
        endDate.toISOString(),
        durationSeconds,
      ]
    );
    const row = await fetchOne(inserted.rows[0].id, userId);
    res.status(201).json(row);
  } catch (error) {
    console.error('Error creating manual entry:', error);
    res.status(500).json({ error: 'Failed to save the entry' });
  }
};

/** GET /api/time/entries?from=&to=&taskId=&limit=&offset= */
export const listEntries = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const rawLimit = parseInt(String((req.query as { limit?: unknown }).limit ?? ''), 10);
    const rawOffset = parseInt(String((req.query as { offset?: unknown }).offset ?? ''), 10);
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 30;
    const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;

    const params: unknown[] = [userId];
    const filters = ['te.user_id = $1', 'te.ended_at IS NOT NULL'];

    const taskId = (req.query as { taskId?: unknown }).taskId;
    if (typeof taskId === 'string' && taskId) {
      if (!isValidUuid(taskId)) {
        return res.status(400).json({ error: 'Invalid task id' });
      }
      params.push(taskId);
      filters.push(`te.task_id = $${params.length}`);
    }

    const from = (req.query as { from?: unknown }).from;
    if (typeof from === 'string' && from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) {
        params.push(d.toISOString());
        filters.push(`te.started_at >= $${params.length}`);
      }
    }

    const to = (req.query as { to?: unknown }).to;
    if (typeof to === 'string' && to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) {
        params.push(d.toISOString());
        filters.push(`te.started_at <= $${params.length}`);
      }
    }

    const where = filters.join(' AND ');
    params.push(limit);
    const limitIdx = params.length;
    params.push(offset);
    const offsetIdx = params.length;

    const [rows, count] = await Promise.all([
      pool.query(
        `SELECT ${ENTRY_SELECT}
           FROM time_entries te
           LEFT JOIN tasks t ON t.id = te.task_id
          WHERE ${where}
          ORDER BY te.started_at DESC
          LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
        params
      ),
      pool.query(
        `SELECT COUNT(*)::int AS total FROM time_entries te WHERE ${where}`,
        params.slice(0, params.length - 2)
      ),
    ]);

    res.json({ items: rows.rows, total: count.rows[0].total, limit, offset });
  } catch (error) {
    console.error('Error listing time entries:', error);
    res.status(500).json({ error: 'Failed to list time entries' });
  }
};

/** DELETE /api/time/entries/:id */
export const deleteEntry = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid entry id' });

    const result = await pool.query(
      'DELETE FROM time_entries WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    console.error('Error deleting time entry:', error);
    res.status(500).json({ error: 'Failed to delete the entry' });
  }
};

/**
 * GET /api/time/report?range=week|month|quarter&timezoneOffset=
 *
 * Daily totals, per-task breakdown, and a billable vs non-billable split.
 * Duration is stored in seconds so timezone only affects which day a row
 * falls into, never the total.
 */
const RANGE_DAYS: Record<string, number> = { week: 7, month: 30, quarter: 84 };

export const report = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const rawRange = (req.query as { range?: unknown }).range;
    const range =
      typeof rawRange === 'string' && RANGE_DAYS[rawRange] ? rawRange : 'week';
    const days = RANGE_DAYS[range];

    const rawOffset = (req.query as { timezoneOffset?: unknown }).timezoneOffset;
    const offset = Number.isFinite(Number(rawOffset)) ? Math.trunc(Number(rawOffset)) : 0;
    const shift = `${-offset} minutes`;

    const localNow = new Date(Date.now() - offset * 60_000);
    const end = localNow.toISOString().slice(0, 10);
    const startDate = new Date(localNow.getTime());
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));
    const start = startDate.toISOString().slice(0, 10);

    const [totals, byDay, byTask] = await Promise.all([
      pool.query(
        `SELECT
           COALESCE(SUM(duration_seconds), 0)::int AS total_seconds,
           COUNT(*)::int AS total_entries,
           COALESCE(SUM(duration_seconds) FILTER (WHERE billable), 0)::int AS billable_seconds
         FROM time_entries
         WHERE user_id = $1
           AND ended_at IS NOT NULL
           AND (started_at + $2::interval)::date BETWEEN $3::date AND $4::date`,
        [userId, shift, start, end]
      ),
      pool.query(
        `SELECT (started_at + $2::interval)::date::text AS date,
                COALESCE(SUM(duration_seconds), 0)::int AS seconds,
                COUNT(*)::int AS entries
         FROM time_entries
         WHERE user_id = $1
           AND ended_at IS NOT NULL
           AND (started_at + $2::interval)::date BETWEEN $3::date AND $4::date
         GROUP BY 1 ORDER BY 1`,
        [userId, shift, start, end]
      ),
      pool.query(
        `SELECT te.task_id, t.title,
                COALESCE(SUM(te.duration_seconds), 0)::int AS seconds,
                COUNT(*)::int AS entries
         FROM time_entries te
         LEFT JOIN tasks t ON t.id = te.task_id
         WHERE te.user_id = $1
           AND te.ended_at IS NOT NULL
           AND (te.started_at + $2::interval)::date BETWEEN $3::date AND $4::date
         GROUP BY te.task_id, t.title
         ORDER BY seconds DESC
         LIMIT 20`,
        [userId, shift, start, end]
      ),
    ]);

    const dayMap = new Map<string, { seconds: number; entries: number }>();
    for (const row of byDay.rows) {
      dayMap.set(row.date, { seconds: row.seconds, entries: row.entries });
    }

    const filled: { date: string; seconds: number; entries: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const day = new Date(localNow.getTime());
      day.setUTCDate(day.getUTCDate() - i);
      const key = day.toISOString().slice(0, 10);
      const hit = dayMap.get(key);
      filled.push({ date: key, seconds: hit?.seconds ?? 0, entries: hit?.entries ?? 0 });
    }

    res.json({
      range,
      totalSeconds: totals.rows[0].total_seconds,
      totalEntries: totals.rows[0].total_entries,
      billableSeconds: totals.rows[0].billable_seconds,
      byDay: filled,
      byTask: byTask.rows.map((row: any) => ({
        taskId: row.task_id,
        title: row.title,
        seconds: row.seconds,
        entries: row.entries,
      })),
    });
  } catch (error) {
    console.error('Error loading time report:', error);
    res.status(500).json({ error: 'Failed to load the report' });
  }
};
