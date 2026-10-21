import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  oauthStart,
  oauthCallback,
  getStatus,
  getChannels,
  saveSettings,
  sendTest,
  disconnect,
} from '../controllers/slackController';

/**
 * Mounted at /api/integrations/slack.
 *
 * /oauth/callback is public: Slack redirects the browser there and the
 * signed state parameter is the credential.
 */
const router = express.Router();

router.get('/oauth/callback', oauthCallback);

router.use(authenticate);

router.get('/oauth/start', oauthStart);
router.get('/status', getStatus);
router.get('/channels', getChannels);
router.put('/settings', saveSettings);
router.post('/test', sendTest);
router.delete('/', disconnect);

export default router;

/**
 * Mounted at /api/integrations/slack/commands with express.raw() BEFORE
 * express.json(), so the form-urlencoded body reaches the handler as the
 * exact bytes Slack signed.
 */
export const slackCommandsRouter = express.Router();
slackCommandsRouter.post('/', require('../controllers/slackController').handleCommand);
