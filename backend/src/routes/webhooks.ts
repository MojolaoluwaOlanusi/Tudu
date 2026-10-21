import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/requireFeature';
import {
  listEndpoints,
  createEndpoint,
  updateEndpoint,
  deleteEndpoint,
  listDeliveries,
  retryDeliveryEndpoint,
} from '../controllers/webhookController';

/** Mounted at /api/webhooks. The whole surface is Pro. */
const router = express.Router();
router.use(authenticate);
router.use(requireFeature('api.public.write'));

router.get('/', listEndpoints);
router.post('/', createEndpoint);
router.put('/:id', updateEndpoint);
router.delete('/:id', deleteEndpoint);
router.get('/:id/deliveries', listDeliveries);
router.post('/deliveries/:id/retry', retryDeliveryEndpoint);

export default router;
