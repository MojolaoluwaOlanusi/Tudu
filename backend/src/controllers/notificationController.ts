import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Defaults returned when the user has never touched the preferences.
 * The shape matches the JSONB defaults across migrations 4.11 and 4.12.
 */
const DEFAULTS = {
  reminders: false,
  celebrations: true,
  push: false,
  last_sent_at: null as string | null,
};

/** GET /api/users/me/notifications */
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT notifications FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const stored = result.rows[0].notifications ?? {};
    res.json({ ...DEFAULTS, ...stored });
  } catch (error) {
    console.error('Error reading notifications:', error);
    res.status(500).json({ error: 'Failed to read preferences' });
  }
};

/**
 * PUT /api/users/me/notifications - body: { reminders?, celebrations? }.
 *
 * Only the two client-writable flags are accepted; last_sent_at is
 * written by the reminder job alone. Each flag is validated independently
 * so a request may update one, the other, or both.
 */
export const updateNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const patch: Record<string, boolean> = {};
    const { reminders, celebrations, push } = (req.body ?? {}) as {
      reminders?: unknown;
      celebrations?: unknown;
      push?: unknown;
    };

    if (reminders !== undefined) {
      if (typeof reminders !== 'boolean') {
        return res.status(400).json({ error: 'reminders must be a boolean' });
      }
      patch.reminders = reminders;
    }

    if (celebrations !== undefined) {
      if (typeof celebrations !== 'boolean') {
        return res.status(400).json({ error: 'celebrations must be a boolean' });
      }
      patch.celebrations = celebrations;
    }

    if (push !== undefined) {
      if (typeof push !== 'boolean') {
        return res.status(400).json({ error: 'push must be a boolean' });
      }
      patch.push = push;
    }

    if (Object.keys(patch).length === 0) {
      return res
        .status(400)
        .json({ error: 'Supply at least one of: reminders, celebrations, push' });
    }

    const result = await pool.query(
      'UPDATE users SET notifications = COALESCE(notifications, \'{}\'::jsonb) || $1::jsonb ' +
        'WHERE id = $2 RETURNING notifications',
      [JSON.stringify(patch), userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const stored = result.rows[0].notifications ?? {};
    res.json({ ...DEFAULTS, ...stored });
  } catch (error) {
    console.error('Error updating notifications:', error);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
};
