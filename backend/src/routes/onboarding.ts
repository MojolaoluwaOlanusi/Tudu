import express from 'express';
import { authenticate } from '../middleware/auth';
import { listTemplates, seedBoard } from '../controllers/onboardingController';

/** Mounted at /api/onboarding — every route requires a signed-in user. */
const router = express.Router();
router.use(authenticate);

router.get('/templates', listTemplates);
router.post('/seed', seedBoard);

export default router;
