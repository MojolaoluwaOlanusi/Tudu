import { Request, Response } from 'express';
import crypto from 'node:crypto';
import { runReminders } from '../services/reminderService';

/**
 * POST /api/reminders/run
 *
 * Called by the Render Cron Job. Protected by a shared secret in the
 * X-Cron-Secret header, compared with a timing-safe equality so the
 * comparison itself cannot leak the secret one byte at a time.
 *
 * Returns a small summary so the cron logs show what happened. Never
 * returns recipient addresses or task titles - a log leak should not
 * become a privacy leak.
 */
export const runRemindersNow = async (req: Request, res: Response) => {
  const expected = process.env.REMINDER_CRON_SECRET;
  if (!expected) {
    return res.status(500).json({ error: 'REMINDER_CRON_SECRET is not set' });
  }

  const provided = req.headers['x-cron-secret'];
  if (typeof provided !== 'string' || provided.length !== expected.length) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Constant-time compare. timingSafeEqual throws on length mismatch, so
  // the length check above must run first.
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const summary = await runReminders();
    res.json(summary);
  } catch (error) {
    console.error('Error running reminders:', error);
    res.status(500).json({ error: 'Reminder run failed' });
  }
};