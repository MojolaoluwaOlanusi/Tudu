import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Defaults returned when the user has never touched the toggle.
 * The shape matches the JSONB default in the migration.
 */
const DEFAULTS = {
  reminders: false,
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
 * PUT /api/users/me/notifications - body: { reminders: boolean }.
 *
 * Only the reminders flag can be changed from the client. last_sent_at
 * is written by the reminder job alone, so a client cannot reset its own
 * throttle and force a second email.
 */
export const updateNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const raw = (req.body ?? {}).reminders;
    if (typeof raw !== 'boolean') {
      return res.status(400).json({ error: 'reminders must be a boolean' });
    }

    const result = await pool.query(
      'UPDATE users SET notifications = COALESCE(notifications, \'{}\'::jsonb) || ' +
        'jsonb_build_object(\'reminders\', $1::boolean) ' +
        'WHERE id = $2 RETURNING notifications',
      [raw, userId]
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
