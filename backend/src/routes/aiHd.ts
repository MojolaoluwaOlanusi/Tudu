import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/requireFeature';
import { breakdownHd } from '../controllers/aiHdController';

/**
 * Mounted at /api/ai/hd.
 *
 * The AI rate limiter mirrors the free router so a Pro user cannot
 * hammer the endpoint just because they are entitled to use it.
 * requireFeature runs after the limiter, so a free user who trips
 * the limit first sees the rate-limit response, not the upgrade
 * prompt - rate limiting is a security concern and wins.
 */
const router = express.Router();
router.use(authenticate);

const hdLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many AI requests. Try again shortly.' },
});
router.use(hdLimiter);

router.post('/breakdown', requireFeature('ai.breakdown.hd'), breakdownHd);

export default router;
