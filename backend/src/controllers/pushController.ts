import { Request, Response } from 'express';
import pool from '../config/database';
import { getPublicKey, isPushConfigured } from '../services/pushService';

export const getPublicKeyEndpoint = (_req: Request, res: Response) => {
  res.json({
    configured: isPushConfigured(),
    publicKey: getPublicKey(),
  });
};

interface SubscribeBody {
  endpoint?: unknown;
  keys?: { p256dh?: unknown; auth?: unknown };
}

export const subscribe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const body = (req.body ?? {}) as SubscribeBody;
    const endpoint = body.endpoint;
    const p256dh = body.keys?.p256dh;
    const auth = body.keys?.auth;

    if (
      typeof endpoint !== 'string' ||
      typeof p256dh !== 'string' ||
      typeof auth !== 'string' ||
      !endpoint.startsWith('https://')
    ) {
      return res.status(400).json({ error: 'Invalid subscription' });
    }

    const userAgent =
      typeof req.headers['user-agent'] === 'string'
        ? String(req.headers['user-agent']).slice(0, 255)
        : null;

    await pool.query(
      'INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent) ' +
        'VALUES ($1, $2, $3, $4, $5) ' +
        'ON CONFLICT (endpoint) DO UPDATE SET ' +
        '  user_id = EXCLUDED.user_id, ' +
        '  p256dh = EXCLUDED.p256dh, ' +
        '  auth = EXCLUDED.auth, ' +
        '  last_used_at = NOW(), ' +
        '  failed_count = 0',
      [userId, endpoint, p256dh, auth, userAgent]
    );

    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Error storing push subscription:', error);
    res.status(500).json({ error: 'Failed to save the subscription' });
  }
};

export const unsubscribe = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const endpoint = (req.body ?? {}).endpoint;
    if (typeof endpoint !== 'string' || !endpoint) {
      return res.status(400).json({ error: 'endpoint is required' });
    }

    await pool.query(
      'DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2',
      [endpoint, userId]
    );

    res.json({ ok: true });
  } catch (error) {
    console.error('Error removing push subscription:', error);
    res.status(500).json({ error: 'Failed to remove the subscription' });
  }
};
