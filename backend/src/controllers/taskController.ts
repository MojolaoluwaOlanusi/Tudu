import { Request, Response } from 'express';
import pool from '../config/database';
import { CreateTaskInput, UpdateTaskInput, TaskFilters, Status } from '../types/task';

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, category, priority, search } = req.query as TaskFilters;

    let query = `
      SELECT * FROM tasks 
      WHERE user_id = $1
    `;
    const params: any[] = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND status = $${paramCount}`;
      params.push(status);
    }

    if (category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(category);
    }

    if (priority) {
      paramCount++;
      query += ` AND priority = $${paramCount}`;
      params.push(priority);
    }

    if (search) {
      paramCount++;
      query += ` AND (title ILIKE $${paramCount} OR description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const getTaskById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const result = await pool.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, description, category, priority, due_date }: CreateTaskInput = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, category, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, title, description, category, priority, due_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
};

export const updateTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { title, description, category, priority, due_date, status }: UpdateTaskInput = req.body;

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (title !== undefined) {
      paramCount++;
      updates.push(`title = $${paramCount}`);
      values.push(title);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      values.push(description);
    }

    if (category !== undefined) {
      paramCount++;
      updates.push(`category = $${paramCount}`);
      values.push(category);
    }

    if (priority !== undefined) {
      paramCount++;
      updates.push(`priority = $${paramCount}`);
      values.push(priority);
    }

    if (due_date !== undefined) {
      paramCount++;
      updates.push(`due_date = $${paramCount}`);
      values.push(due_date);
    }

    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    // Add updated_at
    updates.push(`updated_at = NOW()`);

    // Add id and user_id
    paramCount++;
    values.push(id);
    paramCount++;
    values.push(userId);

    const query = `
      UPDATE tasks 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount - 1} AND user_id = $${paramCount}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};

const VALID_STATUSES: readonly string[] = ['todo', 'doing', 'done'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidStatus = (value: unknown): value is Status =>
  typeof value === 'string' && VALID_STATUSES.includes(value);

const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

/**
 * PATCH /api/tasks/:id/status
 * Move a single task to another column (drag & drop on the Kanban board).
 */
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status } = req.body as { status?: unknown };

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidStatus(status)) {
      return res
        .status(400)
        .json({ error: 'Status must be one of: todo, doing, done' });
    }

    const result = await pool.query(
      `UPDATE tasks
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [status, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating task status:', error);
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

const MAX_BATCH_SIZE = 200;

/**
 * PATCH /api/tasks/batch
 * Move many tasks at once - used when several cards are dragged into a column.
 * Runs as a single statement so the move is atomic.
 */
export const batchUpdateTaskStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { updates } = req.body as { updates?: unknown };

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ error: 'updates must be a non-empty array' });
    }
    if (updates.length > MAX_BATCH_SIZE) {
      return res
        .status(400)
        .json({ error: `Too many updates (max ${MAX_BATCH_SIZE})` });
    }

    const ids: string[] = [];
    const statuses: string[] = [];

    for (const update of updates as { id?: unknown; status?: unknown }[]) {
      if (!update || typeof update !== 'object') {
        return res.status(400).json({ error: 'Each update must be an object' });
      }
      if (!isValidUuid(update.id)) {
        return res.status(400).json({ error: 'Each update requires a valid task id' });
      }
      if (!isValidStatus(update.status)) {
        return res.status(400).json({ error: 'Each update requires a valid status' });
      }
      ids.push(update.id);
      statuses.push(update.status);
    }

    const result = await pool.query(
      `UPDATE tasks t
       SET status = v.status, updated_at = NOW()
       FROM unnest($1::uuid[], $2::text[]) AS v(id, status)
       WHERE t.id = v.id AND t.user_id = $3
       RETURNING t.*`,
      [ids, statuses, userId]
    );

    // A short result means one of the tasks does not belong to this user.
    if (result.rows.length !== ids.length) {
      return res.status(404).json({ error: 'One or more tasks were not found' });
    }

    res.json({ updated: result.rows.length, tasks: result.rows });
  } catch (error) {
    console.error('Error batch updating task statuses:', error);
    res.status(500).json({ error: 'Failed to update tasks' });
  }
};

export const deleteTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Failed to delete task' });
  }
};

export const getOverdueTasks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `SELECT * FROM tasks 
       WHERE user_id = $1 
       AND due_date < NOW() 
       AND status != 'done'
       ORDER BY due_date ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
};
