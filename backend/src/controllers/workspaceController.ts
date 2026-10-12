import { Request, Response } from 'express';
import pool from '../config/database';
import { emitToUser, emitToUsers } from '../utils/socket';
import { getWorkspaceRole } from '../services/boardAccess';
import { DEFAULT_COLUMNS } from './boardController';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

const ROLES = ['admin', 'member', 'viewer'];
const isRole = (value: unknown): value is 'admin' | 'member' | 'viewer' =>
  typeof value === 'string' && ROLES.includes(value);

const isValidEmail = (value: unknown): value is string =>
  typeof value === 'string' && value.length <= 255 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Accepted admins of a workspace - a workspace must never be left without one. */
const adminCount = async (workspaceId: string): Promise<number> => {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS n FROM workspace_members
     WHERE workspace_id = $1 AND role = 'admin' AND status = 'accepted'`,
    [workspaceId]
  );
  return result.rows[0].n;
};

/** Everyone currently in (or invited to) a workspace, to nudge their clients. */
const memberIds = async (workspaceId: string): Promise<string[]> => {
  const result = await pool.query(
    'SELECT user_id FROM workspace_members WHERE workspace_id = $1',
    [workspaceId]
  );
  return result.rows.map((r: { user_id: string }) => r.user_id);
};

/** GET /api/workspaces - workspaces I have joined. */
export const getWorkspaces = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT w.id, w.name, w.owner_id, w.created_at, wm.role,
              (SELECT COUNT(*)::int FROM workspace_members m
                WHERE m.workspace_id = w.id AND m.status = 'accepted') AS member_count
       FROM workspaces w
       JOIN workspace_members wm ON wm.workspace_id = w.id
       WHERE wm.user_id = $1 AND wm.status = 'accepted'
       ORDER BY w.created_at ASC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
};

/** GET /api/workspaces/invites - invitations waiting for my answer. */
export const getMyInvites = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `SELECT w.id AS workspace_id, w.name AS workspace_name, wm.role, wm.created_at,
              u.id AS inviter_id, u.name AS inviter_name, u.email AS inviter_email,
              u.avatar_url AS inviter_avatar
       FROM workspace_members wm
       JOIN workspaces w ON w.id = wm.workspace_id
       LEFT JOIN users u ON u.id = wm.invited_by
       WHERE wm.user_id = $1 AND wm.status = 'pending'
       ORDER BY wm.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching workspace invites:', error);
    res.status(500).json({ error: 'Failed to fetch invitations' });
  }
};

/** POST /api/workspaces - body: { name }. The creator becomes its first admin. */
export const createWorkspace = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const rawName = (req.body ?? {}).name;
    const name = typeof rawName === 'string' ? rawName.trim().slice(0, 255) : '';
    if (!name) return res.status(400).json({ error: 'Workspace name is required' });

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const workspace = await client.query(
        `INSERT INTO workspaces (name, owner_id) VALUES ($1, $2)
         RETURNING id, name, owner_id, created_at`,
        [name, userId]
      );
      const workspaceId = workspace.rows[0].id;

      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role, status)
         VALUES ($1, $2, 'admin', 'accepted')`,
        [workspaceId, userId]
      );

      // A workspace starts with one board, so it is usable straight away.
      const board = await client.query(
        `INSERT INTO boards (user_id, name, position, workspace_id)
         VALUES ($1, 'General', 0, $2) RETURNING id`,
        [userId, workspaceId]
      );
      for (let i = 0; i < DEFAULT_COLUMNS.length; i += 1) {
        const d = DEFAULT_COLUMNS[i];
        await client.query(
          `INSERT INTO board_columns (board_id, name, position, color, stage)
           VALUES ($1, $2, $3, $4, $5)`,
          [board.rows[0].id, d.name, i, d.color, d.stage]
        );
      }

      await client.query('COMMIT');
      res.status(201).json({
        ...workspace.rows[0],
        role: 'admin',
        member_count: 1,
        board_id: board.rows[0].id,
      });
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

/** GET /api/workspaces/:id/members - members see each other; admins also see pending invites. */
export const getMembers = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid workspace id' });

    const role = await getWorkspaceRole(userId, id);
    if (!role) return res.status(404).json({ error: 'Workspace not found' });

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.avatar_url, wm.role, wm.status, wm.created_at
       FROM workspace_members wm
       JOIN users u ON u.id = wm.user_id
       WHERE wm.workspace_id = $1 ${role === 'admin' ? '' : "AND wm.status = 'accepted'"}
       ORDER BY (wm.status = 'accepted') DESC, wm.created_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching workspace members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
};

/** POST /api/workspaces/:id/members - admin invites an existing user by email. */
export const inviteMember = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { email, role } = (req.body ?? {}) as { email?: unknown; role?: unknown };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid workspace id' });
    if (!isValidEmail(email)) return res.status(400).json({ error: 'A valid email is required' });
    if (role !== undefined && !isRole(role)) {
      return res.status(400).json({ error: 'Role must be admin, member or viewer' });
    }
    if ((await getWorkspaceRole(userId, id)) !== 'admin') {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const target = await pool.query(
      'SELECT id, name, email, avatar_url FROM users WHERE LOWER(email) = $1',
      [email.trim().toLowerCase()]
    );
    if (target.rows.length === 0) {
      return res.status(404).json({ error: 'No user found with that email' });
    }
    const invitee = target.rows[0];
    if (invitee.id === userId) {
      return res.status(400).json({ error: 'You are already in this workspace' });
    }

    const existing = await pool.query(
      'SELECT status FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [id, invitee.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({
        error:
          existing.rows[0].status === 'accepted'
            ? 'That person is already in this workspace'
            : 'That person has already been invited',
      });
    }

    await pool.query(
      `INSERT INTO workspace_members (workspace_id, user_id, role, status, invited_by)
       VALUES ($1, $2, $3, 'pending', $4)`,
      [id, invitee.id, role ?? 'member', userId]
    );

    emitToUser(invitee.id, 'workspace-invited', { workspaceId: id });
    res.status(201).json({ ...invitee, role: role ?? 'member', status: 'pending' });
  } catch (error) {
    console.error('Error inviting member:', error);
    res.status(500).json({ error: 'Failed to send the invitation' });
  }
};

/** POST /api/workspaces/:id/respond - the invitee accepts or declines. */
export const respondToInvite = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const { status } = (req.body ?? {}) as { status?: unknown };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid workspace id' });
    if (status !== 'accepted' && status !== 'declined') {
      return res.status(400).json({ error: 'Status must be accepted or declined' });
    }

    const invite = await pool.query(
      `SELECT 1 FROM workspace_members
       WHERE workspace_id = $1 AND user_id = $2 AND status = 'pending'`,
      [id, userId]
    );
    if (invite.rows.length === 0) return res.status(404).json({ error: 'Invitation not found' });

    if (status === 'accepted') {
      await pool.query(
        `UPDATE workspace_members SET status = 'accepted'
         WHERE workspace_id = $1 AND user_id = $2`,
        [id, userId]
      );
    } else {
      await pool.query('DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [
        id,
        userId,
      ]);
    }

    emitToUsers(await memberIds(id), 'workspace-updated', { workspaceId: id });
    res.json({ workspace_id: id, status });
  } catch (error) {
    console.error('Error responding to invitation:', error);
    res.status(500).json({ error: 'Failed to answer the invitation' });
  }
};

/** PUT /api/workspaces/:id/members/:userId - admin changes someone's role. */
export const updateMemberRole = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id, userId: targetId } = req.params;
    const { role } = (req.body ?? {}) as { role?: unknown };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id) || !isValidUuid(targetId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    if (!isRole(role)) return res.status(400).json({ error: 'Role must be admin, member or viewer' });
    if ((await getWorkspaceRole(userId, id)) !== 'admin') {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const current = await getWorkspaceRole(targetId, id);
    if (!current) return res.status(404).json({ error: 'Member not found' });
    if (current === 'admin' && role !== 'admin' && (await adminCount(id)) <= 1) {
      return res.status(409).json({ error: 'A workspace needs at least one admin' });
    }

    await pool.query(
      'UPDATE workspace_members SET role = $1 WHERE workspace_id = $2 AND user_id = $3',
      [role, id, targetId]
    );
    emitToUsers(await memberIds(id), 'workspace-updated', { workspaceId: id });
    res.json({ user_id: targetId, role });
  } catch (error) {
    console.error('Error updating member role:', error);
    res.status(500).json({ error: 'Failed to update the role' });
  }
};

/** DELETE /api/workspaces/:id/members/:userId - an admin removes someone, or anyone leaves. */
export const removeMember = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id, userId: targetId } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id) || !isValidUuid(targetId)) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const mine = await getWorkspaceRole(userId, id);
    if (!mine || (targetId !== userId && mine !== 'admin')) {
      return res.status(404).json({ error: 'Member not found' });
    }

    const row = await pool.query(
      'SELECT role, status FROM workspace_members WHERE workspace_id = $1 AND user_id = $2',
      [id, targetId]
    );
    if (row.rows.length === 0) return res.status(404).json({ error: 'Member not found' });

    if (
      row.rows[0].status === 'accepted' &&
      row.rows[0].role === 'admin' &&
      (await adminCount(id)) <= 1
    ) {
      return res.status(409).json({ error: 'A workspace needs at least one admin' });
    }

    const audience = await memberIds(id);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Their assignments on this workspace's boards end with their membership.
      await client.query(
        `UPDATE tasks SET assignee_id = NULL
         WHERE assignee_id = $1
           AND board_id IN (SELECT id FROM boards WHERE workspace_id = $2)`,
        [targetId, id]
      );
      await client.query('DELETE FROM workspace_members WHERE workspace_id = $1 AND user_id = $2', [
        id,
        targetId,
      ]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    emitToUsers(audience, 'workspace-updated', { workspaceId: id });
    res.json({ message: 'Member removed' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Failed to remove the member' });
  }
};
