import { Request, Response } from 'express';
import pool from '../config/database';
import { logActivity } from '../services/activityService';
import { broadcastTask } from '../services/realtimeService';
import { getBoardRole, roleAtLeast, taskEditableSql } from '../services/boardAccess';
import { SOCKET_EVENTS } from '../types/socket';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

/** PATCH /api/tasks/:id/assignee - body: { assignee_id: string | null } */
export const assignTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { assignee_id } = (req.body ?? {}) as { assignee_id?: unknown };

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid task id' });
    if (assignee_id !== null && !isValidUuid(assignee_id)) {
      return res.status(400).json({ error: 'assignee_id must be a user id or null' });
    }

    const task = await pool.query(
      `SELECT t.id, t.title, t.board_id FROM tasks t
       WHERE t.id = $1 AND ${taskEditableSql('$2')}`,
      [id, userId]
    );
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    if (assignee_id !== null) {
      const boardId = task.rows[0].board_id;
      if (!boardId || !roleAtLeast(await getBoardRole(assignee_id, boardId), 'member')) {
        return res
          .status(400)
          .json({ error: 'The assignee must be a member of the board this task is on' });
      }
    }

    const result = await pool.query(
      'UPDATE tasks SET assignee_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [assignee_id, id]
    );

    await logActivity(userId, 'task_updated', id, {
      title: task.rows[0].title,
      fields: ['assignee'],
    });
    await broadcastTask(SOCKET_EVENTS.taskUpdate, userId, result.rows[0]);

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Failed to assign the task' });
  }
};
