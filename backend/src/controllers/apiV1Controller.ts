import { Request, Response } from 'express';
import pool from '../config/database';
import { taskVisibleSql } from '../services/boardAccess';

const MAX_PAGE = 200;
const DEFAULT_PAGE = 50;

const parseLimit = (value: unknown, fallback: number): number => {
  const n = typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(Math.max(1, Math.trunc(n)), MAX_PAGE);
};

const parseOffset = (value: unknown): number => {
  const n = typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.trunc(n));
};

/** GET /api/v1/me - the authenticated user. */
export const meV1 = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching /v1/me:', error);
    res.status(500).json({ error: 'Failed to fetch the user' });
  }
};

/**
 * GET /api/v1/boards - the caller's boards.
 *
 * Includes personal boards and any workspace board the user is an accepted
 * member of. Unlike the app's /api/boards, this does not create a default
 * board on read - an API caller expects a pure read.
 */
export const listBoardsV1 = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT b.id, b.name, b.workspace_id, b.created_at, b.updated_at ' +
        'FROM boards b ' +
        'WHERE (b.workspace_id IS NULL AND b.user_id = $1) ' +
        '   OR EXISTS ( ' +
        '     SELECT 1 FROM workspace_members wm ' +
        '     WHERE wm.workspace_id = b.workspace_id ' +
        '       AND wm.user_id = $1 AND wm.status = ' + "'accepted'" + ' ) ' +
        'ORDER BY b.created_at ASC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing boards (v1):', error);
    res.status(500).json({ error: 'Failed to list boards' });
  }
};

/** GET /api/v1/boards/:id - one board, if the caller can see it. */
export const getBoardV1 = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT b.id, b.name, b.workspace_id, b.created_at, b.updated_at ' +
        'FROM boards b ' +
        'WHERE b.id = $1 AND ( ' +
        '  (b.workspace_id IS NULL AND b.user_id = $2) ' +
        '  OR EXISTS ( ' +
        '    SELECT 1 FROM workspace_members wm ' +
        '    WHERE wm.workspace_id = b.workspace_id ' +
        '      AND wm.user_id = $2 AND wm.status = ' + "'accepted'" + ' ) ' +
        ')',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching board (v1):', error);
    res.status(500).json({ error: 'Failed to fetch the board' });
  }
};

/**
 * GET /api/v1/tasks - tasks the caller can see.
 *
 * Filters: board_id, status, category, priority, limit, offset. Results
 * are ordered created_at DESC with a stable tiebreaker so pagination
 * does not skip rows.
 */
export const listTasksV1 = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { board_id, status, category, priority } = req.query as {
      board_id?: string;
      status?: string;
      category?: string;
      priority?: string;
    };
    const limit = parseLimit(req.query.limit, DEFAULT_PAGE);
    const offset = parseOffset(req.query.offset);

    // taskVisibleSql handles the ownership / workspace-role checks and
    // filters soft-deleted rows. Its first placeholder is the user id.
    const conditions: string[] = [taskVisibleSql('$1')];
    const params: unknown[] = [userId];
    let idx = 2;

    if (board_id) {
      conditions.push('t.board_id = $' + idx);
      params.push(board_id);
      idx += 1;
    }
    if (status) {
      conditions.push('t.status = $' + idx);
      params.push(status);
      idx += 1;
    }
    if (category) {
      conditions.push('t.category = $' + idx);
      params.push(category);
      idx += 1;
    }
    if (priority) {
      conditions.push('t.priority = $' + idx);
      params.push(priority);
      idx += 1;
    }

    params.push(limit);
    const limitIdx = idx;
    idx += 1;
    params.push(offset);
    const offsetIdx = idx;

    const sql =
      'SELECT t.id, t.title, t.description, t.status, t.category, ' +
        '       t.priority, t.due_date, t.board_id, t.column_id, ' +
        '       t.assignee_id, t.created_at, t.updated_at ' +
        'FROM tasks t ' +
        'WHERE ' + conditions.join(' AND ') + ' ' +
        'ORDER BY t.created_at DESC, t.id DESC ' +
        'LIMIT $' + limitIdx + ' OFFSET $' + offsetIdx;

    const result = await pool.query(sql, params);
    res.json({
      items: result.rows,
      limit,
      offset,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error listing tasks (v1):', error);
    res.status(500).json({ error: 'Failed to list tasks' });
  }
};

/** GET /api/v1/tasks/:id - one task, if the caller can see it. */
export const getTaskV1 = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT t.id, t.title, t.description, t.status, t.category, ' +
        '       t.priority, t.due_date, t.board_id, t.column_id, ' +
        '       t.assignee_id, t.created_at, t.updated_at ' +
        'FROM tasks t WHERE t.id = $1 AND ' + taskVisibleSql('$2'),
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task (v1):', error);
    res.status(500).json({ error: 'Failed to fetch the task' });
  }
};
