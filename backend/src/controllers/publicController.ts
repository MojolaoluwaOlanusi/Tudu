import { Request, Response } from 'express';
import crypto from 'node:crypto';
import pool from '../config/database';
import { generateToken } from '../utils/jwt';
import { getActiveUserCount } from '../utils/socket';

/**
 * Public endpoints — no authentication required.
 * Used by the marketing landing page and the "Try the demo" flow.
 */

/**
 * GET /api/public/stats — a few numbers the landing page can show.
 *
 * `active_users` is the count of distinct users with at least one open
 * Socket.io connection right now. It reads from the same in-memory map the
 * socket server maintains, so it is accurate to the second without a query.
 */
export const getStats = (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    uptime_seconds: Math.floor(process.uptime()),
    version: process.env.npm_package_version ?? '1.0.0',
    active_users: getActiveUserCount(),
  });
};

const DEFAULT_COLUMNS = [
  { name: 'To-do', stage: 'todo', color: 'gray' },
  { name: 'Doing', stage: 'doing', color: 'blue' },
  { name: 'Done', stage: 'done', color: 'green' },
];

const SAMPLE_TASKS: { title: string; priority: string; status: string }[] = [
  { title: 'Try the AI breakdown on this task', priority: 'high', status: 'todo' },
  { title: 'Drag a card between columns', priority: 'medium', status: 'todo' },
  { title: 'Start a Pomodoro timer', priority: 'low', status: 'doing' },
  { title: 'Create your own board', priority: 'medium', status: 'done' },
];

/**
 * POST /api/public/demo — creates a throwaway account with a seeded board and
 * returns a JWT the client uses like any other session.
 *
 * The email is prefixed demo- so a maintenance job can prune old accounts
 * later. Nothing else about the user is special: everything they create is
 * scoped to them and disappears when the account is removed.
 */
export const createDemo = async (_req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const id = crypto.randomUUID();
    const email = 'demo-' + id + '@tudu.local';

    const user = await client.query(
      "INSERT INTO users (email, name, provider) VALUES ($1, 'Demo visitor', 'demo') RETURNING id, email, name",
      [email]
    );
    const userId: string = user.rows[0].id;

    const board = await client.query(
      "INSERT INTO boards (user_id, name, position) VALUES ($1, 'Welcome to Tudu', 0) RETURNING id",
      [userId]
    );
    const boardId: string = board.rows[0].id;

    const columnIds: Record<string, string> = {};
    for (let i = 0; i < DEFAULT_COLUMNS.length; i += 1) {
      const d = DEFAULT_COLUMNS[i];
      const col = await client.query(
        'INSERT INTO board_columns (board_id, name, position, color, stage) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [boardId, d.name, i, d.color, d.stage]
      );
      columnIds[d.stage] = col.rows[0].id;
    }

    for (const t of SAMPLE_TASKS) {
      await client.query(
        'INSERT INTO tasks (user_id, title, priority, status, board_id, column_id) VALUES ($1, $2, $3, $4, $5, $6)',
        [userId, t.title, t.priority, t.status, boardId, columnIds[t.status]]
      );
    }

    await client.query('COMMIT');

    const token = generateToken({ userId, email });
    res.status(201).json({
      token,
      user: { id: userId, email, name: user.rows[0].name },
      board_id: boardId,
      expires_in: '7d',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error creating demo account:', err);
    res.status(500).json({ error: 'Could not create the demo account' });
  } finally {
    client.release();
  }
};