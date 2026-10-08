import { Request, Response } from 'express';
import pool from '../config/database';
import { TeamRole, TEAM_ROLES } from '../types/board';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Workflow: create a workspace (owner = admin).
 */
export const createWorkspace = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { name }: { name?: unknown } = req.body ?? {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Workspace name is required' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const workspace = await client.query(
        `INSERT INTO workspaces (owner_id, name) VALUES ($1, $2) RETURNING id, owner_id, name, created_at, updated_at`,
        [userId, name.trim()]
      );

      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, 'admin')`,
        [workspace.rows[0].id, userId]
      );

      await client.query('COMMIT');
      res.status(201).json(workspace.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating workspace:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
};

/**
 * Workflow: list workspaces the user belongs to (admin, member, viewer).
 */
export const listWorkspaces = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT w.id, w.owner_id, w.name, w.created_at, w.updated_at,
              COALESCE(wm.role, 'viewer') AS my_role,
              (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id) AS member_count
       FROM workspaces w
       LEFT JOIN workspace_members wm ON wm.workspace_id = w.id AND wm.user_id = $1
       WHERE w.owner_id = $1 OR wm.user_id = $1
       ORDER BY w.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing workspaces:', error);
    res.status(500).json({ error: 'Failed to list workspaces' });
  }
};

/**
 * Workflow: invite a member to a workspace.
 */
export const inviteToWorkspace = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { email, role }: { email?: unknown; role?: unknown } = req.body ?? {};

    if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: 'Valid email is required' });
    }
    if (!role || !TEAM_ROLES.includes(role as TeamRole)) {
      return res.status(400).json({ error: 'Role must be admin, member, or viewer' });
    }

    const workspace = await pool.query(
      'SELECT id, owner_id FROM workspaces WHERE id = $1',
      [id]
    );
    if (workspace.rows.length === 0) return res.status(404).json({ error: 'Workspace not found' });

    const boardRole = await boardRoleForUser(id, userId);
    if (workspace.rows[0].owner_id !== userId && boardRole !== 'admin') {
      return res.status(403).json({ error: 'Only workspace admins can invite members' });
    }

    const existing = await pool.query(

/**
 * Workflow: update a member's role in a workspace.
 */
export const setMemberRole = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params;
    const { role }: { role?: unknown } = req.body ?? {};

    if (!role || !TEAM_ROLES.includes(role as TeamRole)) {
      return res.status(400).json({ error: 'Role must be admin, member, or viewer' });
    }

    const member = await pool.query(
      `SELECT workspace_id, user_id, role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (member.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    if (member.rows[0].role === 'admin' && role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can demote another admin' });
    }

    await pool.query(
      `UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3`,
      [role, id, userId]
    );

    res.json({ message: 'Role updated' });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update member role' });
  }
};

/**
 * Workflow: remove a member from a workspace.
 */
export const removeMember = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id, memberId } = req.params;

    const member = await pool.query(
      `SELECT workspace_id, role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (member.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    if (member.rows[0].role === 'admin' && member.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Only admins can remove members' });
    }

    await pool.query(
      `DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2`,
      [id, memberId]
    );

    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
};

/**
 * A caller's effective role on a board.
 * The owner is always admin. Otherwise a board-level membership row wins;
 * only when there is none do we fall back to the workspace row (if the board
 * lives in a workspace). Returns null when the caller has no relationship.
 */
const boardRoleForUser = async (boardId: string, userId: string): Promise<TeamRole | null> => {
  const board = await pool.query('SELECT user_id, workspace_id FROM boards WHERE id = $1', [
    boardId,
  ]);
  if (board.rows.length === 0) return null;
  if (board.rows[0].user_id === userId) return 'admin';

  const direct = await pool.query(
    'SELECT role FROM board_members WHERE board_id = $1 AND user_id = $2',
    [boardId, userId]
  );
  if (direct.rows.length > 0) return direct.rows[0].role as TeamRole;

  if (board.rows[0].workspace_id) {
    const viaWorkspace = await pool.query(
      'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [board.rows[0].workspace_id, userId]
    );
    if (viaWorkspace.rows.length > 0) return viaWorkspace.rows[0].role as TeamRole;
  }
  return null;
};

/**
 * A caller's effective role on a workspace.
 */
const workspaceRoleForUser = async (
  workspaceId: string,
  userId: string
): Promise<TeamRole | null> => {
  const owner = await pool.query('SELECT owner_id FROM workspaces WHERE id = $1', [workspaceId]);
  if (owner.rows.length === 0) return null;
  if (owner.rows[0].owner_id === userId) return 'admin';
  const member = await pool.query(
    'SELECT role FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
    [workspaceId, userId]
  );
  return member.rows.length > 0 ? (member.rows[0].role as TeamRole) : null;
};

      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'User with this email not found' });
    }

    const user = await pool.query(
      'SELECT id, name, email FROM users WHERE id = $1',
      [existing.rows[0].id]
    );

    const member = await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role) VALUES ($1, $2, $3) RETURNING workspace_id, user_id, role, created_at`,
      [id, user.rows[0].id, role]
    );

    res.status(201).json(member.rows[0]);
  } catch (error) {
    console.error('Error inviting to workspace:', error);
    res.status(500).json({ error: 'Failed to invite member' });
  }
};

