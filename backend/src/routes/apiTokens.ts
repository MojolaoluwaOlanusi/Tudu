import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  listTokens,
  createToken,
  revokeToken,
} from '../controllers/apiTokenController';

/** Mounted at /api/tokens - self-service token management (JWT auth). */
const router = express.Router();
router.use(authenticate);

router.get('/', listTokens);
router.post('/', createToken);
router.delete('/:id', revokeToken);

export default router;
