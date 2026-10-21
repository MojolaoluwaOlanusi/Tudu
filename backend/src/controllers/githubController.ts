import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import pool from '../config/database';
import {
  listRepositories,
  exchangeCodeForToken,
  getAuthenticatedUser,
} from '../services/githubService';
import { logActivity } from '../services/activityService';
import { broadcastTask } from '../services/realtimeService';
import { getBoardRole, roleAtLeast } from '../services/boardAccess';
import { SOCKET_EVENTS } from '../types/socket';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const INTEGRATION_STATE_PREFIX = 'tudu-int.';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

/**
 * GET /api/integrations/github/oauth/start
 *
 * Returns the GitHub authorize URL. The frontend navigates to it. The
 * state parameter is a signed JWT bound to the caller, so the callback
 * can save the token for the right user without relying on a session.
 */
export const startOAuth = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const clientId = process.env.GITHUB_CLIENT_ID;
    const callbackUrl = process.env.GITHUB_CALLBACK_URL;
    if (!clientId || !callbackUrl) {
      return res.status(500).json({ error: 'GitHub OAuth is not configured' });
    }

    const stateJwt = jwt.sign(
      { userId, purpose: 'integration', nonce: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: '10m' }
    );
    const state = INTEGRATION_STATE_PREFIX + stateJwt;

    const url =
      'https://github.com/login/oauth/authorize' +
      '?client_id=' + encodeURIComponent(clientId) +
      '&redirect_uri=' + encodeURIComponent(callbackUrl) +
      '&scope=repo' +
      '&state=' + encodeURIComponent(state);

    res.json({ url });
  } catch (error) {
    console.error('Error starting GitHub OAuth:', error);
    res.status(500).json({ error: 'Failed to start GitHub OAuth' });
  }
};

/**
 * The integration branch of GET /auth/github/callback.
 *
 * Called by routes/auth.ts when the state parameter starts with
 * INTEGRATION_STATE_PREFIX. Exchanges the code for a token, stores it,
 * and redirects to the frontend settings page.
 */
export const handleIntegrationCallback = async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const errorRedirect = (reason: string) =>
    res.redirect(frontendUrl + '/settings/integrations?error=' + encodeURIComponent(reason));

  try {
    const stateRaw = req.query.state;
    const codeRaw = req.query.code;
    if (typeof stateRaw !== 'string' || !stateRaw.startsWith(INTEGRATION_STATE_PREFIX)) {
      return errorRedirect('bad_state');
    }
    if (typeof codeRaw !== 'string' || !codeRaw) {
      return errorRedirect('missing_code');
    }

    let payload: { userId: string; purpose: string };
    try {
      payload = jwt.verify(
        stateRaw.slice(INTEGRATION_STATE_PREFIX.length),
        JWT_SECRET
      ) as { userId: string; purpose: string };
    } catch {
      return errorRedirect('expired_state');
    }
    if (payload.purpose !== 'integration' || !isValidUuid(payload.userId)) {
      return errorRedirect('bad_state');
    }

    const tokenData = await exchangeCodeForToken(codeRaw);
    const ghUser = await getAuthenticatedUser(tokenData.access_token);

    await pool.query(
      'INSERT INTO github_integrations (user_id, access_token, github_login, updated_at) ' +
        'VALUES ($1, $2, $3, NOW()) ' +
        'ON CONFLICT (user_id) DO UPDATE SET ' +
        '  access_token = EXCLUDED.access_token, ' +
        '  github_login = EXCLUDED.github_login, ' +
        '  updated_at = NOW()',
      [payload.userId, tokenData.access_token, ghUser.login]
    );

    return res.redirect(frontendUrl + '/settings/integrations?connected=1');
  } catch (error) {
    console.error('Error handling GitHub OAuth callback:', error);
    return errorRedirect('exchange_failed');
  }
};

/** GET /api/integrations/github/status */
export const getStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const row = await pool.query(
      'SELECT github_login, created_at FROM github_integrations WHERE user_id = $1',
      [userId]
    );
    if (row.rows.length === 0) {
      return res.json({ connected: false });
    }
    res.json({
      connected: true,
      login: row.rows[0].github_login,
      since: row.rows[0].created_at,
    });
  } catch (error) {
    console.error('Error fetching GitHub status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
};

/** GET /api/integrations/github/repos */
export const getRepos = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const row = await pool.query(
      'SELECT access_token FROM github_integrations WHERE user_id = $1',
      [userId]
    );
    if (row.rows.length === 0) {
      return res.status(400).json({ error: 'Connect GitHub first' });
    }

    const repos = await listRepositories(row.rows[0].access_token);
    res.json(repos);
  } catch (error) {
    console.error('Error fetching repos:', error);
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
};

/** GET /api/integrations/github/mappings */
export const listMappings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT m.id, m.board_id, m.repo_full_name, ' +
        '       m.pr_opened_column_id, m.pr_merged_column_id, ' +
        '       m.created_at, b.name AS board_name ' +
        'FROM github_mappings m ' +
        'JOIN boards b ON b.id = m.board_id ' +
        'WHERE m.user_id = $1 ' +
        'ORDER BY m.created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing mappings:', error);
    res.status(500).json({ error: 'Failed to list mappings' });
  }
};

/** POST /api/integrations/github/mapping */
export const saveMapping = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { board_id, repo_full_name, pr_opened_column_id, pr_merged_column_id } =
      (req.body ?? {}) as Record<string, unknown>;

    if (!isValidUuid(board_id)) {
      return res.status(400).json({ error: 'Invalid board id' });
    }
    if (!isValidUuid(pr_opened_column_id)) {
      return res.status(400).json({ error: 'Invalid PR opened column id' });
    }
    if (!isValidUuid(pr_merged_column_id)) {
      return res.status(400).json({ error: 'Invalid PR merged column id' });
    }
    if (
      typeof repo_full_name !== 'string' ||
      repo_full_name.length === 0 ||
      repo_full_name.length > 255
    ) {
      return res.status(400).json({ error: 'Invalid repo' });
    }

    const role = await getBoardRole(userId, board_id);
    if (!roleAtLeast(role, 'admin')) {
      return res.status(404).json({ error: 'Board not found or insufficient role' });
    }

    const integration = await pool.query(
      'SELECT 1 FROM github_integrations WHERE user_id = $1',
      [userId]
    );
    if (integration.rows.length === 0) {
      return res.status(400).json({ error: 'Connect GitHub first' });
    }

    const result = await pool.query(
      'INSERT INTO github_mappings ' +
        '(user_id, board_id, repo_full_name, pr_opened_column_id, pr_merged_column_id) ' +
        'VALUES ($1, $2, $3, $4, $5) ' +
        'ON CONFLICT (user_id, repo_full_name) DO UPDATE SET ' +
        '  board_id = EXCLUDED.board_id, ' +
        '  pr_opened_column_id = EXCLUDED.pr_opened_column_id, ' +
        '  pr_merged_column_id = EXCLUDED.pr_merged_column_id ' +
        'RETURNING *',
      [userId, board_id, repo_full_name, pr_opened_column_id, pr_merged_column_id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error saving mapping:', error);
    const msg = (error as Error).message;
    if (msg.includes('no unique or exclusion constraint')) {
      return res.status(500).json({
        error: 'Database migration required. Run "npm run migrate" in backend/.',
      });
    }
    res.status(500).json({ error: 'Failed to save mapping' });
  }
};

/** DELETE /api/integrations/github/mapping/:id */
export const deleteMapping = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid id' });

    const result = await pool.query(
      'DELETE FROM github_mappings WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Mapping not found' });
    }
    res.json({ message: 'Mapping removed' });
  } catch (error) {
    console.error('Error deleting mapping:', error);
    res.status(500).json({ error: 'Failed to delete mapping' });
  }
};

/** POST /api/integrations/github/disconnect */
export const disconnectGitHub = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM github_integrations WHERE user_id = $1', [userId]);
    res.json({ message: 'Disconnected' });
  } catch (error) {
    console.error('Error disconnecting GitHub:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
};

/**
 * POST /api/integrations/github/webhook
 *
 * No HMAC verification yet - a documented gap. Once a per-user webhook
 * secret exists, mirror the Paystack handler's isValidSignature pattern
 * here (HMAC-SHA256 over the raw body, timingSafeEqual).
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.headers['x-github-event'];
    if (event !== 'pull_request') return res.status(200).json({ ignored: true });

    const payload = req.body;
    const action = payload.action;
    const pr = payload.pull_request;
    const repo = payload.repository && payload.repository.full_name;
    if (!pr || !repo) return res.status(400).json({ error: 'Invalid payload' });

    const text = (pr.title || '') + ' ' + (pr.body || '');
    const match = text.match(/TUDU-(\d+)/i);
    if (!match) return res.status(200).json({ ignored: true });

    const shortId = Number(match[1]);

    // A single repo can be mapped by many users. Each mapping's board
    // owns its own task with that short_id; only that task moves.
    const mappings = await pool.query(
      'SELECT * FROM github_mappings WHERE repo_full_name = $1',
      [repo]
    );
    if (mappings.rows.length === 0) return res.status(200).json({ ignored: true });

    for (const mapping of mappings.rows) {
      const taskRow = await pool.query(
        'SELECT id, user_id, title FROM tasks WHERE short_id = $1 AND board_id = $2',
        [shortId, mapping.board_id]
      );
      if (taskRow.rows.length === 0) continue;
      const task = taskRow.rows[0];

      let targetColumnId: string | null = null;
      if (action === 'opened') targetColumnId = mapping.pr_opened_column_id;
      else if (action === 'closed' && pr.merged) targetColumnId = mapping.pr_merged_column_id;
      if (!targetColumnId) continue;

      const updated = await pool.query(
        'UPDATE tasks SET column_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [targetColumnId, task.id]
      );
      const updatedTask = updated.rows[0];

      await logActivity(task.user_id, 'task_moved', task.id, {
        title: task.title,
        from: 'GitHub',
        to: action === 'opened' ? 'In Review' : 'Done',
      });
      await broadcastTask(SOCKET_EVENTS.taskUpdate, task.user_id, updatedTask);
    }

    res.json({ ok: true });
  } catch (error) {
    console.error('Error handling GitHub webhook:', error);
    res.status(500).json({ error: 'Webhook failed' });
  }
};
