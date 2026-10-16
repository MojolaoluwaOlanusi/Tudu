import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  getPublicKeyEndpoint,
  subscribe,
  unsubscribe,
} from '../controllers/pushController';

/** Mounted at /api/push. */
const router = express.Router();

router.get('/public-key', getPublicKeyEndpoint);

router.use(authenticate);

router.post('/subscribe', subscribe);
router.delete('/subscribe', unsubscribe);

export default router;
