import { Request, Response } from 'express';
import pool from '../config/database';
import { emitToUser } from '../utils/socket';
import { logActivity } from '../services/activityService';
import { CreateTaskInput, UpdateTaskInput, TaskFilters, Status } from '../types/task';

/**
 * Push a change to everyone this task is shared with, so a collaborator sees
 * edits made by the owner in real time (and vice versa).
 */
const notifyCollaborators = async (
  taskId: string,
  ownerId: string,
  event: string,
  payload: unknown
): Promise<void> => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT shared_with_user_id
       FROM shared_lists
       WHERE owner_id = $1 AND status = 'accepted' AND $2::uuid = ANY(task_ids)`,
      [ownerId, taskId]
    );
    result.rows.forEach((row) => emitToUser(row.shared_with_user_id, event, payload));
  } catch (error) {
    console.error('Error notifying collaborators:', error);
  }
};

/** LEFT JOIN that adds subtask totals to every task row. */
const TASK_SUBTASK_COUNTS_JOIN = `
  LEFT JOIN (
    SELECT task_id,
           COUNT(*) AS total,
           COUNT(*) FILTER (WHERE completed) AS done
    FROM subtasks
    GROUP BY task_id
  ) sub ON sub.task_id = t.id
`;

const TASK_SUBTASK_COUNTS_SELECT = `
  COALESCE(sub.total, 0)::int AS subtask_count,
  COALESCE(sub.done, 0)::int AS subtasks_completed
`;

/** The same counts for INSERT/UPDATE, whose RETURNING cannot use the join. */
const TASK_SUBTASK_COUNTS_RETURNING = `
  (SELECT COUNT(*)::int FROM subtasks WHERE task_id = tasks.id) AS subtask_count,
  (SELECT COUNT(*)::int FROM subtasks WHERE task_id = tasks.id AND completed) AS subtasks_completed
`;

export const getAllTasks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { status, category, priority, search } = req.query as TaskFilters;

    let query = `
      SELECT t.*, ${TASK_SUBTASK_COUNTS_SELECT}
      FROM tasks t
      ${TASK_SUBTASK_COUNTS_JOIN}
      WHERE t.user_id = $1
    `;
    const params: any[] = [userId];
    let paramCount = 1;

    if (status) {
      paramCount++;
      query += ` AND t.status = $${paramCount}`;
      params.push(status);
    }

    if (category) {
      paramCount++;
      query += ` AND t.category = $${paramCount}`;
      params.push(category);
    }

    if (priority) {
      paramCount++;
      query += ` AND t.priority = $${paramCount}`;
      params.push(priority);
    }

    if (search) {
      paramCount++;
      query += ` AND (t.title ILIKE $${paramCount} OR t.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY t.created_at DESC`;

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
      `SELECT t.*, ${TASK_SUBTASK_COUNTS_SELECT}
       FROM tasks t
       ${TASK_SUBTASK_COUNTS_JOIN}
       WHERE t.id = $1 AND t.user_id = $2`,
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
       RETURNING *, ${TASK_SUBTASK_COUNTS_RETURNING}`,
      [userId, title, description, category, priority, due_date]
    );

    const created = result.rows[0];
    await logActivity(userId, 'task_created', created.id, { title: created.title });

    res.status(201).json(created);
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

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Read the current values so we can describe what actually changed.
    const previous = await pool.query(
      'SELECT title, status FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    const before = previous.rows[0];

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
      RETURNING *, ${TASK_SUBTASK_COUNTS_RETURNING}
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const updated = result.rows[0];

    // Owners editing their own task must still reach their collaborators.
    await notifyCollaborators(id, userId, 'shared-task-updated', { task: updated });

    const changedFields = [
      'title',
      'description',
      'category',
      'priority',
      'due_date',
      'status',
    ].filter((field) => req.body[field] !== undefined);

    if (status !== undefined && before && status !== before.status) {
      await logActivity(
        userId,
        status === 'done' ? 'task_completed' : 'task_moved',
        id,
        { title: updated.title, from: before.status, to: status }
      );
    } else {
      await logActivity(userId, 'task_updated', id, {
        title: updated.title,
        fields: changedFields,
      });
    }

    res.json(updated);
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

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await notifyCollaborators(id, userId, 'shared-task-deleted', { taskId: id });

    // task_id is deliberately null: activity_log cascades with the task, so
    // the entry keeps the title in its details instead of disappearing.
    await logActivity(userId, 'task_deleted', null, { title: result.rows[0].title });

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
      `SELECT t.*, ${TASK_SUBTASK_COUNTS_SELECT}
       FROM tasks t
       ${TASK_SUBTASK_COUNTS_JOIN}
       WHERE t.user_id = $1 
       AND t.due_date < NOW() 
       AND t.status != 'done'
       ORDER BY t.due_date ASC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    res.status(500).json({ error: 'Failed to fetch overdue tasks' });
  }
};
