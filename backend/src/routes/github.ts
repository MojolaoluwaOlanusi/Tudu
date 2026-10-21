import express from 'express';
import { authenticate } from '../middleware/auth';
import { connectGitHub, getRepos, saveMapping, handleWebhook } from '../controllers/githubController';

const router = express.Router();

// Webhook is public (GitHub calls it), but we expect a valid signature in production.
router.post('/webhook', handleWebhook);

router.use(authenticate);
router.post('/connect', connectGitHub);
router.get('/repos', getRepos);
router.post('/mapping', saveMapping);

export default router;
