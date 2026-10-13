import { Request, Response } from 'express';
import pool from '../config/database';
import { generateToken } from '../services/apiTokenService';

/** Never return the hash or the full plaintext after creation. */
const PUBLIC_FIELDS =
  'id, label, token_prefix, last_used_at, created_at';

const normaliseLabel = (value: unknown): string => {
  if (typeof value !== 'string') return 'Untitled token';
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 255) : 'Untitled token';
};

/** GET /api/tokens - the caller's tokens, newest first. */
export const listTokens = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT ' + PUBLIC_FIELDS + ' FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing api tokens:', error);
    res.status(500).json({ error: 'Failed to list tokens' });
  }
};

/**
 * POST /api/tokens - body: { label }.
 *
 * Returns the plaintext token exactly once. The user must save it; it
 * cannot be retrieved again, because only its hash is stored.
 */
export const createToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const label = normaliseLabel((req.body ?? {}).label);
    const { plaintext, hash, prefix } = generateToken();

    const result = await pool.query(
      'INSERT INTO api_tokens (user_id, label, token_hash, token_prefix) ' +
        'VALUES ($1, $2, $3, $4) RETURNING ' + PUBLIC_FIELDS,
      [userId, label, hash, prefix]
    );

    res.status(201).json({
      ...result.rows[0],
      // Shown exactly once. The client must display this prominently and
      // never persist it in the browser's own storage.
      plaintext,
    });
  } catch (error) {
    console.error('Error creating api token:', error);
    res.status(500).json({ error: 'Failed to create the token' });
  }
};

/**
 * DELETE /api/tokens/:id - revoke a token.
 *
 * Revocation is immediate: the next request with that token gets a 401.
 * Same 404 for "not yours" as for "does not exist", so a caller cannot
 * probe for another user's token ids.
 */
export const revokeToken = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'DELETE FROM api_tokens WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }
    res.json({ message: 'Token revoked' });
  } catch (error) {
    console.error('Error revoking api token:', error);
    res.status(500).json({ error: 'Failed to revoke the token' });
  }
};
