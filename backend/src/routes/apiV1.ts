import express from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateApiToken } from '../middleware/apiToken';
import {
  meV1,
  listBoardsV1,
  getBoardV1,
  listTasksV1,
  getTaskV1,
} from '../controllers/apiV1Controller';

/**
 * Mounted at /api/v1.
 *
 * Every route is read-only by design. Writes over the API are a Pro
 * feature (5.9) and live behind a different flag.
 */
const router = express.Router();

router.use(authenticateApiToken);

/**
 * 100 requests per minute per user, shared across all their tokens.
 *
 * Keyed on the user id (not the IP) so a NAT or a phone on a flaky
 * connection does not accidentally throttle someone else. Every request
 * counts, including the ones that get 404s - the point is to cap the
 * rate of work the server does on a token's behalf.
 */
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? 'anonymous',
  message: { error: 'Rate limit exceeded. Try again shortly.' },
});

router.use(limiter);

router.get('/me', meV1);
router.get('/boards', listBoardsV1);
router.get('/boards/:id', getBoardV1);
router.get('/tasks', listTasksV1);
router.get('/tasks/:id', getTaskV1);

export default router;
