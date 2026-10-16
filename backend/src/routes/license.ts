import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/requireFeature';
import {
  getFingerprint,
  issueLicense,
  getLicenseStatus,
  verifyLicenseEndpoint,
  revokeLicense,
} from '../controllers/licenseController';

/**
 * Mounted at /api/license.
 *
 * /fingerprint is public because a self-hosting installer needs it before
 * the customer has signed in to their hosted account. Every other route
 * requires a session; /issue and /:id revoke additionally require Pro.
 */
const router = express.Router();

router.get('/fingerprint', getFingerprint);
router.post('/verify', verifyLicenseEndpoint);

router.use(authenticate);

router.get('/status', getLicenseStatus);
router.post('/issue', requireFeature('selfHost.license'), issueLicense);
router.delete('/:id', requireFeature('selfHost.license'), revokeLicense);

export default router;
