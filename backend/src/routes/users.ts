import express from 'express';
import { authenticate } from '../middleware/auth';
import { lookupUser } from '../controllers/shareController';
import { getPreferences, updatePreferences } from '../controllers/userPreferencesController';

/** Mounted at /api/users */
const router = express.Router();
router.use(authenticate);
router.get('/me/preferences', getPreferences);
router.put('/me/preferences', updatePreferences);

router.get('/lookup', lookupUser);

export default router;