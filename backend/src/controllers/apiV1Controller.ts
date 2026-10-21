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
import { CreateTaskSchema, UpdateTaskSchema, zodError } from './apiV1WriteSchemas';
import { parseTaskText } from '../services/nlpService';
import { logActivity } from '../services/activityService';
import { broadcastTask } from '../services/realtimeService';
import { getBoardRole, roleAtLeast, resolveColumn } from '../services/boardAccess';
import { triggerWebhooks } from '../services/webhookService';
import { SOCKET_EVENTS } from '../types/socket';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

/**
 * POST /api/v1/tasks - create a task via the public API.
 *
 * Shares the same core as POST /api/tasks (NLP parse, board/column
 * resolution, activity log, socket broadcast), but validates the body
 * with Zod first and triggers outbound webhooks. Deliberately does not
 * call the controller's handler - the two have different auth and error
 * shapes, and keeping the shared core small is safer than threading a
 * "which auth mode" flag through it.
 */
export const createTaskV1 = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const parsedBody = CreateTaskSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) return res.status(400).json(zodError(parsedBody.error));

    const input = parsedBody.data;
    let title = input.title;
    let category = input.category;
    let priority = input.priority;
    let due_date = input.due_date;

    if (input.naturalLanguage !== false) {
      const parsed = parseTaskText(title);
      title = parsed.title || title.trim();
      category = category ?? parsed.category ?? undefined;
      priority = priority ?? parsed.priority ?? undefined;
      due_date = due_date ?? parsed.dueDate ?? undefined;
    }

    let boardId: string | null = null;
    let columnId: string | null = null;
    if (input.column_id) {
      if (!isValidUuid(input.column_id)) {
        return res.status(400).json({ error: 'Invalid column id' });
      }
      const column = await resolveColumn(userId, input.column_id, 'member');
      if (!column) return res.status(404).json({ error: 'Column not found' });
      columnId = input.column_id;
      boardId = column.board_id;
    } else if (input.board_id) {
      if (!isValidUuid(input.board_id)) {
        return res.status(400).json({ error: 'Invalid board id' });
      }
      if (!roleAtLeast(await getBoardRole(userId, input.board_id), 'member')) {
        return res.status(404).json({ error: 'Board not found' });
      }
      boardId = input.board_id;
    }

    const result = await pool.query(
      'INSERT INTO tasks (user_id, title, description, category, priority, due_date, board_id, column_id) ' +
        'VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [userId, title, input.description ?? null, category ?? null, priority ?? null, due_date ?? null, boardId, columnId]
    );
    const task = result.rows[0];

    await logActivity(userId, 'task_created', task.id, { title: task.title });
    await broadcastTask(SOCKET_EVENTS.taskCreate, userId, task);
    await triggerWebhooks(userId, 'task.created', { task });

    res.status(201).json(task);
  } catch (error) {
    console.error('Error creating task (v1):', error);
    res.status(500).json({ error: 'Failed to create the task' });
  }
};

/** PUT /api/v1/tasks/:id - partial update. */
export const updateTaskV1 = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid task id' });

    const parsedBody = UpdateTaskSchema.safeParse(req.body ?? {});
    if (!parsedBody.success) return res.status(400).json(zodError(parsedBody.error));

    const input = parsedBody.data;
    const updates: string[] = [];
    const values: unknown[] = [];

    const set = (column: string, value: unknown) => {
      values.push(value);
      updates.push(column + ' = $' + values.length);
    };

    if (input.title !== undefined) set('title', input.title);
    if (input.description !== undefined) set('description', input.description);
    if (input.category !== undefined) set('category', input.category);
    if (input.priority !== undefined) set('priority', input.priority);
    if (input.due_date !== undefined) set('due_date', input.due_date);
    if (input.status !== undefined) set('status', input.status);

    updates.push('updated_at = NOW()');
    values.push(id);
    values.push(userId);

    const result = await pool.query(
      'UPDATE tasks SET ' + updates.join(', ') +
        ' WHERE tasks.id = $' + (values.length - 1) + ' AND tasks.deleted_at IS NULL ' +
        ' AND tasks.user_id = $' + values.length + ' RETURNING *',
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = result.rows[0];
    await logActivity(userId, input.status === 'done' ? 'task_completed' : 'task_updated', id, {
      title: task.title,
      fields: Object.keys(input),
    });
    await broadcastTask(SOCKET_EVENTS.taskUpdate, userId, task);
    await triggerWebhooks(userId, 'task.updated', { task });

    res.json(task);
  } catch (error) {
    console.error('Error updating task (v1):', error);
    res.status(500).json({ error: 'Failed to update the task' });
  }
};

/** DELETE /api/v1/tasks/:id - soft delete. */
export const deleteTaskV1 = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid task id' });

    const result = await pool.query(
      'UPDATE tasks SET deleted_at = NOW(), updated_at = NOW() ' +
        'WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING id, title, board_id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = result.rows[0];
    await logActivity(userId, 'task_deleted', null, { title: task.title });
    await triggerWebhooks(userId, 'task.deleted', { task_id: task.id, title: task.title });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task (v1):', error);
    res.status(500).json({ error: 'Failed to delete the task' });
  }
};
