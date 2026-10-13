import express from 'express';
import rateLimit from 'express-rate-limit';
import { getStats, createDemo } from '../controllers/publicController';

/** Mounted at /api/public — no auth required. */
const router = express.Router();

// Creating a demo account writes rows, so cap it hard per IP. Every attempt
// counts (unlike the general API limiter, which only counts failures).
const demoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many demo accounts from this address. Try again later.' },
});

router.get('/stats', getStats);
router.post('/demo', demoLimiter, createDemo);

export default router;
