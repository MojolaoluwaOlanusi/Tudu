import { Request, Response } from 'express';
import pool from '../config/database';
import { emitToUser } from '../utils/socket';
import {
  SharePermission,
  ShareStatus,
  SharedList,
  CreateShareInput,
} from '../types/share';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_SHARED_TASKS = 100;

const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);
const isValidEmail = (value: unknown): value is string =>
  typeof value === 'string' && EMAIL_RE.test(value.trim());
const isValidPermission = (value: unknown): value is SharePermission =>
  value === 'read' || value === 'read_write';

/** Every share row joined to both users' public profiles. */
const SHARE_WITH_USERS_SQL = `
  SELECT sl.*,
         o.name AS owner_name, o.email AS owner_email, o.avatar_url AS owner_avatar,
         s.name AS shared_name, s.email AS shared_email, s.avatar_url AS shared_avatar
  FROM shared_lists sl
  JOIN users o ON o.id = sl.owner_id
  JOIN users s ON s.id = sl.shared_with_user_id
`;

const toSharedList = (row: any): SharedList => ({
  id: row.id,
  owner_id: row.owner_id,
  shared_with_user_id: row.shared_with_user_id,
  task_ids: row.task_ids || [],
  permissions: row.permissions,
  status: row.status,
  created_at: row.created_at,
  owner: { id: row.owner_id, name: row.owner_name, email: row.owner_email, avatar_url: row.owner_avatar },
  shared_with: {
    id: row.shared_with_user_id,
    name: row.shared_name,
    email: row.shared_email,
    avatar_url: row.shared_avatar,
  },
  task_count: row.task_count ?? 0,
  tasks_completed: row.tasks_completed ?? 0,
});

/** GET /api/users/lookup?email=... */
export const lookupUser = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const email = typeof req.query.email === 'string' ? req.query.email.trim().toLowerCase() : '';

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }

    const result = await pool.query(
      'SELECT id, name, email, avatar_url FROM users WHERE LOWER(email) = $1',
      [email]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No user found with that email' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error looking up user:', error);
    res.status(500).json({ error: 'Failed to look up user' });
  }
};

/** POST /api/share */
export const createShare = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { email, taskIds, permissions }: CreateShareInput = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'A valid email is required' });
    }
    if (permissions !== undefined && !isValidPermission(permissions)) {
      return res.status(400).json({ error: 'Permission must be read or read_write' });
    }
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one task to share' });
    }
    if (taskIds.length > MAX_SHARED_TASKS) {
      return res.status(400).json({ error: `Too many tasks (max ${MAX_SHARED_TASKS})` });
    }
    if (!taskIds.every(isValidUuid)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }

    const permission: SharePermission = permissions || 'read_write';
    const uniqueTaskIds = Array.from(new Set(taskIds));

    const target = await pool.query(
      'SELECT id, name, email, avatar_url FROM users WHERE LOWER(email) = $1',
      [email.trim().toLowerCase()]
    );
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'No user found with that email' });
    }
    const recipient = target.rows[0];
    if (recipient.id === userId) {
      return res.status(400).json({ error: 'You cannot share a list with yourself' });
    }

    const owned = await pool.query(
      'SELECT id FROM tasks WHERE id = ANY($1::uuid[]) AND user_id = $2',
      [uniqueTaskIds, userId]
    );
    if (owned.rows.length !== uniqueTaskIds.length) {
      return res.status(404).json({ error: 'One or more tasks were not found' });
    }

    // Re-sharing to the same person refreshes the invitation (the table has
    // no unique constraint to upsert on).
    const existing = await pool.query(
      'SELECT id FROM shared_lists WHERE owner_id = $1 AND shared_with_user_id = $2 LIMIT 1',
      [userId, recipient.id]
    );

    let saved;
    if (existing.rows.length > 0) {
      const updated = await pool.query(
        `UPDATE shared_lists
         SET task_ids = $1::uuid[], permissions = $2, status = 'pending', created_at = NOW()
         WHERE id = $3 RETURNING *`,
        [uniqueTaskIds, permission, existing.rows[0].id]
      );
      saved = updated.rows[0];
    } else {
      const created = await pool.query(
        `INSERT INTO shared_lists (owner_id, shared_with_user_id, task_ids, permissions, status)
         VALUES ($1, $2, $3::uuid[], $4, 'pending') RETURNING *`,
        [userId, recipient.id, uniqueTaskIds, permission]
      );
      saved = created.rows[0];
    }

    emitToUser(recipient.id, 'share-invited', {
      shareId: saved.id,
      from: { id: userId },
      taskCount: uniqueTaskIds.length,
    });

    res.status(201).json({ ...saved, shared_with: recipient });
  } catch (error) {
    console.error('Error creating share:', error);
    res.status(500).json({ error: 'Failed to create share' });
  }
};

const isValidTaskStatus = (value: unknown): value is 'todo' | 'doing' | 'done' =>
  value === 'todo' || value === 'doing' || value === 'done';

/** Accept or decline an invitation. Only the recipient may respond. */
const respondToShare = async (req: Request, res: Response, status: ShareStatus) => {
  try {
    const userId = req.user?.userId;
    const { sharedListId } = req.body as { sharedListId?: unknown };

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidUuid(sharedListId)) {
      return res.status(400).json({ error: 'sharedListId is required' });
    }

    const result = await pool.query(
      `UPDATE shared_lists SET status = $1
       WHERE id = $2 AND shared_with_user_id = $3
       RETURNING id, owner_id, shared_with_user_id, task_ids, permissions, status, created_at`,
      [status, sharedListId, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    const row = result.rows[0];
    emitToUser(row.owner_id, `share-${status}`, { shareId: row.id, by: { id: userId } });
    emitToUser(userId, 'shared-lists-changed', { shareId: row.id });

    res.json(row);
  } catch (error) {
    console.error('Error responding to share:', error);
    res.status(500).json({ error: 'Failed to update the invitation' });
  }
};

/** POST /api/share/accept */
export const acceptShare = (req: Request, res: Response) =>
  respondToShare(req, res, 'accepted');

/** POST /api/share/decline */
export const declineShare = (req: Request, res: Response) =>
  respondToShare(req, res, 'declined');

/** GET /api/share - lists I have shared with other people. */
export const getMyShares = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await pool.query(
      `${SHARE_WITH_USERS_SQL}
       WHERE sl.owner_id = $1
       ORDER BY sl.created_at DESC`,
      [userId]
    );

    res.json(result.rows.map(toSharedList));
  } catch (error) {
    console.error('Error fetching my shares:', error);
    res.status(500).json({ error: 'Failed to fetch shares' });
  }
};

/** GET /api/shared-lists - lists other people shared with me (pending + accepted). */
export const getSharedWithMe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Pending invitations must be returned too, otherwise the recipient has
    // no way to accept or decline them. `?status=` narrows the result.
    const requested = typeof req.query.status === 'string' ? req.query.status : '';
    const statuses: ShareStatus[] =
      requested === 'pending' || requested === 'accepted'
        ? [requested]
        : ['pending', 'accepted'];

    const result = await pool.query(
      `SELECT sl.*,
              o.name AS owner_name, o.email AS owner_email, o.avatar_url AS owner_avatar,
              s.name AS shared_name, s.email AS shared_email, s.avatar_url AS shared_avatar,
              COALESCE(cardinality(sl.task_ids), 0)::int AS task_count,
              COALESCE((
                SELECT COUNT(*)::int FROM tasks t
                WHERE t.id = ANY(sl.task_ids) AND t.user_id = sl.owner_id AND t.status = 'done'
              ), 0) AS tasks_completed
       FROM shared_lists sl
       JOIN users o ON o.id = sl.owner_id
       JOIN users s ON s.id = sl.shared_with_user_id
       WHERE sl.shared_with_user_id = $1 AND sl.status = ANY($2::varchar[])
       ORDER BY (sl.status = 'pending') DESC, sl.created_at DESC`,
      [userId, statuses]
    );

    res.json(result.rows.map(toSharedList));
  } catch (error) {
    console.error('Error fetching shared lists:', error);
    res.status(500).json({ error: 'Failed to fetch shared lists' });
  }
};

/** GET /api/shared-lists/:id */
export const getSharedList = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidUuid(id)) {
      return res.status(400).json({ error: 'Invalid share id' });
    }

    const share = await pool.query(
      `${SHARE_WITH_USERS_SQL}
       WHERE sl.id = $1 AND (sl.owner_id = $2 OR sl.shared_with_user_id = $2)`,
      [id, userId]
    );
    if (share.rows.length === 0) {
      return res.status(404).json({ error: 'Shared list not found' });
    }

    const row = share.rows[0];
    const taskIds = row.task_ids || [];
    // Tasks always belong to the owner of the shared list. The join adds the
    // sub-task totals so shared cards look exactly like the owner's own.
    const tasks = taskIds.length
      ? await pool.query(
          `SELECT t.*,
                  COALESCE(sub.total, 0)::int AS subtask_count,
                  COALESCE(sub.done, 0)::int AS subtasks_completed
           FROM tasks t
           LEFT JOIN (
             SELECT task_id, COUNT(*) AS total, COUNT(*) FILTER (WHERE completed) AS done
             FROM subtasks GROUP BY task_id
           ) sub ON sub.task_id = t.id
           WHERE t.id = ANY($1::uuid[]) AND t.user_id = $2
           ORDER BY t.created_at DESC`,
          [taskIds, row.owner_id]
        )
      : { rows: [] as any[] };

    res.json({ ...toSharedList(row), tasks: tasks.rows });
  } catch (error) {
    console.error('Error fetching shared list:', error);
    res.status(500).json({ error: 'Failed to fetch shared list' });
  }
};

/** DELETE /api/shared-lists/:id - recipient removes it, owner revokes it. */
export const removeSharedList = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidUuid(id)) {
      return res.status(400).json({ error: 'Invalid share id' });
    }

    const result = await pool.query(
      `DELETE FROM shared_lists
       WHERE id = $1 AND (owner_id = $2 OR shared_with_user_id = $2)
       RETURNING id, owner_id, shared_with_user_id`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Shared list not found' });
    }

    const row = result.rows[0];
    emitToUser(row.owner_id, 'share-removed', { shareId: row.id, by: { id: userId } });
    emitToUser(row.shared_with_user_id, 'share-removed', {
      shareId: row.id,
      by: { id: userId },
    });

    res.json({ message: 'Share removed' });
  } catch (error) {
    console.error('Error removing share:', error);
    res.status(500).json({ error: 'Failed to remove share' });
  }
};

/** PATCH /api/shared-lists/:id/tasks/:taskId - requires the 'read_write' permission. */
export const updateSharedTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id, taskId } = req.params;
    const body = (req.body ?? {}) as Record<string, unknown>;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!isValidUuid(id) || !isValidUuid(taskId)) {
      return res.status(400).json({ error: 'Invalid share or task id' });
    }

    const share = await pool.query(
      `SELECT id, owner_id, task_ids, permissions, status
       FROM shared_lists
       WHERE id = $1 AND shared_with_user_id = $2`,
      [id, userId]
    );
    if (share.rows.length === 0) {
      return res.status(404).json({ error: 'Shared list not found' });
    }
    const row = share.rows[0];

    // Permission check: viewers may look but not change anything.
    if (row.permissions !== 'read_write') {
      return res.status(403).json({ error: 'You have read-only access to this list' });
    }
    if (!(row.task_ids || []).includes(taskId)) {
      return res
        .status(404)
        .json({ error: 'That task is not part of this shared list' });
    }

    // Collaborators may edit the same fields the owner can.
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 0;

    const push = (column: string, value: unknown) => {
      paramCount++;
      updates.push(`${column} = $${paramCount}`);
      values.push(value);
    };

    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || !body.title.trim()) {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      push('title', body.title.trim());
    }
    if (body.description !== undefined) {
      push('description', body.description || null);
    }
    if (body.category !== undefined) {
      push('category', body.category || null);
    }
    if (body.priority !== undefined) {
      push('priority', body.priority || null);
    }
    if (body.due_date !== undefined) {
      push('due_date', body.due_date || null);
    }
    if (body.status !== undefined) {
      if (!isValidTaskStatus(body.status)) {
        return res.status(400).json({ error: 'Status must be todo, doing or done' });
      }
      push('status', body.status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    paramCount++;
    values.push(taskId);
    paramCount++;
    values.push(row.owner_id);

    const updated = await pool.query(
      `UPDATE tasks SET ${updates.join(', ')}
       WHERE id = $${paramCount - 1} AND user_id = $${paramCount}
       RETURNING *`,
      values
    );
    if (updated.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    emitToUser(row.owner_id, 'shared-task-updated', {
      shareId: row.id,
      task: updated.rows[0],
    });

    res.json(updated.rows[0]);
  } catch (error) {
    console.error('Error updating shared task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};