import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  startOAuth,
  getStatus,
  getRepos,
  listMappings,
  saveMapping,
  deleteMapping,
  disconnectGitHub,
} from '../controllers/githubController';

const router = express.Router();

// The webhook is mounted directly in app.ts with express.raw() so the
// HMAC signature can be verified against the raw body bytes. Do not add
// it here - the router-level JSON parser would consume the raw bytes
// before the signature check could run.

router.use(authenticate);

router.get('/oauth/start', startOAuth);
router.get('/status', getStatus);
router.get('/repos', getRepos);
router.get('/mappings', listMappings);
router.post('/mapping', saveMapping);
router.delete('/mapping/:id', deleteMapping);
router.post('/disconnect', disconnectGitHub);

export default router;
