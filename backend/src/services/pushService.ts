import webpush from 'web-push';
import pool from '../config/database';

let configured = false;
let configError: string | null = null;

const ensureConfigured = (): boolean => {
  if (configured) return true;
  if (configError) return false;

  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    configError = 'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY and VAPID_SUBJECT must all be set';
    return false;
  }

  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
    return true;
  } catch (err) {
    configError = 'VAPID configuration failed: ' + (err as Error).message;
    console.error('[push] ' + configError);
    return false;
  }
};

export const isPushConfigured = (): boolean => ensureConfigured();

export const getPublicKey = (): string | null =>
  process.env.VAPID_PUBLIC_KEY ?? null;

interface StoredSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export interface SendSummary {
  attempted: number;
  delivered: number;
  pruned: number;
  failed: number;
}

export const sendPushToUser = async (
  userId: string,
  payload: PushPayload
): Promise<SendSummary> => {
  const summary: SendSummary = { attempted: 0, delivered: 0, pruned: 0, failed: 0 };

  if (!ensureConfigured()) {
    console.warn('[push] send skipped: ' + (configError ?? 'not configured'));
    return summary;
  }

  const rows = await pool.query(
    'SELECT id, user_id, endpoint, p256dh, auth FROM push_subscriptions ' +
      'WHERE user_id = $1',
    [userId]
  );
  const subs = rows.rows as StoredSubscription[];

  for (const sub of subs) {
    summary.attempted += 1;
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify({ ...payload, url: payload.url ?? '/' }),
        { TTL: 24 * 3600 }
      );
      summary.delivered += 1;
      await pool.query(
        'UPDATE push_subscriptions SET last_used_at = NOW(), failed_count = 0 ' +
          'WHERE id = $1',
        [sub.id]
      );
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) {
        await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [sub.id]);
        summary.pruned += 1;
      } else {
        summary.failed += 1;
        await pool.query(
          'UPDATE push_subscriptions SET failed_count = failed_count + 1 WHERE id = $1',
          [sub.id]
        );
        console.error('Push failed for ' + sub.user_id + ': ' + (err as Error).message);
      }
    }
  }

  return summary;
};

export const sendPushToUsers = async (
  userIds: string[],
  payload: PushPayload
): Promise<SendSummary> => {
  const total: SendSummary = { attempted: 0, delivered: 0, pruned: 0, failed: 0 };
  for (const id of userIds) {
    const s = await sendPushToUser(id, payload);
    total.attempted += s.attempted;
    total.delivered += s.delivered;
    total.pruned += s.pruned;
    total.failed += s.failed;
  }
  return total;
};
