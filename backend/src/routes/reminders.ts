import express from 'express';
import { runRemindersNow } from '../controllers/reminderController';

/**
 * Mounted at /api/reminders.
 *
 * No JWT middleware here on purpose: the caller is Render's cron runner,
 * not a signed-in user. The controller checks X-Cron-Secret instead.
 */
const router = express.Router();

router.post('/run', runRemindersNow);

export default router;
