import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../middleware/auth';
import * as aiController from '../controllers/aiController';

const router = express.Router();

router.use(authenticate);

// AI calls hit an external provider and are the most expensive thing this API
// does, so they get a much tighter budget than the global /api limiter.
const breakdownLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many breakdowns requested, please wait a moment.' },
});

router.get('/status', aiController.getAiStatus);
router.post('/breakdown', breakdownLimiter, aiController.breakdownTask);

export default router;