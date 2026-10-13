import express from 'express';
import { authenticate } from '../middleware/auth';
import { listTemplates, installTemplate } from '../controllers/templateController';

/** Mounted at /api/templates - every route requires a signed-in user. */
const router = express.Router();
router.use(authenticate);

router.get('/', listTemplates);
router.post('/:slug/install', installTemplate);

export default router;
