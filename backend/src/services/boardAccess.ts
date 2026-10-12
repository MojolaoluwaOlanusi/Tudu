import pool from '../config/database';

export type BoardRole = 'admin' | 'member' | 'viewer';

const RANK: Record<BoardRole, number> = { viewer: 1, member: 2, admin: 3 };

export const roleAtLeast = (role: BoardRole | null, min: BoardRole): boolean =>
  role !== null && RANK[role] >= RANK[min];

/**
 * The user's role on a board, or null when they have no access.
 *
 * Phase 1.1b: a board belongs to the user who created it, who is its admin.
 * Phase 1.2 swaps this body for workspace-aware roles; no caller changes.
 */
export const getBoardRole = async (
  userId: string,
  boardId: string
): Promise<BoardRole | null> => {
  const result = await pool.query('SELECT 1 FROM boards WHERE id = $1 AND user_id = $2', [
    boardId,
    userId,
  ]);
  return result.rows.length > 0 ? 'admin' : null;
};

/** A column's board and stage, if `userId` has at least `min` access to that board. */
export const resolveColumn = async (
  userId: string,
  columnId: string,
  min: BoardRole = 'member'
): Promise<{ board_id: string; stage: string } | null> => {
  const column = await pool.query('SELECT board_id, stage FROM board_columns WHERE id = $1', [
    columnId,
  ]);
  if (column.rows.length === 0) return null;
  const role = await getBoardRole(userId, column.rows[0].board_id);
  return roleAtLeast(role, min) ? column.rows[0] : null;
};
