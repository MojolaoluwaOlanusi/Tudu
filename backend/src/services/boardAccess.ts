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
  const result = await pool.query('SELECT get_board_role($1, $2) AS role', [userId, boardId]);
  return (result.rows[0]?.role as BoardRole | null) ?? null;
};

/** The user's role in a workspace (accepted members only), or null. */
export const getWorkspaceRole = async (
  userId: string,
  workspaceId: string
): Promise<BoardRole | null> => {
  const result = await pool.query(
    `SELECT role FROM workspace_members
     WHERE workspace_id = $1 AND user_id = $2 AND status = 'accepted'`,
    [workspaceId, userId]
  );
  return (result.rows[0]?.role as BoardRole | undefined) ?? null;
};

/**
 * SQL conditions for task queries. `userParam` is the placeholder holding the
 * caller's id (e.g. '$1'); `alias` is the tasks table alias in that query.
 *
 * A task with no board is private to its creator; a task on a board is
 * governed by the caller's role on that board.
 */
export const taskVisibleSql = (userParam: string, alias = 't'): string =>
  `((${alias}.board_id IS NULL AND ${alias}.user_id = ${userParam}) ` +
  `OR get_board_role(${userParam}, ${alias}.board_id) IS NOT NULL)`;

export const taskEditableSql = (userParam: string, alias = 't'): string =>
  `((${alias}.board_id IS NULL AND ${alias}.user_id = ${userParam}) ` +
  `OR get_board_role(${userParam}, ${alias}.board_id) IN ('admin', 'member'))`;

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
