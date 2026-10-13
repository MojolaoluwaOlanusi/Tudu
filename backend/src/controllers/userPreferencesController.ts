import { Request, Response } from 'express';
import pool from '../config/database';

/**
 * Per-user preferences — currently just the default sort order.
 *
 * Stored as a JSONB column so adding a new preference never needs a
 * migration. The write endpoint merges rather than replaces, so a client
 * that only sends { default_sort } does not blank a future preference.
 */
const ALLOWED_KEYS = ['default_sort', 'default_order'] as const;
type AllowedKey = (typeof ALLOWED_KEYS)[number];

const isAllowed = (key: string): key is AllowedKey =>
  (ALLOWED_KEYS as readonly string[]).includes(key);

const SORT_KEYS = ['created_at', 'updated_at', 'due_date', 'title', 'priority', 'assignee', 'category'] as const;
const ORDER_KEYS = ['asc', 'desc'] as const;

/** Reject anything the client should not be able to store. */
const sanitise = (raw: unknown): Record<string, unknown> => {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!isAllowed(key)) continue;
    if (key === 'default_sort') {
      if (typeof value === 'string' && (SORT_KEYS as readonly string[]).includes(value)) {
        out[key] = value;
      }
    } else if (key === 'default_order') {
      if (typeof value === 'string' && (ORDER_KEYS as readonly string[]).includes(value)) {
        out[key] = value;
      }
    }
  }
  return out;
};

/** GET /api/users/me/preferences */
export const getPreferences = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const result = await pool.query('SELECT preferences FROM users WHERE id = $1', [userId]);
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0].preferences ?? {});
};

/** PUT /api/users/me/preferences — body: { default_sort?, default_order? } */
export const updatePreferences = async (req: Request, res: Response) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const patch = sanitise(req.body);
  if (Object.keys(patch).length === 0) {
    return res.status(400).json({ error: 'No valid preference keys supplied' });
  }

  // jsonb || jsonb merges shallowly, which is exactly what we want: keys
  // not mentioned in the patch keep their previous values.
  const result = await pool.query(
    `UPDATE users
        SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb,
            updated_at = NOW()
      WHERE id = $2
      RETURNING preferences`,
    [JSON.stringify(patch), userId]
  );
  if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0].preferences);
};
