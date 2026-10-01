import { Request, Response } from 'express';
import pool from '../config/database';
import { CreateSubtaskInput, UpdateSubtaskInput } from '../types/task';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

/** Guard so a user can never touch another user's task or its sub-tasks. */
const taskBelongsToUser = async (taskId: string, userId: string): Promise<boolean> => {
  const result = await pool.query(
    'SELECT 1 FROM tasks WHERE id = $1 AND user_id = $2',
    [taskId, userId]
  );
  return result.rows.length > 0;
};

/**
 * Read access to a task's sub-tasks: the owner, or a collaborator on an
 * accepted share that contains the task. Collaborators may *view* sub-tasks,
 * but every mutation below still requires `taskBelongsToUser`, so they can
 * never change sub-tasks that belong to the owner.
 */
const canViewTask = async (taskId: string, userId: string): Promise<boolean> => {
  if (await taskBelongsToUser(taskId, userId)) return true;

  const shared = await pool.query(
    `SELECT 1 FROM shared_lists
     WHERE shared_with_user_id = $1
       AND status = 'accepted'
       AND $2::uuid = ANY(task_ids)`,
    [userId, taskId]
  );
  return shared.rows.length > 0;
};

const SUBTASK_COLUMNS = 'id, task_id, title, completed, created_at';

/** GET /api/tasks/:taskId/subtasks */
export const getSubtasks = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { taskId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidUuid(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }
    if (!(await canViewTask(taskId, userId))) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Open sub-tasks first, then oldest first.
    const result = await pool.query(
      `SELECT ${SUBTASK_COLUMNS}
       FROM subtasks
       WHERE task_id = $1
       ORDER BY completed ASC, created_at ASC`,
      [taskId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subtasks:', error);
    res.status(500).json({ error: 'Failed to fetch subtasks' });
  }
};

/** POST /api/tasks/:taskId/subtasks */
export const createSubtask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { taskId } = req.params;
    const { title, completed }: CreateSubtaskInput = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidUuid(taskId)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!(await taskBelongsToUser(taskId, userId))) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await pool.query(
      `INSERT INTO subtasks (task_id, title, completed)
       VALUES ($1, $2, $3)
       RETURNING ${SUBTASK_COLUMNS}`,
      [taskId, title.trim(), completed ?? false]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating subtask:', error);
    res.status(500).json({ error: 'Failed to create subtask' });
  }
};

/** PATCH /api/tasks/:taskId/subtasks/:subtaskId */
export const updateSubtask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { taskId, subtaskId } = req.params;
    const { title, completed }: UpdateSubtaskInput = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidUuid(taskId) || !isValidUuid(subtaskId)) {
      return res.status(400).json({ error: 'Invalid task or subtask id' });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    if (title !== undefined) {
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      paramCount++;
      updates.push(`title = $${paramCount}`);
      values.push(title.trim());
    }

    if (completed !== undefined) {
      paramCount++;
      updates.push(`completed = $${paramCount}`);
      values.push(Boolean(completed));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    paramCount++;
    values.push(subtaskId);
    paramCount++;
    values.push(taskId);
    paramCount++;
    values.push(userId);

    const result = await pool.query(
      `UPDATE subtasks
       SET ${updates.join(', ')}
       WHERE id = $${paramCount - 2}
         AND task_id = $${paramCount - 1}
         AND EXISTS (
           SELECT 1 FROM tasks t
           WHERE t.id = subtasks.task_id AND t.user_id = $${paramCount}
         )
       RETURNING ${SUBTASK_COLUMNS}`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating subtask:', error);
    res.status(500).json({ error: 'Failed to update subtask' });
  }
};

/** DELETE /api/tasks/:taskId/subtasks/:subtaskId */
export const deleteSubtask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { taskId, subtaskId } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidUuid(taskId) || !isValidUuid(subtaskId)) {
      return res.status(400).json({ error: 'Invalid task or subtask id' });
    }

    const result = await pool.query(
      `DELETE FROM subtasks
       WHERE id = $1
         AND task_id = $2
         AND EXISTS (
           SELECT 1 FROM tasks t
           WHERE t.id = subtasks.task_id AND t.user_id = $3
         )
       RETURNING id`,
      [subtaskId, taskId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Subtask not found' });
    }

    res.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    console.error('Error deleting subtask:', error);
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
};
