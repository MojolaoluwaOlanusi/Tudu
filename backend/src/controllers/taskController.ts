import { Request, Response } from 'express';
import pool from '../config/database';
import { logActivity } from '../services/activityService';
// Aliased: the controller handler below shares its name with the service.
import { parseTaskText as parseNaturalLanguage } from '../services/nlpService';
import {
  broadcastTask,
  broadcastTaskDeleted,
  notifyCollaborators,
} from '../services/realtimeService';
import { CreateTaskInput, UpdateTaskInput, TaskFilters, Status } from '../types/task';
import { SOCKET_EVENTS } from '../types/socket';

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


/**
 * Workflow: assign a task to a user (for team boards).
 * POST /api/tasks/:id/assign
 */
export const assignTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { assigneeId }: { assigneeId?: unknown } = req.body ?? {};

    if (!assigneeId || typeof assigneeId !== 'string') {
      return res.status(400).json({ error: 'assigneeId is required' });
    }

    const task = await pool.query(
      `SELECT id, user_id, title, board_id FROM tasks WHERE id = $1`,
      [id]
    );
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const board = await pool.query(
      `SELECT b.workspace_id FROM boards b WHERE b.id = $1 AND b.user_id = $2`,
      [id, userId]
    );
    if (board.rows.length === 0) return res.status(403).json({ error: 'Task does not belong to your boards' });

    const workspace = await pool.query(
      `SELECT id FROM workspaces WHERE id = $1`,
      [board.rows[0].workspace_id]
    );
    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Board workspace not found' });
    }

    const member = await pool.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspace.rows[0].id, assigneeId]
    );
    if (member.rows.length === 0) {
      return res.status(403).json({ error: 'Assignee is not a member of this workspace' });
    }

    await pool.query(
      'UPDATE tasks SET assignee_id = $1 WHERE id = $2 AND user_id = $3',
      [assigneeId, id, userId]
    );

    res.json({ message: 'Task assigned', task: { id, assignee_id: assigneeId } });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Failed to assign task' });
  }
};

/**
 * Workflow: assign a task to a user (for team boards).
 * POST /api/tasks/:id/assign
 */
export const assignTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { assigneeId }: { assigneeId?: unknown } = req.body ?? {};

    if (!assigneeId || typeof assigneeId !== 'string') {
      return res.status(400).json({ error: 'assigneeId is required' });
    }

    const task = await pool.query(
      `SELECT id, user_id, title, board_id FROM tasks WHERE id = $1`,
      [id]
    );
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    const board = await pool.query(
      `SELECT b.workspace_id FROM boards b WHERE b.id = $1 AND b.user_id = $2`,
      [id, userId]
    );
    if (board.rows.length === 0) return res.status(403).json({ error: 'Task does not belong to your boards' });

    const workspace = await pool.query(
      `SELECT id FROM workspaces WHERE id = $1`,
      [board.rows[0].workspace_id]
    );
    if (workspace.rows.length === 0) {
      return res.status(404).json({ error: 'Board workspace not found' });
    }

    const member = await pool.query(
      `SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [workspace.rows[0].id, assigneeId]
    );
    if (member.rows.length === 0) {
      return res.status(403).json({ error: 'Assignee is not a member of this workspace' });
    }

    await pool.query(
      'UPDATE tasks SET assignee_id = $1 WHERE id = $2 AND user_id = $3',
      [assigneeId, id, userId]
    );

    res.json({ message: 'Task assigned', task: { id, assignee_id: assigneeId } });
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Failed to assign task' });
  }
};

  }
};

export const MAX_PARSE_LENGTH = 500;

/**
 * POST /api/tasks/parse
 * Preview how a natural-language sentence will be turned into task fields.
 * Read-only: it never creates anything.
 */
export const parseTaskText = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { text, now, timezoneOffset } = req.body as {
      text?: unknown;
      now?: unknown;
      timezoneOffset?: unknown;
    };

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }
    if (text.length > MAX_PARSE_LENGTH) {
      return res
        .status(400)
        .json({ error: `text must be ${MAX_PARSE_LENGTH} characters or fewer` });
    }

    // The client sends its own clock so "tomorrow" means tomorrow where the
    // user is, not where this server happens to run.
    let reference: Date | undefined;
    if (typeof now === 'string') {
      const parsed = new Date(now);
      if (!Number.isNaN(parsed.getTime())) reference = parsed;
    }

    const offset =
      typeof timezoneOffset === 'number' && Number.isFinite(timezoneOffset)
        ? Math.max(-840, Math.min(840, Math.trunc(timezoneOffset)))
        : 0;

    res.json(parseNaturalLanguage(text, { now: reference, timezoneOffset: offset }));
  } catch (error) {
    console.error('Error parsing task text:', error);
    res.status(500).json({ error: 'Failed to parse task text' });
  }
};

export const createTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { description, naturalLanguage } = req.body as Partial<CreateTaskInput> & {
      naturalLanguage?: boolean;
    };
    let { title, category, priority, due_date } = req.body as CreateTaskInput;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Fill in only what the caller left blank, so an explicit choice always
    // wins. Opt out with `naturalLanguage: false` to keep the title verbatim.
    if (naturalLanguage !== false) {
      const parsed = parseNaturalLanguage(title);
      title = parsed.title || title.trim();
      category = category ?? parsed.category ?? undefined;
      priority = priority ?? parsed.priority ?? undefined;
      due_date = due_date ?? parsed.dueDate ?? undefined;
    }

    const result = await pool.query(
      `INSERT INTO tasks (user_id, title, description, category, priority, due_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *, ${TASK_SUBTASK_COUNTS_RETURNING}`,
      [userId, title, description, category, priority, due_date]
    );

    const created = result.rows[0];
    await logActivity(userId, 'task_created', created.id, { title: created.title });
    await broadcastTask(SOCKET_EVENTS.taskCreate, userId, created);

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

    if (status !== undefined && before) {
      await logStatusChange(userId, id, updated.title, before.status, status);
    } else {
      await logActivity(userId, 'task_updated', id, {
        title: updated.title,
        fields: changedFields,
      });
    }

    await broadcastTask(SOCKET_EVENTS.taskUpdate, userId, updated);

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
 * Record a status change, distinguishing "finished this task" from
 * "moved it along the board".
 */
async function logStatusChange(
  userId: string,
  taskId: string,
  title: string,
  from: string,
  to: string
): Promise<void> {
  if (from === to) return;
  await logActivity(
    userId,
    to === 'done' ? 'task_completed' : 'task_moved',
    taskId,
    { title, from, to }
  );
}

/**
 * Resolves an explicit destination column into the stage it represents,
 * proving ownership through its board. Null when it does not exist or the
 * caller does not own it.
 */
const columnStageForUser = async (columnId: string, userId: string): Promise<Status | null> => {
  const result = await pool.query(
    `SELECT bc.stage
     FROM board_columns bc
     JOIN boards b ON b.id = bc.board_id
     WHERE bc.id = $1 AND b.user_id = $2`,
    [columnId, userId]
  );
  return result.rows.length > 0 ? (result.rows[0].stage as Status) : null;
};

/**
 * Keeps `column_id` and `status` pointing at the same place.
 *
 * * `column_id = $2` when an explicit destination column was supplied;
 * * otherwise the card stays put if its current column already carries that
 *   stage, so a status-only caller cannot shuffle cards between two
 *   "doing" columns;
 * * otherwise it falls back to the first column on its board with that stage,
 *   and to whatever it already was if the board has none.
 *
 * The final `COALESCE(..., t.column_id)` is what leaves tasks that predate
 * this phase - `board_id` still NULL - behaving exactly as they did before.
 */
const MOVE_COLUMN_SQL = `
    column_id = CASE
      WHEN $2::uuid IS NOT NULL THEN $2::uuid
      WHEN EXISTS (
        SELECT 1 FROM board_columns bc WHERE bc.id = t.column_id AND bc.stage = $1::text
      ) THEN t.column_id
      ELSE COALESCE(
        (SELECT b2.id FROM board_columns b2
         WHERE b2.board_id = t.board_id AND b2.stage = $1::text
         ORDER BY b2.position ASC LIMIT 1),
        t.column_id
      )
    END`;

/**
 * PATCH /api/tasks/:id/status
 * Move a single task to another column (drag & drop on the Kanban board).
 *
 * Accepts a destination `column_id`, a bare `status`, or both. When both are
 * present the column wins: `status` is read from the column's stage, so a card
 * can never sit in a "Done" column while still reporting `doing`.
 */
export const updateTaskStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status, column_id } = req.body as { status?: unknown; column_id?: unknown };

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let targetStatus: unknown = status;
    let targetColumn: string | null = null;

    if (column_id !== undefined && column_id !== null && column_id !== '') {
      if (!isValidUuid(column_id)) {
        return res.status(400).json({ error: 'Invalid column id' });
      }
      const stage = await columnStageForUser(column_id, userId);
      if (!stage) {
        return res.status(404).json({ error: 'Column not found' });
      }
      targetStatus = stage;
      targetColumn = column_id;
    }

    if (!isValidStatus(targetStatus)) {
      return res
        .status(400)
        .json({ error: 'Status must be one of: todo, doing, done' });
    }

    const before = await pool.query(
      'SELECT id, title, status FROM tasks WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (before.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const result = await pool.query(
      `UPDATE tasks t
       SET status = $1::text,
       ${MOVE_COLUMN_SQL},
           updated_at = NOW()
       WHERE t.id = $3 AND t.user_id = $4
       RETURNING *`,
      [targetStatus, targetColumn, id, userId]
    );

    const task = result.rows[0];

    await logStatusChange(userId, task.id, task.title, before.rows[0].status, targetStatus as string);

    // A drag on a shared board must reach collaborators, same as an edit.
    await notifyCollaborators(id, userId, 'shared-task-updated', { task });

    await broadcastTask(SOCKET_EVENTS.taskMove, userId, task);

    res.json(task);
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
    // A null entry means "no explicit destination" - the SQL below then leaves
    // the card in place if its column already has the right stage.
    const columnIds: (string | null)[] = [];

    for (const update of updates as {
      id?: unknown;
      status?: unknown;
      column_id?: unknown;
    }[]) {
      if (!update || typeof update !== 'object') {
        return res.status(400).json({ error: 'Each update must be an object' });
      }
      if (!isValidUuid(update.id)) {
        return res.status(400).json({ error: 'Each update requires a valid task id' });
      }

      let status: unknown = update.status;
      let columnId: string | null = null;

      if (update.column_id !== undefined && update.column_id !== null && update.column_id !== '') {
        if (!isValidUuid(update.column_id)) {
          return res.status(400).json({ error: 'Each update requires a valid column id' });
        }
        const stage = await columnStageForUser(update.column_id, userId);
        if (!stage) {
          return res.status(404).json({ error: 'Column not found' });
        }
        status = stage;
        columnId = update.column_id;
      }

      if (!isValidStatus(status)) {
        return res.status(400).json({ error: 'Each update requires a valid status' });
      }
      ids.push(update.id);
      statuses.push(status);
      columnIds.push(columnId);
    }

    const before = await pool.query(
      'SELECT id, status FROM tasks WHERE id = ANY($1::uuid[]) AND user_id = $2',
      [ids, userId]
    );

    const result = await pool.query(
      `UPDATE tasks t
       SET status = v.status,
           column_id = CASE
             WHEN v.column_id IS NOT NULL THEN v.column_id
             WHEN EXISTS (
               SELECT 1 FROM board_columns bc
               WHERE bc.id = t.column_id AND bc.stage = v.status
             ) THEN t.column_id
             ELSE COALESCE(
               (SELECT b2.id FROM board_columns b2
                WHERE b2.board_id = t.board_id AND b2.stage = v.status
                ORDER BY b2.position ASC LIMIT 1),
               t.column_id
             )
           END,
           updated_at = NOW()
       FROM unnest($1::uuid[], $2::text[], $3::uuid[]) AS v(id, status, column_id)
       WHERE t.id = v.id AND t.user_id = $4
       RETURNING t.*`,
      [ids, statuses, columnIds, userId]
    );

    // A short result means one of the tasks does not belong to this user.
    if (result.rows.length !== ids.length) {
      return res.status(404).json({ error: 'One or more tasks were not found' });
    }

    const previous = new Map(before.rows.map((r: { id: string; status: string }) => [r.id, r.status]));

    for (const task of result.rows) {
      await logStatusChange(
        userId,
        task.id,
        task.title,
        previous.get(task.id) as string,
        task.status
      );
      await notifyCollaborators(task.id, userId, 'shared-task-updated', { task });
      await broadcastTask(SOCKET_EVENTS.taskMove, userId, task);
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
    await broadcastTaskDeleted(id, result.rows[0].user_id, userId);

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
