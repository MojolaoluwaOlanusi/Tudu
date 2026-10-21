import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Request, Response } from 'express';
import pool from '../config/database';
import {
  verifySlackSignature,
  exchangeCode,
  listChannels,
  getIntegration,
  getIntegrationByTeam,
  postMessage,
} from '../services/slackService';
import { getEntitlements } from '../services/entitlementService';
import { tierHasFeature } from '../config/features';
import { parseTaskText } from '../services/nlpService';
import { logActivity } from '../services/activityService';
import { broadcastTask } from '../services/realtimeService';
import { triggerWebhooks } from '../services/webhookService';
import { ensureDefaultBoard } from './boardController';
import { SOCKET_EVENTS } from '../types/socket';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const STATE_PREFIX = 'tudu-slack.';
const SLACK_FEATURE = 'integrations.slack';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

/** Slack mrkdwn: the three characters that can break a message. */
const escapeMrkdwn = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Does this user's tier include the Slack integration? */
const isEntitled = async (userId: string): Promise<boolean> => {
  const ent = await getEntitlements(userId);
  return tierHasFeature(ent.tier, SLACK_FEATURE);
};

/* ---------------------------- OAuth ---------------------------- */

/**
 * GET /api/integrations/slack/oauth/start
 *
 * Returns the Slack authorize URL. The state is a signed JWT bound to the
 * caller, so the callback can save the token for the right user without a
 * session (Slack redirects the browser, not an authenticated XHR).
 */
export const oauthStart = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    if (!(await isEntitled(userId))) {
      return res.status(402).json({
        error: 'Slack integration requires a higher tier',
        feature: SLACK_FEATURE,
        upgrade_url: '/pricing',
      });
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = process.env.SLACK_REDIRECT_URI;
    if (!clientId || !redirectUri) {
      return res.status(500).json({ error: 'Slack OAuth is not configured' });
    }

    const stateJwt = jwt.sign(
      { userId, purpose: 'slack', nonce: crypto.randomUUID() },
      JWT_SECRET,
      { expiresIn: '10m' }
    );

    const url =
      'https://slack.com/oauth/v2/authorize' +
      '?client_id=' + encodeURIComponent(clientId) +
      '&scope=' + encodeURIComponent('commands,chat:write,chat:write.public,channels:read,groups:read') +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&state=' + encodeURIComponent(STATE_PREFIX + stateJwt);

    res.json({ url });
  } catch (error) {
    console.error('Error starting Slack OAuth:', error);
    res.status(500).json({ error: 'Failed to start Slack OAuth' });
  }
};

/**
 * GET /api/integrations/slack/oauth/callback - public, Slack redirects here.
 *
 * Verifies the state, exchanges the code, stores the bot token, and sends
 * the browser back to the settings page. If the same workspace was already
 * linked to a different Tudu account, ownership transfers (the old row is
 * deleted in the same transaction) so the slash command stays unambiguous.
 */
export const oauthCallback = async (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const back = (qs: string) => res.redirect(frontendUrl + '/settings/integrations?' + qs);

  try {
    const stateRaw = req.query.state;
    const codeRaw = req.query.code;
    if (typeof stateRaw !== 'string' || !stateRaw.startsWith(STATE_PREFIX)) {
      return back('slack=error&reason=bad_state');
    }
    if (typeof codeRaw !== 'string' || !codeRaw) {
      return back('slack=error&reason=missing_code');
    }

    let payload: { userId: string; purpose: string };
    try {
      payload = jwt.verify(stateRaw.slice(STATE_PREFIX.length), JWT_SECRET) as {
        userId: string;
        purpose: string;
      };
    } catch {
      return back('slack=error&reason=expired_state');
    }
    if (payload.purpose !== 'slack' || !isValidUuid(payload.userId)) {
      return back('slack=error&reason=bad_state');
    }

    if (!(await isEntitled(payload.userId))) {
      return back('slack=error&reason=not_entitled');
    }

    const token = await exchangeCode(codeRaw);
    if (!token.ok || !token.access_token || !token.team) {
      return back('slack=error&reason=' + encodeURIComponent(token.error || 'exchange_failed'));
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM slack_integrations WHERE team_id = $1', [token.team.id]);
      await client.query(
        'INSERT INTO slack_integrations ' +
          '(user_id, team_id, team_name, bot_user_id, access_token) ' +
          'VALUES ($1, $2, $3, $4, $5) ' +
          'ON CONFLICT (user_id) DO UPDATE SET ' +
          '  team_id = EXCLUDED.team_id, ' +
          '  team_name = EXCLUDED.team_name, ' +
          '  bot_user_id = EXCLUDED.bot_user_id, ' +
          '  access_token = EXCLUDED.access_token, ' +
          '  updated_at = NOW()',
        [
          payload.userId,
          token.team.id,
          token.team.name,
          token.bot_user_id ?? null,
          token.access_token,
        ]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    return back('slack=connected');
  } catch (error) {
    console.error('Error handling Slack OAuth callback:', error);
    return back('slack=error&reason=exchange_failed');
  }
};

/* -------------------------- Settings -------------------------- */

/** GET /api/integrations/slack/status */
export const getStatus = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const integration = await getIntegration(userId);
    if (!integration) return res.json({ connected: false });

    res.json({
      connected: true,
      teamName: integration.team_name,
      channelId: integration.channel_id,
      channelName: integration.channel_name,
      defaultBoardId: integration.default_board_id,
      notifyAssignments: integration.notify_assignments,
      notifyDue: integration.notify_due,
    });
  } catch (error) {
    console.error('Error fetching Slack status:', error);
    res.status(500).json({ error: 'Failed to fetch status' });
  }
};

/** GET /api/integrations/slack/channels */
export const getChannels = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const integration = await getIntegration(userId);
    if (!integration) return res.status(400).json({ error: 'Connect Slack first' });

    const channels = await listChannels(integration.access_token);
    res.json(channels);
  } catch (error) {
    console.error('Error listing Slack channels:', error);
    res.status(500).json({ error: 'Failed to list channels' });
  }
};

/**
 * PUT /api/integrations/slack/settings
 *
 * Body: { channelId?, channelName?, defaultBoardId?, notifyAssignments?, notifyDue? }.
 * Each field is validated independently, and the update is a partial merge.
 */
export const saveSettings = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const integration = await getIntegration(userId);
    if (!integration) return res.status(400).json({ error: 'Connect Slack first' });

    const body = (req.body ?? {}) as Record<string, unknown>;
    const updates: string[] = [];
    const values: unknown[] = [];

    if (body.channelId !== undefined) {
      if (body.channelId === null || body.channelId === '') {
        updates.push('channel_id = NULL, channel_name = NULL');
      } else if (typeof body.channelId !== 'string' || body.channelId.length > 64) {
        return res.status(400).json({ error: 'Invalid channel id' });
      } else {
        values.push(body.channelId);
        updates.push('channel_id = $' + values.length);
        const name = typeof body.channelName === 'string' ? body.channelName.slice(0, 255) : null;
        values.push(name);
        updates.push('channel_name = $' + values.length);
      }
    }

    if (body.defaultBoardId !== undefined) {
      if (body.defaultBoardId === null || body.defaultBoardId === '') {
        updates.push('default_board_id = NULL');
      } else if (!isValidUuid(body.defaultBoardId)) {
        return res.status(400).json({ error: 'Invalid board id' });
      } else {
        const owned = await pool.query(
          'SELECT 1 FROM boards WHERE id = $1 AND user_id = $2',
          [body.defaultBoardId, userId]
        );
        if (owned.rows.length === 0) {
          return res.status(404).json({ error: 'Board not found' });
        }
        values.push(body.defaultBoardId);
        updates.push('default_board_id = $' + values.length);
      }
    }

    for (const [field, column] of [
      ['notifyAssignments', 'notify_assignments'],
      ['notifyDue', 'notify_due'],
    ] as const) {
      if (body[field] !== undefined) {
        if (typeof body[field] !== 'boolean') {
          return res.status(400).json({ error: field + ' must be a boolean' });
        }
        values.push(body[field]);
        updates.push(column + ' = $' + values.length);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(userId);
    await pool.query(
      'UPDATE slack_integrations SET ' + updates.join(', ') + ', updated_at = NOW() ' +
        'WHERE user_id = $' + values.length,
      values
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Error saving Slack settings:', error);
    res.status(500).json({ error: 'Failed to save settings' });
  }
};

/** POST /api/integrations/slack/test - post a message to the chosen channel. */
export const sendTest = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const integration = await getIntegration(userId);
    if (!integration || !integration.channel_id) {
      return res.status(400).json({ error: 'Pick a channel first' });
    }

    const ok = await postMessage(
      integration.access_token,
      integration.channel_id,
      ':wave: Tudu is connected. Task assignments and due-date reminders will appear here.'
    );
    if (!ok) return res.status(502).json({ error: 'Slack rejected the message. Is the bot in that channel?' });

    res.json({ ok: true });
  } catch (error) {
    console.error('Error sending Slack test:', error);
    res.status(500).json({ error: 'Failed to send the test message' });
  }
};

/** DELETE /api/integrations/slack - disconnect. */
export const disconnect = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await pool.query('DELETE FROM slack_integrations WHERE user_id = $1', [userId]);
    res.json({ message: 'Disconnected' });
  } catch (error) {
    console.error('Error disconnecting Slack:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
};

/* ------------------------ Slash command ------------------------ */

/**
 * POST /api/integrations/slack/commands - the /tudu slash command.
 *
 * Public by necessity (Slack calls it directly) and therefore protected by
 * the signature instead of a JWT. The body is the raw form-urlencoded
 * Buffer, because Slack signs the bytes and parsing first would break the
 * HMAC.
 *
 * Slack allows 3 seconds before it shows the user a timeout, so the task
 * is created synchronously - the NLP parse is local and the INSERT is one
 * statement. The reply is an ephemeral JSON body, visible only to the
 * person who ran the command.
 */
export const handleCommand = async (req: Request, res: Response) => {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw)) {
    console.error('Slack command body is not a raw Buffer. Check the route mount order.');
    return res.status(500).json({ error: 'Body not captured' });
  }

  const rawBody = raw.toString('utf8');
  const signatureOk = verifySlackSignature(
    rawBody,
    req.headers['x-slack-request-timestamp'] as string | undefined,
    req.headers['x-slack-signature'] as string | undefined
  );
  if (!signatureOk) {
    return res.status(401).send('Invalid signature');
  }

  const params = new URLSearchParams(rawBody);
  const teamId = params.get('team_id') ?? '';
  const text = (params.get('text') ?? '').trim();

  const reply = (message: string) => res.json({ response_type: 'ephemeral', text: message });

  try {
    const integration = await getIntegrationByTeam(teamId);
    if (!integration) {
      return reply(
        ':wave: This Slack workspace is not linked to a Tudu account yet. ' +
          'Sign in to Tudu, open Settings → Integrations, and click Connect Slack.'
      );
    }

    if (!(await isEntitled(integration.user_id))) {
      return reply(':lock: The Slack integration requires a Tudu Pro subscription.');
    }

    if (!text || text === 'help') {
      return reply(
        '*Tudu*\n' +
          '`/tudu create Buy milk tomorrow #personal` — add a task\n' +
          'Dates, `#work`/`#personal`/`#study` and priority words are read from the sentence.'
      );
    }

    const createMatch = /^create\s+(.+)$/i.exec(text);
    if (!createMatch) {
      return reply('Unknown command. Try `/tudu create Buy milk tomorrow` or `/tudu help`.');
    }

    const parsed = parseTaskText(createMatch[1]);

    // Where the card lands: the board chosen in settings, or the user's
    // first personal board. The tasks trigger fills in column_id.
    const boardId = integration.default_board_id
      ? integration.default_board_id
      : (await ensureDefaultBoard(integration.user_id)).id;

    const board = await pool.query('SELECT name FROM boards WHERE id = $1', [boardId]);

    const inserted = await pool.query(
      'INSERT INTO tasks (user_id, title, category, priority, due_date, board_id) ' +
        'VALUES ($1, $2, $3, $4, $5, $6) ' +
        'RETURNING *, ' +
        '  (SELECT COUNT(*)::int FROM subtasks WHERE task_id = tasks.id) AS subtask_count, ' +
        '  (SELECT COUNT(*)::int FROM subtasks WHERE task_id = tasks.id AND completed) AS subtasks_completed',
      [
        integration.user_id,
        parsed.title || createMatch[1].trim(),
        parsed.category,
        parsed.priority,
        parsed.dueDate,
        boardId,
      ]
    );

    const task = inserted.rows[0];
    await logActivity(integration.user_id, 'task_created', task.id, { title: task.title });
    await broadcastTask(SOCKET_EVENTS.taskCreate, integration.user_id, task);
    await triggerWebhooks(integration.user_id, 'task.created', { task });

    const due = task.due_date
      ? ' — due ' + new Date(task.due_date).toLocaleDateString(undefined, {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })
      : '';

    return reply(
      ':white_check_mark: Added *' + escapeMrkdwn(task.title) + '*' + due +
        ' to *' + escapeMrkdwn(board.rows[0]?.name ?? 'your board') + '*.'
    );
  } catch (error) {
    console.error('Error handling Slack command:', error);
    return reply(':warning: Could not create the task. Try again in a moment.');
  }
};
