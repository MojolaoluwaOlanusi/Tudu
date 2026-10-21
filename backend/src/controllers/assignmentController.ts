import { Request, Response } from 'express';
import pool from '../config/database';
import { logActivity } from '../services/activityService';
import { broadcastTask } from '../services/realtimeService';
import { getBoardRole, roleAtLeast, taskEditableSql } from '../services/boardAccess';
import { SOCKET_EVENTS } from '../types/socket';
import { notifyAssignment } from '../services/slackService';
import { triggerWebhooks } from '../services/webhookService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

/** PATCH /api/tasks/:id/assignee - body: { assignee_id: string | null } */
export const assignTask = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const rawAssignee = (req.body ?? {}).assignee_id;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid task id' });

    // `null` explicitly means "unassign"; anything else must be a real UUID.
    // `undefined` is treated as "unassign" too, so a missing field is not a 400.
    if (rawAssignee !== null && rawAssignee !== undefined && !isValidUuid(rawAssignee)) {
      return res.status(400).json({ error: 'assignee_id must be a user id or null' });
    }
    // Explicitly typed so TypeScript knows this is string | null from here on.
    const assigneeId: string | null = (rawAssignee as string | null | undefined) ?? null;

    const task = await pool.query(
      `SELECT t.id, t.title, t.board_id FROM tasks t
       WHERE t.id = $1 AND ${taskEditableSql('$2')}`,
      [id, userId]
    );
    if (task.rows.length === 0) return res.status(404).json({ error: 'Task not found' });

    if (assigneeId !== null) {
      const boardId = task.rows[0].board_id as string | null;
      if (!boardId || !roleAtLeast(await getBoardRole(assigneeId, boardId), 'member')) {
        return res
          .status(400)
          .json({ error: 'The assignee must be a member of the board this task is on' });
      }
    }

    const result = await pool.query(
      'UPDATE tasks SET assignee_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [assigneeId, id]
    );

    await logActivity(userId, 'task_updated', id, {
      title: task.rows[0].title,
      fields: ['assignee'],
    });
    await broadcastTask(SOCKET_EVENTS.taskUpdate, userId, result.rows[0]);
    await triggerWebhooks(userId, 'task.updated', { task: result.rows[0] });

    // Tell the assignee on Slack, if they have an integration installed.
    // Fire-and-forget: a Slack hiccup must never fail the assignment.
    if (assigneeId) {
      await notifyAssignment(assigneeId, result.rows[0]);
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error assigning task:', error);
    res.status(500).json({ error: 'Failed to assign the task' });
  }
};