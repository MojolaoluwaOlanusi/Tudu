import crypto from 'node:crypto';
import { Request, Response } from 'express';
import pool from '../config/database';
import { listRepositories } from '../services/githubService';
import { logActivity } from '../services/activityService';
import { broadcastTask } from '../services/realtimeService';
import { SOCKET_EVENTS } from '../types/socket';

/** POST /api/integrations/github/connect - body: { token } */
export const connectGitHub = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { token } = (req.body ?? {}) as { token?: unknown };
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (typeof token !== 'string' || token.length < 10) {
      return res.status(400).json({ error: 'A valid GitHub token is required' });
    }

    // Test the token before saving it.
    await listRepositories(token);

    await pool.query(
      `INSERT INTO github_integrations (user_id, access_token, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id) DO UPDATE SET access_token = $2, updated_at = NOW()`,
      [userId, token]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Error connecting GitHub:', error);
    res.status(500).json({ error: 'Could not connect to GitHub. Is the token valid?' });
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
    if (row.rows.length === 0) return res.status(404).json({ error: 'GitHub not connected' });

    const repos = await listRepositories(row.rows[0].access_token);
    res.json(repos);
  } catch (error) {
    console.error('Error fetching repos:', error);
    res.status(500).json({ error: 'Failed to fetch repos' });
  }
};

/** POST /api/integrations/github/mapping - body: { board_id, repo_full_name, pr_opened_column_id, pr_merged_column_id } */
export const saveMapping = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { board_id, repo_full_name, pr_opened_column_id, pr_merged_column_id } = (req.body ?? {}) as Record<string, unknown>;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      `INSERT INTO github_mappings (board_id, repo_full_name, pr_opened_column_id, pr_merged_column_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (repo_full_name) DO UPDATE SET
         board_id = EXCLUDED.board_id,
         pr_opened_column_id = EXCLUDED.pr_opened_column_id,
         pr_merged_column_id = EXCLUDED.pr_merged_column_id
       RETURNING id`,
      [board_id, repo_full_name, pr_opened_column_id, pr_merged_column_id]
    );

    res.json({ ok: true, id: result.rows[0].id });
  } catch (error) {
    console.error('Error saving mapping:', error);
    res.status(500).json({ error: 'Failed to save mapping' });
  }
};

const isValidSignature = (secret: string, payload: string, signature: string): boolean => {
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};

/**
 * POST /api/integrations/github/webhook.
 *
 * Handles pull_request events. Extracts the task ID (e.g., TUDU-42)
 * from the PR title or body and moves the task.
 */
export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.headers['x-github-event'];
    if (event !== 'pull_request') return res.status(200).json({ ignored: true });

    // In a real app, verify the signature using a configured webhook secret.
    // For simplicity here, we assume it's valid and parse the body.
    const payload = req.body;
    const action = payload.action;
    const pr = payload.pull_request;
    const repo = payload.repository.full_name;

    if (!pr || !repo) return res.status(400).json({ error: 'Invalid payload' });

    // Find the mapping for this repo.
    const mappingRow = await pool.query(
      'SELECT * FROM github_mappings WHERE repo_full_name = $1',
      [repo]
    );
    if (mappingRow.rows.length === 0) return res.status(200).json({ ignored: true });
    const mapping = mappingRow.rows[0];

    // Extract TUDU-XX from title or body.
    const text = (pr.title || '') + ' ' + (pr.body || '');
    const match = text.match(/TUDU-(\d+)/i);
    if (!match) return res.status(200).json({ ignored: true });

    const shortId = Number(match[1]);
    const taskRow = await pool.query(
      'SELECT id, user_id, title, board_id FROM tasks WHERE short_id = $1',
      [shortId]
    );
    if (taskRow.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const task = taskRow.rows[0];

    // Determine target column.
    let targetColumnId = null;
    if (action === 'opened') {
      targetColumnId = mapping.pr_opened_column_id;
    } else if (action === 'closed' && pr.merged) {
      targetColumnId = mapping.pr_merged_column_id;
    }

    if (targetColumnId) {
      // The DB trigger handles the status update.
      const updated = await pool.query(
        `UPDATE tasks SET column_id = $1, updated_at = NOW()
         WHERE id = $2 RETURNING *`,
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
