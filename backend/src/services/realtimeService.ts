import pool from '../config/database';
import { emitToUsers } from '../utils/socket';
import { SOCKET_EVENTS, type SocketTask } from '../types/socket';

/**
 * Real-time broadcasts for task changes.
 *
 * Lives in its own service because both the task controller and the shared-list
 * controller need it, and importing one from the other would create a cycle.
 */

/** Everyone this task is shared with, so their board updates in real time. */
export const collaboratorIds = async (
  taskId: string,
  ownerId: string
): Promise<string[]> => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT shared_with_user_id
       FROM shared_lists
       WHERE owner_id = $1 AND status = 'accepted' AND $2::uuid = ANY(task_ids)`,
      [ownerId, taskId]
    );
    return result.rows.map((row) => row.shared_with_user_id);
  } catch (error) {
    console.error('Error resolving collaborators:', error);
    return [];
  }
};

/**
 * Push a change to everyone this task is shared with, so a collaborator sees
 * edits made by the owner in real time (and vice versa).
 */
export const notifyCollaborators = async (
  taskId: string,
  ownerId: string,
  event: string,
  payload: unknown
): Promise<void> => {
  const ids = await collaboratorIds(taskId, ownerId);
  emitToUsers(ids, event, payload);
};

/**
 * Broadcast a task change to the owner *and* every collaborator.
 *
 * The owner is included deliberately: the event is how a user's other tabs stay
 * in sync. `actorId` lets a client recognise its own echo and skip the "syncing"
 * flash, while still applying the change.
 */
export const broadcastTask = async (
  event: string,
  actorId: string,
  task: SocketTask
): Promise<void> => {
  const ids = await collaboratorIds(task.id, task.user_id);
  emitToUsers([task.user_id, ...ids], event, { task, actorId });
};

/** Announce a deletion to the owner and collaborators (task row is already gone). */
export const broadcastTaskDeleted = async (
  taskId: string,
  ownerId: string,
  actorId: string
): Promise<void> => {
  const ids = await collaboratorIds(taskId, ownerId);
  emitToUsers([ownerId, ...ids], SOCKET_EVENTS.taskDelete, { taskId, actorId });
};