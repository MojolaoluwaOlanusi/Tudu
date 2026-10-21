import { Request, Response } from 'express';
import pool from '../config/database';
import { generateSecret, retryDelivery, WEBHOOK_EVENTS } from '../services/webhookService';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_RE.test(value);

const MAX_ENDPOINTS_PER_USER = 10;

const isHttpsUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
};

/** GET /api/webhooks - the caller's endpoints. */
export const listEndpoints = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const result = await pool.query(
      'SELECT id, url, description, events, is_active, created_at, updated_at ' +
        'FROM webhook_endpoints WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing webhook endpoints:', error);
    res.status(500).json({ error: 'Failed to list endpoints' });
  }
};

/**
 * POST /api/webhooks - body: { url, description?, events? }.
 *
 * Returns the endpoint AND its secret. The secret is shown once and never
 * again, matching the API-token UX from 4.10 - if you lose it, delete the
 * endpoint and create a new one.
 */
export const createEndpoint = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { url, description, events } = (req.body ?? {}) as Record<string, unknown>;

    if (!isHttpsUrl(url)) {
      return res.status(400).json({ error: 'URL must be a valid https:// address' });
    }

    const count = await pool.query(
      'SELECT COUNT(*)::int AS n FROM webhook_endpoints WHERE user_id = $1',
      [userId]
    );
    if (count.rows[0].n >= MAX_ENDPOINTS_PER_USER) {
      return res
        .status(400)
        .json({ error: 'You can have at most ' + MAX_ENDPOINTS_PER_USER + ' endpoints' });
    }

    let selectedEvents: string[] = [...WEBHOOK_EVENTS];
    if (events !== undefined) {
      if (!Array.isArray(events) || events.length === 0) {
        return res.status(400).json({ error: 'events must be a non-empty array' });
      }
      const invalid = events.find(
        (e) => typeof e !== 'string' || !(WEBHOOK_EVENTS as readonly string[]).includes(e)
      );
      if (invalid) {
        return res.status(400).json({
          error: 'Unknown event: ' + String(invalid) + '. Allowed: ' + WEBHOOK_EVENTS.join(', '),
        });
      }
      selectedEvents = events as string[];
    }

    const desc =
      typeof description === 'string' ? description.trim().slice(0, 255) : null;
    const secret = generateSecret();

    const result = await pool.query(
      'INSERT INTO webhook_endpoints (user_id, url, description, secret, events) ' +
        'VALUES ($1, $2, $3, $4, $5) ' +
        'RETURNING id, url, description, events, is_active, created_at',
      [userId, url, desc, secret, selectedEvents]
    );

    res.status(201).json({ ...result.rows[0], secret });
  } catch (error) {
    console.error('Error creating webhook endpoint:', error);
    res.status(500).json({ error: 'Failed to create the endpoint' });
  }
};

/** PUT /api/webhooks/:id - body: { is_active? } - pause or resume. */
export const updateEndpoint = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid id' });

    const rawActive = (req.body ?? {}).is_active;
    if (typeof rawActive !== 'boolean') {
      return res.status(400).json({ error: 'is_active must be a boolean' });
    }

    const result = await pool.query(
      'UPDATE webhook_endpoints SET is_active = $1, updated_at = NOW() ' +
        'WHERE id = $2 AND user_id = $3 ' +
        'RETURNING id, url, description, events, is_active, created_at, updated_at',
      [rawActive, id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating webhook endpoint:', error);
    res.status(500).json({ error: 'Failed to update the endpoint' });
  }
};

/** DELETE /api/webhooks/:id - delete the endpoint and its deliveries. */
export const deleteEndpoint = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid id' });

    const result = await pool.query(
      'DELETE FROM webhook_endpoints WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }
    res.json({ message: 'Endpoint removed' });
  } catch (error) {
    console.error('Error deleting webhook endpoint:', error);
    res.status(500).json({ error: 'Failed to delete the endpoint' });
  }
};

/** GET /api/webhooks/:id/deliveries - the last 50 attempts, newest first. */
export const listDeliveries = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid id' });

    const owned = await pool.query(
      'SELECT 1 FROM webhook_endpoints WHERE id = $1 AND user_id = $2',
      [id, userId]
    );
    if (owned.rows.length === 0) {
      return res.status(404).json({ error: 'Endpoint not found' });
    }

    const result = await pool.query(
      'SELECT id, event_type, status, attempt_count, next_attempt_at, ' +
        '       last_attempt_at, last_response_status, last_response_body, created_at ' +
        'FROM webhook_deliveries WHERE endpoint_id = $1 ' +
        'ORDER BY created_at DESC LIMIT 50',
      [id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing deliveries:', error);
    res.status(500).json({ error: 'Failed to list deliveries' });
  }
};

/** POST /api/webhooks/deliveries/:id/retry - requeue a dead delivery. */
export const retryDeliveryEndpoint = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    if (!isValidUuid(id)) return res.status(400).json({ error: 'Invalid id' });

    const ok = await retryDelivery(userId, id);
    if (!ok) return res.status(404).json({ error: 'Delivery not found' });
    res.json({ message: 'Delivery requeued' });
  } catch (error) {
    console.error('Error retrying delivery:', error);
    res.status(500).json({ error: 'Failed to retry the delivery' });
  }
};
