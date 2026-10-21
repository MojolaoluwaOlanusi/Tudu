import crypto from 'node:crypto';
import pool from '../config/database';

/**
 * Event types a subscriber can opt into. Kept in one place so the UI can
 * render a picker without guessing, and so a typo in a caller is a
 * compile error.
 */
export const WEBHOOK_EVENTS = [
  'task.created',
  'task.updated',
  'task.moved',
  'task.deleted',
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

/** Give up after this many attempts. Six sequential failures is a dead endpoint. */
const MAX_ATTEMPTS = 6;
/** Network timeout per HTTP call. A slow endpoint must not hold the worker. */
const SEND_TIMEOUT_MS = 10_000;

/**
 * Seconds until the next attempt, indexed by the attempt that just failed.
 * Bounded exponential backoff with jitter - the exact pattern the Standard
 * Webhooks spec recommends. Attempt 1 fails -> ~1 min, attempt 5 fails -> ~12 h.
 */
const backoffSeconds = (attempt: number): number => {
  const base = [60, 300, 1800, 7200, 21600, 43200][attempt - 1] ?? 86400;
  // +/- 10% jitter so a thousand endpoints do not retry in lock-step.
  const jitter = base * 0.1 * (Math.random() * 2 - 1);
  return Math.max(30, Math.floor(base + jitter));
};

/**
 * Standard Webhooks signature.
 *
 * Signed content: "{webhook-id}.{webhook-timestamp}.{raw-body}", HMAC-SHA256,
 * base64. Shipped as "v1,<base64>" in the webhook-signature header. Any
 * customer with a Standard-Webhooks verifier can check it with no Tudu-
 * specific code.
 */
const sign = (
  id: string,
  timestamp: number,
  body: string,
  secret: string
): string => {
  const toSign = id + '.' + timestamp + '.' + body;
  const mac = crypto.createHmac('sha256', secret).update(toSign).digest('base64');
  return 'v1,' + mac;
};

/** A random 32-byte hex secret, generated once per endpoint. */
export const generateSecret = (): string => crypto.randomBytes(32).toString('hex');

/**
 * Queue a webhook for every active endpoint the user owns that subscribes
 * to this event.
 *
 * Called from inside the task mutation controllers, after the mutation
 * has committed. Errors are swallowed: a webhook that fails to enqueue
 * must never fail the task operation that triggered it.
 */
export const triggerWebhooks = async (
  userId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> => {
  try {
    const endpoints = await pool.query(
      'SELECT id FROM webhook_endpoints ' +
        'WHERE user_id = $1 AND is_active = TRUE AND $2 = ANY(events)',
      [userId, event]
    );
    if (endpoints.rows.length === 0) return;

    for (const ep of endpoints.rows) {
      await pool.query(
        'INSERT INTO webhook_deliveries (endpoint_id, event_type, payload) ' +
          'VALUES ($1, $2, $3::jsonb)',
        [ep.id, event, JSON.stringify(payload)]
      );
    }
  } catch (error) {
    console.error('Error triggering webhooks:', error);
  }
};

interface DeliveryRow {
  id: string;
  endpoint_id: string;
  url: string;
  secret: string;
  event_type: string;
  payload: Record<string, unknown>;
  attempt_count: number;
}

/**
 * The worker loop. Claims up to 10 due deliveries with FOR UPDATE SKIP LOCKED,
 * then sends each one sequentially.
 *
 * Sequential rather than parallel: 10 endpoints at once against a single
 * function-as-a-service host is not the bottleneck, and one slow endpoint
 * would otherwise stall the batch if Promise.all waited on it.
 */
export const processPendingDeliveries = async (): Promise<{
  claimed: number;
  sent: number;
  failed: number;
}> => {
  const client = await pool.connect();
  let claimed: DeliveryRow[] = [];

  try {
    await client.query('BEGIN');
    const locked = await client.query(
      `SELECT d.id, d.endpoint_id, d.event_type, d.payload, d.attempt_count,
              e.url, e.secret
         FROM webhook_deliveries d
         JOIN webhook_endpoints e ON e.id = d.endpoint_id
        WHERE d.status IN ('pending', 'failed')
          AND d.next_attempt_at <= NOW()
          AND e.is_active = TRUE
        ORDER BY d.next_attempt_at ASC
        LIMIT 10
          FOR UPDATE OF d SKIP LOCKED`
    );
    claimed = locked.rows as DeliveryRow[];

    // Move them out of the pool by pushing next_attempt_at forward. This is
    // the lease: if the worker crashes mid-send, the row becomes due again
    // after the backoff window instead of being stuck forever.
    for (const row of claimed) {
      await client.query(
        'UPDATE webhook_deliveries ' +
          'SET status = \'failed\', attempt_count = attempt_count + 1, ' +
          '    next_attempt_at = NOW() + ($1 || \' seconds\')::interval, ' +
          '    last_attempt_at = NOW() ' +
          'WHERE id = $2',
        [String(backoffSeconds(row.attempt_count + 1)), row.id]
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error claiming webhook deliveries:', error);
    return { claimed: 0, sent: 0, failed: 0 };
  } finally {
    client.release();
  }

  let sent = 0;
  let failed = 0;

  for (const row of claimed) {
    const attemptNumber = row.attempt_count + 1;
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({
      id: row.id,
      type: row.event_type,
      created_at: new Date().toISOString(),
      data: row.payload,
    });

    let responseStatus: number | null = null;
    let responseBody = '';

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
      try {
        const res = await fetch(row.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'user-agent': 'Tudu-Webhooks/1.0',
            'webhook-id': row.id,
            'webhook-timestamp': String(timestamp),
            'webhook-signature': sign(row.id, timestamp, body, row.secret),
          },
          body,
          signal: controller.signal,
        });
        responseStatus = res.status;
        responseBody = (await res.text()).slice(0, 2000);
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      // Network failure: responseStatus stays null and we treat it as failed.
      responseBody = error instanceof Error ? error.message : String(error);
    }

    const success = responseStatus !== null && responseStatus >= 200 && responseStatus < 300;

    if (success) {
      sent += 1;
      await pool.query(
        'UPDATE webhook_deliveries ' +
          'SET status = \'success\', last_response_status = $1, last_response_body = $2 ' +
          'WHERE id = $3',
        [responseStatus, responseBody, row.id]
      );
      continue;
    }

    failed += 1;
    const exhausted = attemptNumber >= MAX_ATTEMPTS;

    await pool.query(
      'UPDATE webhook_deliveries ' +
        'SET status = $1, last_response_status = $2, last_response_body = $3 ' +
        'WHERE id = $4',
      [
        exhausted ? 'dead' : 'failed',
        responseStatus,
        responseBody,
        row.id,
      ]
    );
  }

  return { claimed: claimed.length, sent, failed };
};

/** Requeue a dead delivery so the worker picks it up on the next tick. */
export const retryDelivery = async (userId: string, deliveryId: string): Promise<boolean> => {
  const result = await pool.query(
    'UPDATE webhook_deliveries d ' +
      'SET status = \'pending\', attempt_count = 0, next_attempt_at = NOW() ' +
      'FROM webhook_endpoints e ' +
      'WHERE d.id = $1 AND d.endpoint_id = e.id AND e.user_id = $2 ' +
      'RETURNING d.id',
    [deliveryId, userId]
  );
  return result.rows.length > 0;
};
