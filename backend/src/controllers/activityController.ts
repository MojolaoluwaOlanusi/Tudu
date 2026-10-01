import { Request, Response } from 'express';
import pool from '../config/database';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

const parsePaging = (req: Request): { limit: number; offset: number } => {
  const rawLimit = parseInt(String(req.query.limit ?? ''), 10);
  const rawOffset = parseInt(String(req.query.offset ?? ''), 10);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(Math.max(rawLimit, 1), MAX_PAGE_SIZE)
    : DEFAULT_PAGE_SIZE;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  return { limit, offset };
};

/** Accept an ISO date; ignore anything unparseable. */
const parseDate = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * Fetch one page of a user's activity, optionally filtered by task and/or
 * a date range. Returns the rows plus the unpaginated total.
 */
const fetchActivity = async (
  userId: string,
  options: {
    limit: number;
    offset: number;
    taskId?: string;
    from?: string | null;
    to?: string | null;
  }
) => {
  const params: any[] = [userId];
  const filters = ['a.user_id = $1'];

  if (options.taskId) {
    params.push(options.taskId);
    filters.push(`a.task_id = $${params.length}`);
  }
  if (options.from) {
    params.push(options.from);
    filters.push(`a.created_at >= $${params.length}`);
  }
  if (options.to) {
    params.push(options.to);
    filters.push(`a.created_at <= $${params.length}`);
  }

  const where = filters.join(' AND ');

  const [rows, count] = await Promise.all([
    pool.query(
      `SELECT a.id, a.user_id, a.task_id, a.action, a.details,
              -- created_at is a naive UTC timestamp. Cast it to timestamptz so
              -- the driver reads it as an absolute instant instead of
              -- applying the server's local timezone offset.
              a.created_at AT TIME ZONE 'UTC' AS created_at,
              t.title AS task_title
       FROM activity_log a
       LEFT JOIN tasks t ON t.id = a.task_id
       WHERE ${where}
       ORDER BY a.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, options.limit, options.offset]
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM activity_log a WHERE ${where}`,
      params
    ),
  ]);

  return { items: rows.rows, total: count.rows[0].total };
};

/** GET /api/activity */
export const getActivity = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { limit, offset } = parsePaging(req);

    const rawTaskId = req.query.taskId;
    const taskId = typeof rawTaskId === 'string' && rawTaskId ? rawTaskId : undefined;
    if (taskId && !isValidUuid(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const result = await fetchActivity(userId, {
      limit,
      offset,
      taskId,
      from: parseDate(req.query.from),
      to: parseDate(req.query.to),
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

/** GET /api/activity/:taskId */
export const getTaskActivity = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { taskId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidUuid(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const { limit, offset } = parsePaging(req);
    const result = await fetchActivity(userId, { limit, offset, taskId });

    res.json(result);
  } catch (error) {
    console.error('Error fetching task activity:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};