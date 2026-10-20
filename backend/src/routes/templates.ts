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
  checkoutMarketplaceTemplate,
  listMyPurchases,
  refundPurchase,
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

// Paid templates: free users can buy, only successful purchases unlock install.
router.post('/marketplace/:id/checkout', checkoutMarketplaceTemplate);
router.post('/marketplace/:id/install', installMarketplaceTemplate);

// Buyer-side purchase history and refunds.
router.get('/purchases/mine', listMyPurchases);
router.post('/purchases/:reference/refund', refundPurchase);

// Option B fix: an author can always delete their own template, even
// if they downgraded after publishing. The ownership check in the
// handler is the only gate needed.
router.delete('/:id', unpublishTemplate);

// Registered last so /marketplace, /mine, /purchases are never read as a slug.
router.post('/:slug/install', installTemplate);

export default router;
