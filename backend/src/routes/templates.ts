import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/requireFeature';
import {
  listTemplates,
  installTemplate,
  listMarketplace,
  listMyTemplates,
  publishTemplate,
  installMarketplaceTemplate,
  unpublishTemplate,
} from '../controllers/templateController';

/** Mounted at /api/templates. */
const router = express.Router();

// Public: the marketplace can be browsed before signing in.
router.get('/marketplace', listMarketplace);

router.use(authenticate);

router.get('/', listTemplates);
router.get('/mine', listMyTemplates);

// Pro only: publishing is gated, downloading is not.
router.post('/publish', requireFeature('templates.publish'), publishTemplate);
router.post('/marketplace/:id/install', installMarketplaceTemplate);
router.delete('/:id', requireFeature('templates.publish'), unpublishTemplate);

// Registered last so /marketplace and /mine are never read as a slug.
router.post('/:slug/install', installTemplate);

export default router;
