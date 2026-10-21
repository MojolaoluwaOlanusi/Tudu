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
  handleWebhook,
} from '../controllers/githubController';

const router = express.Router();

// Webhook is public (GitHub calls it).
router.post('/webhook', handleWebhook);

router.use(authenticate);

router.get('/oauth/start', startOAuth);
router.get('/status', getStatus);
router.get('/repos', getRepos);
router.get('/mappings', listMappings);
router.post('/mapping', saveMapping);
router.delete('/mapping/:id', deleteMapping);
router.post('/disconnect', disconnectGitHub);

export default router;
