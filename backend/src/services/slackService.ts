import crypto from 'node:crypto';
import pool from '../config/database';

const SLACK_API = 'https://slack.com/api';
const MAX_CLOCK_SKEW_SECONDS = 60 * 5;
const REQUEST_TIMEOUT_MS = 5_000;

export interface SlackIntegration {
  user_id: string;
  team_id: string;
  team_name: string;
  bot_user_id: string | null;
  access_token: string;
  channel_id: string | null;
  channel_name: string | null;
  default_board_id: string | null;
  notify_assignments: boolean;
  notify_due: boolean;
}

/**
 * Verify a Slack request signature.
 *
 * Slack signs the literal string "v0:{timestamp}:{raw_body}" with
 * HMAC-SHA256 using the app's Signing Secret, and sends the result as
 * "v0=<hex>" in X-Slack-Signature. The comparison must be constant-time,
 * and the timestamp must be recent - an old request is a replay.
 */
export const verifySlackSignature = (
  rawBody: string,
  timestamp: string | undefined,
  signature: string | undefined
): boolean => {
  const secret = process.env.SLACK_SIGNING_SECRET;
  if (!secret) return false;
  if (typeof timestamp !== 'string' || typeof signature !== 'string') return false;

  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Math.floor(Date.now() / 1000) - ts) > MAX_CLOCK_SKEW_SECONDS) return false;

  const expected =
    'v0=' + crypto.createHmac('sha256', secret).update('v0:' + timestamp + ':' + rawBody).digest('hex');

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/** JSON POST to Slack with a hard timeout. */
const slackPost = async <T>(method: string, body: Record<string, unknown>, token?: string): Promise<T> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(SLACK_API + '/' + method, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        ...(token ? { Authorization: 'Bearer ' + token } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
};

export interface SlackOAuthResponse {
  ok: boolean;
  error?: string;
  access_token?: string;
  token_type?: string;
  scope?: string;
  bot_user_id?: string;
  team?: { id: string; name: string };
}

/**
 * Exchange an OAuth v2 authorization code for a bot token.
 *
 * oauth.v2.access is the bot-install flow (not "Sign in with Slack", which
 * returns an identity token that cannot call chat.postMessage).
 */
export const exchangeCode = async (code: string): Promise<SlackOAuthResponse> => {
  const res = await fetch(SLACK_API + '/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID ?? '',
      client_secret: process.env.SLACK_CLIENT_SECRET ?? '',
      code,
      redirect_uri: process.env.SLACK_REDIRECT_URI ?? '',
    }).toString(),
  });
  return (await res.json()) as SlackOAuthResponse;
};

export interface SlackChannel {
  id: string;
  name: string;
  is_private: boolean;
  is_archived: boolean;
}

/** Channels the bot can post to. */
export const listChannels = async (token: string): Promise<SlackChannel[]> => {
  const data = await slackPost<{
    ok: boolean;
    error?: string;
    channels?: SlackChannel[];
  }>('conversations.list', {
    types: 'public_channel,private_channel',
    exclude_archived: true,
    limit: 200,
  }, token);

  if (!data.ok) throw new Error(data.error || 'conversations.list failed');
  return (data.channels ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    is_private: c.is_private,
    is_archived: c.is_archived,
  }));
};

export const postMessage = async (
  token: string,
  channel: string,
  text: string
): Promise<boolean> => {
  const data = await slackPost<{ ok: boolean; error?: string }>(
    'chat.postMessage',
    { channel, text, unfurl_links: false },
    token
  );
  if (!data.ok) {
    console.error('chat.postMessage failed:', data.error);
    return false;
  }
  return true;
};

/** The caller's integration, or null. */
export const getIntegration = async (userId: string): Promise<SlackIntegration | null> => {
  const res = await pool.query('SELECT * FROM slack_integrations WHERE user_id = $1', [userId]);
  return (res.rows[0] as SlackIntegration) ?? null;
};

/** The integration bound to a Slack workspace, used by the slash command. */
export const getIntegrationByTeam = async (
  teamId: string
): Promise<SlackIntegration | null> => {
  const res = await pool.query('SELECT * FROM slack_integrations WHERE team_id = $1', [teamId]);
  return (res.rows[0] as SlackIntegration) ?? null;
};

/**
 * Tell the assignee that a task landed on them.
 *
 * Goes to the assignee's own Slack workspace, because they are the person
 * who needs to know - not the person doing the assigning. Silently does
 * nothing when the assignee has no integration or has the toggle off.
 */
export const notifyAssignment = async (
  assigneeId: string,
  task: { id: string; title: string; due_date?: string | null }
): Promise<void> => {
  try {
    const integration = await getIntegration(assigneeId);
    if (!integration || !integration.notify_assignments || !integration.channel_id) return;

    const due = task.due_date
      ? ' — due ' + new Date(task.due_date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
      : '';

    await postMessage(
      integration.access_token,
      integration.channel_id,
      ':bust_in_silhouette: *You were assigned a task*\n<https://tudu-kanban.vercel.app/|' +
        task.title +
        '>' +
        due
    );
  } catch (error) {
    console.error('Error sending Slack assignment notification:', error);
  }
};

/**
 * Post the daily due-date digest to every candidate who has Slack on.
 *
 * Called from the reminder job alongside email and push. Failures are
 * swallowed one user at a time so a single bad token cannot stop the run.
 */
export const notifyDueReminders = async (
  candidates: Array<{ id: string; name: string | null; tasks: Array<{ title: string; due_date: string }> }>
): Promise<number> => {
  let sent = 0;

  for (const user of candidates) {
    try {
      const integration = await getIntegration(user.id);
      if (!integration || !integration.notify_due || !integration.channel_id) continue;

      const lines = user.tasks.slice(0, 10).map((t) => {
        const overdue = new Date(t.due_date).getTime() < Date.now();
        const when = new Date(t.due_date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
        return '• ' + t.title + ' — ' + (overdue ? '*overdue*' : when);
      });

      const more = user.tasks.length > 10 ? '\n…and ' + (user.tasks.length - 10) + ' more.' : '';
      const header = user.tasks.length === 1 ? ':calendar: *1 task due soon*' : ':calendar: *' + user.tasks.length + ' tasks due soon*';

      const ok = await postMessage(
        integration.access_token,
        integration.channel_id,
        header + '\n' + lines.join('\n') + more
      );
      if (ok) sent += 1;
    } catch (error) {
      console.error('Error sending Slack due reminder for ' + user.id + ':', error);
    }
  }

  return sent;
};
