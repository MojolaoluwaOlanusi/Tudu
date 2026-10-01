import express from 'express';
import { authenticate } from '../middleware/auth';
import { lookupUser } from '../controllers/shareController';

/** Mounted at /api/users */
const router = express.Router();
router.use(authenticate);

router.get('/lookup', lookupUser);

export default router;