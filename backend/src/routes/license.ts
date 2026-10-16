import express, { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/requireFeature';
import { isSelfHosted } from '../config/mode';
import {
  getFingerprint,
  issueLicense,
  getLicenseStatus,
  verifyLicenseEndpoint,
  revokeLicense,
  activateLicense,
  deactivateLicense,
} from '../controllers/licenseController';

/**
 * Mounted at /api/license.
 *
 * Two shapes depending on mode.
 *
 * Cloud: this instance ISSUES licenses. /issue and DELETE /:id are
 * gated behind selfHost.license so only Pro customers can sign one.
 *
 * Self-hosted: this instance CONSUMES a license. /activate installs one
 * and DELETE /activate removes it. /issue is registered but guarded, so
 * a self-hosted instance cannot mint licenses for other machines.
 */
const router = express.Router();

/**
 * Enforce that a route is only reachable in the expected mode.
 *
 * The check runs at request time, not at module load time. That matters
 * for two reasons: a test suite that toggles TUDU_MODE between imports
 * still gets the right routes, and a self-hosted process that reloads
 * its env (via a supervisor or a hot-reload dev server) does not keep
 * the routes it registered on first import.
 */
const requireMode =
  (mode: 'cloud' | 'self_hosted') =>
  (req: Request, res: Response, next: NextFunction) => {
    const isSelf = isSelfHosted();
    if (mode === 'self_hosted' && !isSelf) {
      return res.status(400).json({
        error: 'This endpoint is only available on a self-hosted instance',
      });
    }
    if (mode === 'cloud' && isSelf) {
      return res.status(400).json({
        error: 'This endpoint is only available on a cloud instance',
      });
    }
    next();
  };

// Public on both modes: an installer needs the fingerprint before signing
// in, and /verify is a pure function over caller-supplied data.
router.get('/fingerprint', getFingerprint);
router.post('/verify', verifyLicenseEndpoint);

router.use(authenticate);

router.get('/status', getLicenseStatus);

// Self-hosted consumer endpoints. Registered before /:id so 'activate'
// is never read as a license id.
router.post('/activate', requireMode('self_hosted'), activateLicense);
router.delete('/activate', requireMode('self_hosted'), deactivateLicense);

// Cloud issuer endpoints.
router.post(
  '/issue',
  requireMode('cloud'),
  requireFeature('selfHost.license'),
  issueLicense
);
router.delete(
  '/:id',
  requireMode('cloud'),
  requireFeature('selfHost.license'),
  revokeLicense
);

export default router;