import pool from '../config/database';
import { ActivityAction, ActivityDetails } from '../types/activity';

/**
 * Append an entry to the activity feed.
 *
 * Never throws: a failure to log must never break the action that caused it.
 */
export const logActivity = async (
  userId: string,
  action: ActivityAction,
  taskId: string | null,
  details: ActivityDetails = {}
): Promise<void> => {
  try {
    await pool.query(
      `INSERT INTO activity_log (user_id, task_id, action, details)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [userId, taskId, action, JSON.stringify(details)]
    );
  } catch (error) {
    console.error('Error writing activity log:', error);
  }
};