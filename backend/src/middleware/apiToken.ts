import { Request, Response, NextFunction } from 'express';
import pool from '../config/database';
import { hashToken, looksLikeToken } from '../services/apiTokenService';

/**
 * The shape attached to `req.user` by this middleware. Deliberately narrower
 * than the JWT auth middleware's user - an API token only ever identifies a
 * user, it does not carry a role or a workspace.
 */
declare global {
  namespace Express {
    interface User {
      userId: string;
      email: string;
    }
  }
}

/**
 * Bearer-token authentication for /api/v1.
 *
 * Reads `Authorization: Bearer <token>`, hashes the token, and looks it up
 * in `api_tokens`. On success attaches the user to the request and updates
 * `last_used_at` in the background (no await - a slow write must not slow
 * the API response). On failure returns 401 with a WWW-Authenticate header
 * that names the scheme, per RFC 7235.
 */
export const authenticateApiToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const header = req.headers.authorization ?? '';
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const token = match ? match[1].trim() : '';

  if (!looksLikeToken(token)) {
    res
      .status(401)
      .set('WWW-Authenticate', 'Bearer realm="tudu", error="invalid_token"')
      .json({ error: 'Missing or invalid API token' });
    return;
  }

  try {
    const result = await pool.query(
      'SELECT id, user_id FROM api_tokens WHERE token_hash = $1',
      [hashToken(token)]
    );
    if (result.rows.length === 0) {
      res
        .status(401)
        .set('WWW-Authenticate', 'Bearer realm="tudu", error="invalid_token"')
        .json({ error: 'Unknown API token' });
      return;
    }

    const userId: string = result.rows[0].user_id;
    const user = await pool.query('SELECT email FROM users WHERE id = $1', [userId]);
    if (user.rows.length === 0) {
      res.status(401).json({ error: 'User no longer exists' });
      return;
    }

    req.user = { userId, email: user.rows[0].email };

    // Fire-and-forget: updating last_used_at must never gate the response.
    pool
      .query('UPDATE api_tokens SET last_used_at = NOW() WHERE id = $1', [
        result.rows[0].id,
      ])
      .catch((err) => console.error('Error touching api_token:', err));

    next();
  } catch (error) {
    console.error('Error authenticating API token:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};
