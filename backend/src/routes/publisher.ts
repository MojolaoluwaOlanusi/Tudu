import express from 'express';
import { authenticate } from '../middleware/auth';
import { requireFeature } from '../middleware/requireFeature';
import {
  getProfile,
  saveProfile,
  listBanksEndpoint,
} from '../controllers/publisherController';

/** Mounted at /api/publisher. */
const router = express.Router();
router.use(authenticate);

router.get('/profile', getProfile);
router.get('/banks', listBanksEndpoint);
router.post('/profile', requireFeature('templates.publish'), saveProfile);

export default router;
